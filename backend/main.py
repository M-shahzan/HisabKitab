import logging
import os
import sqlite3
import time
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.billing import (
    bills,
    cancel_bill,
    confirm_bill,
    create_draft_bill,
    edit_draft_bill,
    get_bill,
)
from backend.db import get_db
from backend.corrections import log_correction
from backend.matching import find_best_match, match_unknown_word
from backend.parser import parse, validate_parser_response
from backend.stt import transcribe
from backend.summary import get_sales_summary

logger = logging.getLogger("hisab_kitab")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.isdir(frontend_dir):
    from fastapi.staticfiles import StaticFiles
    app.mount("/frontend", StaticFiles(directory=frontend_dir, html=True), name="frontend")


class BillActionRequest(BaseModel):
    bill_id: str


class CorrectionRequest(BaseModel):
    heard_text: str
    item_id: int


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/stock")
def get_stock():
    """Return the stock listing required by Section 4.3 of the build guide.

    Performs a database join between stock and items to provide:
    item_id, name, quantity, unit.
    Returns an empty list if tables or records do not exist.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.item_id, i.name, s.quantity, i.unit
                FROM stock s
                JOIN items i ON s.item_id = i.id
                ORDER BY s.item_id
                """
            )
            rows = cursor.fetchall()
            return [
                {
                    "item_id": row["item_id"],
                    "name": row["name"],
                    "quantity": row["quantity"],
                    "unit": row["unit"],
                }
                for row in rows
            ]
    except sqlite3.OperationalError:
        return []


@app.get("/summary")
def summary_endpoint(date: str | None = None) -> dict[str, Any]:
    """Return daily sales summary (Section 4.3).

    Query param: ?date=YYYY-MM-DD
    Response: {total, count, top_items, low_stock}
    """
    try:
        return get_sales_summary(date_str=date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Summary query error: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Failed to retrieve sales summary.")


@app.post("/confirm")
def confirm_endpoint(payload: BillActionRequest) -> dict[str, Any]:
    """Confirm a draft bill, commit sales & sale_items, and deduct stock (Section 4.3).

    Response: {"sale_id": int, "total": float, "low_stock": list[str]}
    """
    try:
        return confirm_bill(payload.bill_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Confirmation error: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Confirmation transaction failed.")


@app.post("/cancel")
def cancel_endpoint(payload: BillActionRequest) -> dict[str, Any]:
    """Cancel a draft bill without persisting sales or altering stock (Section 4.3).

    Response: {"ok": true}
    """
    try:
        return cancel_bill(payload.bill_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Cancellation error: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Cancellation failed.")


@app.post("/correction")
def correction_endpoint(payload: CorrectionRequest) -> dict[str, Any]:
    """Record a voice mishearing correction in the corrections table (Section 4.3 & 7 B6).

    Request: {"heard_text": str, "item_id": int}
    Response: {"ok": true}
    """
    try:
        return log_correction(payload.heard_text, payload.item_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Correction logging error: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Failed to log correction.")


@app.post("/voice")
async def voice_endpoint(
    audio: UploadFile = File(None),
    bill_id: str | None = Form(None),
    language: str = Form("hi"),
) -> dict[str, Any]:
    """Voice pipeline orchestration endpoint (Section 4.3 & 7 B3).

    Receives audio, calls speech-to-text transcribe, calls LLM parse,
    applies supported intents against draft billing and queries, and returns:
    {transcript, intent, bill, message}.
    """
    if audio is None:
        raise HTTPException(status_code=400, detail="Audio file is required.")

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty.")

    t0 = time.perf_counter()

    # 1. Transcribe audio to text
    try:
        t_stt_start = time.perf_counter()
        transcript = transcribe(audio_bytes, language=language)
        stt_duration = time.perf_counter() - t_stt_start
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("STT transcription failed: %s", type(e).__name__)
        raise HTTPException(status_code=502, detail="Transcription service failed.")

    # 2. Query catalogue and current bill for LLM context
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, synonyms, unit, price FROM items;")
        catalog = [dict(r) for r in cursor.fetchall()]

    current_bill = None
    if bill_id:
        try:
            current_bill = get_bill(bill_id)
        except KeyError:
            current_bill = None

    # 3. Parse transcript into structured intent and items
    try:
        t_parse_start = time.perf_counter()
        parser_res = parse(transcript, catalog=catalog, current_bill=current_bill)
        parser_res = validate_parser_response(parser_res)
        parse_duration = time.perf_counter() - t_parse_start
    except Exception as e:
        logger.error("LLM parser failed: %s", type(e).__name__)
        raise HTTPException(status_code=502, detail="Parser service failed.")

    # 4. Apply intent
    intent = parser_res.get("intent", "unclear")
    bill = current_bill

    unknown_words = parser_res.get("unknown_words") or []

    # Fallback matching when unknown words are present and no clarification was already generated by the parser
    if unknown_words and not parser_res.get("needs_clarification") and (intent == "unclear" or (intent == "new_sale" and not parser_res.get("items"))):
        match_result = find_best_match(unknown_words[0], catalog, threshold=80.0)
        message = match_result["message"]
        intent = "unclear"
        bill = current_bill

    elif intent == "new_sale":
        items = parser_res.get("items", [])
        if items:
            try:
                bill = create_draft_bill(items=items)
                lines_summary = ", ".join(f"{l['name']} {l['qty']} {l['unit']}" for l in bill["lines"])
                message = f"{lines_summary}. Total {bill['total']} rupees. Save?"
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        else:
            message = "No items recognized for new sale. Please repeat."

    elif intent == "edit_bill":
        edit_payload = parser_res.get("edit")
        if not bill_id or not current_bill:
            message = "No active bill found to edit."
        elif not edit_payload:
            message = "No edit instruction provided."
        else:
            try:
                bill = edit_draft_bill(bill_id, edit_payload)
                message = f"Bill updated. Total {bill['total']} rupees. Save?"
            except (ValueError, KeyError) as e:
                raise HTTPException(status_code=400, detail=str(e))

    elif intent == "confirm":
        if not bill_id:
            message = "No active bill found to confirm."
            bill = None
        else:
            try:
                confirm_res = confirm_bill(bill_id)
                bill = get_bill(bill_id)
                message = "Sale confirmed."
            except (KeyError, ValueError) as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error("Voice confirmation failed: %s", type(e).__name__)
                raise HTTPException(status_code=500, detail="Failed to confirm sale.")

    elif intent == "cancel":
        if not bill_id:
            message = "No active bill found to cancel."
            bill = None
        else:
            try:
                cancel_bill(bill_id)
                bill = None
                message = "Sale cancelled."
            except (KeyError, ValueError) as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error("Voice cancellation failed: %s", type(e).__name__)
                raise HTTPException(status_code=500, detail="Failed to cancel sale.")

    elif intent == "query_summary":
        target_date = parser_res.get("date")
        try:
            summary_data = get_sales_summary(date_str=target_date)
            tot = summary_data["total"]
            cnt = summary_data["count"]
            top_str = ", ".join(summary_data["top_items"]) if summary_data["top_items"] else "None"
            low_str = ", ".join(summary_data["low_stock"]) if summary_data["low_stock"] else "None"
            message = (
                f"Today you sold {tot} rupees across {cnt} bills. "
                f"Top items: {top_str}. Low stock: {low_str}."
            )
        except Exception as e:
            logger.error("Voice summary failed: %s", type(e).__name__)
            message = "Failed to calculate daily summary."

    elif intent == "query_stock":
        target_item_id = parser_res.get("query_item_id")
        if not target_item_id and parser_res.get("items"):
            target_item_id = parser_res["items"][0].get("item_id")

        if not target_item_id and parser_res.get("unknown_words"):
            for w in parser_res["unknown_words"]:
                m = match_unknown_word(w, catalog, threshold=80.0)
                if m:
                    target_item_id = m.get("id")
                    break

        if target_item_id:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT i.name, i.unit, s.quantity
                    FROM items i
                    JOIN stock s ON i.id = s.item_id
                    WHERE i.id = ?;
                    """,
                    (target_item_id,),
                )
                stk = cursor.fetchone()

            if stk:
                raw_qty = float(stk["quantity"])
                qty_disp = int(raw_qty) if raw_qty.is_integer() else round(raw_qty, 2)
                message = f"You have {qty_disp} {stk['unit']} of {stk['name']} in stock."
            else:
                message = f"Item {target_item_id} not found in inventory."
        else:
            message = "Could not identify the item to check stock. Please specify the product name."

    else:  # unclear
        message = parser_res.get("needs_clarification") or "Sorry, I could not understand. Please repeat."

    total_duration = time.perf_counter() - t0
    logger.info(
        "Voice pipeline executed: intent=%s, stt_ms=%.1f, parse_ms=%.1f, total_ms=%.1f",
        intent,
        stt_duration * 1000,
        parse_duration * 1000,
        total_duration * 1000,
    )

    return {
        "transcript": transcript,
        "intent": intent,
        "bill": bill,
        "message": message,
    }
