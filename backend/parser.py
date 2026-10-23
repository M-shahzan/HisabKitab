import json
import os
from typing import Any
import httpx

VALID_INTENTS = {
    "new_sale",
    "edit_bill",
    "confirm",
    "cancel",
    "query_summary",
    "query_stock",
    "unclear",
}


def validate_parser_response(data: Any) -> dict[str, Any]:
    """Validate that the parsed output adheres strictly to Section 4.2 contract.

    Contract:
    {
      "intent": "new_sale | edit_bill | confirm | cancel | query_summary | query_stock | unclear",
      "items": [ {"item_id": 3, "qty": 2, "unit": "kg", "price": null} ],
      "edit": {"action": "set_qty | remove | set_price", "item_id": 3, "value": 3},
      "query_item_id": null,
      "unknown_words": ["sakkare"],
      "needs_clarification": null
    }
    """
    if not isinstance(data, dict):
        raise ValueError(f"Parser output must be a dictionary, got {type(data).__name__}")

    intent = data.get("intent")
    if intent not in VALID_INTENTS:
        raise ValueError(f"Invalid intent '{intent}'. Must be one of {VALID_INTENTS}")

    if intent == "new_sale":
        items = data.get("items")
        if not isinstance(items, list):
            raise ValueError("Parser output for 'new_sale' must include an 'items' list.")

    elif intent == "edit_bill":
        edit = data.get("edit")
        if not isinstance(edit, dict):
            raise ValueError("Parser output for 'edit_bill' must include an 'edit' dictionary.")
        if edit.get("action") not in ("set_qty", "set_price", "remove"):
            raise ValueError(f"Invalid edit action '{edit.get('action')}'.")
        if "item_id" not in edit:
            raise ValueError("Edit dictionary missing 'item_id'.")

    return data


def parse(
    transcript: str,
    catalog: list[dict[str, Any]] | None = None,
    current_bill: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Parse transcript text into structured intent and items using LLM (Section 4.2 & 6 A3).

    Raises:
    - RuntimeError: if LLM_API_KEY is not configured in the environment.
    """
    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        raise RuntimeError("LLM_API_KEY is not configured in environment.")

    if not transcript or not transcript.strip():
        return {
            "intent": "unclear",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": "No speech transcript provided.",
        }

    catalog_lines = [
        f"id={item.get('id')}, name={item.get('name')}, unit={item.get('unit')}, synonyms={item.get('synonyms', '')}"
        for item in (catalog or [])
    ]
    catalog_summary = "\n".join(catalog_lines)

    system_prompt = (
        "You are the billing parser for a small shop. Input is a transcript of what "
        "the shopkeeper said, in any Indian language or a mix with English.\n"
        f"CATALOG:\n{catalog_summary}\n"
        f"CURRENT DRAFT BILL: {json.dumps(current_bill or {})}\n"
        "Return ONLY valid JSON matching schema:\n"
        "{\n"
        '  "intent": "new_sale | edit_bill | confirm | cancel | query_summary | query_stock | unclear",\n'
        '  "items": [ {"item_id": 3, "qty": 2, "unit": "kg", "price": null} ],\n'
        '  "edit": {"action": "set_qty | remove | set_price", "item_id": 3, "value": 3},\n'
        '  "query_item_id": null,\n'
        '  "unknown_words": [],\n'
        '  "needs_clarification": null\n'
        "}\n"
        "Rules:\n"
        "- Map items to catalog ids.\n"
        "- Spoken price overrides catalog price.\n"
        "- Yes/haan means confirm, no/cancel means cancel.\n"
        "- If edit instruction, use edit_bill.\n"
    )

    url = os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
    }

    response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
    if response.status_code != 200:
        raise RuntimeError(f"LLM provider returned error HTTP {response.status_code}: {response.text}")

    content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return validate_parser_response(parsed)
