import sqlite3
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, get_bill
from backend.db import get_db
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_in_memory_state():
    """Ensure in-memory draft bills are cleared before and after each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def e2e_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_e2e.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_complete_end_to_end_workflow(e2e_db: Path):
    """Verify the entire end-to-end flow sequentially as specified in Step 10 Task A:

    1. Initialize SQLite & seed catalogue.
    2. Retrieve stock via GET /stock.
    3. Create a draft bill via POST /voice.
    4. Fallback matching & clarification for unknown/ambiguous product names.
    5. Edit draft bill (quantity and price).
    6. Confirm bill via POST /confirm.
    7. Verify persistence in sales/sale_items & single stock deduction.
    8. Cancel a draft via POST /cancel & verify stock/sales unchanged.
    9. Retrieve summary via GET /summary.
    10. Save a voice correction via POST /correction.
    """
    # 1. Database is seeded with 25 catalogue items
    with get_db(e2e_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as cnt FROM items;")
        assert cursor.fetchone()["cnt"] == 25

    # 2. GET /stock returns catalogue inventory
    stock_resp = client.get("/stock")
    assert stock_resp.status_code == 200
    stock_items = stock_resp.json()
    assert len(stock_items) == 25
    rice_stock = next(i for i in stock_items if i["name"] == "Rice")
    assert rice_stock["quantity"] == 50.0  # Initial starting stock

    # 3. Create a draft bill through POST /voice
    # Shopkeeper sells 2 kg Rice (default 60/kg) and 1 kg Sugar (default 42/kg)
    parsed_new_sale = {
        "intent": "new_sale",
        "items": [
            {"item_id": 1, "qty": 2, "unit": "kg", "price": None},   # 2 * 60 = 120
            {"item_id": 2, "qty": 1, "unit": "kg", "price": None},   # 1 * 42 = 42
        ],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="2 kg chawal aur 1 kg chini"):
        with patch("backend.main.parse", return_value=parsed_new_sale):
            voice_resp = client.post(
                "/voice",
                files={"audio": ("sale.webm", b"audio_payload", "audio/webm")},
                data={"language": "hi"},
            )

    assert voice_resp.status_code == 200
    sale_data = voice_resp.json()
    assert sale_data["intent"] == "new_sale"
    assert "Save?" in sale_data["message"]
    draft_bill = sale_data["bill"]
    assert draft_bill is not None
    bill_id = draft_bill["bill_id"]
    assert draft_bill["total"] == 162.0  # 120 + 42

    # 4. Fallback matching and clarification for unknown or ambiguous products
    # Spoken word is 'sukkare' (typo for Sugar synonym 'sakkare')
    parsed_fuzzy = {
        "intent": "new_sale",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["sukkare"],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="aur sukkare"):
        with patch("backend.main.parse", return_value=parsed_fuzzy):
            fuzzy_resp = client.post(
                "/voice",
                files={"audio": ("fuzzy.webm", b"audio_payload", "audio/webm")},
                data={"bill_id": bill_id},
            )

    assert fuzzy_resp.status_code == 200
    fuzzy_data = fuzzy_resp.json()
    assert fuzzy_data["message"] == "Did you mean Sugar?"
    # Crucial: Unconfirmed product is NOT added to the draft bill!
    current_draft = get_bill(bill_id)
    assert len(current_draft["lines"]) == 2
    assert current_draft["total"] == 162.0

    # 5. Edit draft bill: Change Rice quantity to 3 kg, and override price to 55/kg
    # (spoken price means unit price: 3 kg * 55 = 165)
    parsed_edit_qty = {
        "intent": "edit_bill",
        "items": [],
        "edit": {"action": "set_qty", "item_id": 1, "value": 3},
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Rice 3 kilo kar do"):
        with patch("backend.main.parse", return_value=parsed_edit_qty):
            edit_qty_resp = client.post(
                "/voice",
                files={"audio": ("edit.webm", b"audio_payload", "audio/webm")},
                data={"bill_id": bill_id},
            )

    assert edit_qty_resp.status_code == 200
    assert edit_qty_resp.json()["bill"]["total"] == 222.0  # (3 * 60) + 42

    parsed_edit_price = {
        "intent": "edit_bill",
        "items": [],
        "edit": {"action": "set_price", "item_id": 1, "value": 55.0},
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Rice 55 rupaye kilo"):
        with patch("backend.main.parse", return_value=parsed_edit_price):
            edit_price_resp = client.post(
                "/voice",
                files={"audio": ("edit.webm", b"audio_payload", "audio/webm")},
                data={"bill_id": bill_id},
            )

    assert edit_price_resp.status_code == 200
    final_draft = edit_price_resp.json()["bill"]
    # Rice: 3 * 55 = 165; Sugar: 1 * 42 = 42; Total = 207
    assert final_draft["total"] == 207.0

    # 6. Confirm bill using POST /confirm
    confirm_resp = client.post("/confirm", json={"bill_id": bill_id})
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["sale_id"] == 1
    assert confirm_data["total"] == 207.0

    # 7. Verify sale and sale items are persisted and stock is deducted exactly once
    with get_db(e2e_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id = 1;")
        sale_row = cursor.fetchone()
        assert sale_row["total"] == 207.0

        cursor.execute("SELECT item_id, quantity, unit_price FROM sale_items WHERE sale_id = 1 ORDER BY item_id;")
        items_rows = [dict(r) for r in cursor.fetchall()]
        assert len(items_rows) == 2
        # Rice: qty 3, unit_price 55
        assert items_rows[0] == {"item_id": 1, "quantity": 3.0, "unit_price": 55.0}
        # Sugar: qty 1, unit_price 42
        assert items_rows[1] == {"item_id": 2, "quantity": 1.0, "unit_price": 42.0}

        # Check stock deduction
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 47.0  # 50 - 3

        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 39.0  # 40 - 1

    # 8. Cancel a draft using POST /cancel and verify stock & sales history unchanged
    second_sale = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 10, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="10 kg rice"):
        with patch("backend.main.parse", return_value=second_sale):
            v2_resp = client.post(
                "/voice",
                files={"audio": ("v2.webm", b"audio_payload", "audio/webm")},
            )

    b2_id = v2_resp.json()["bill"]["bill_id"]
    cancel_resp = client.post("/cancel", json={"bill_id": b2_id})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json() == {"ok": True}

    # Verify stock and sales count unchanged after cancellation
    with get_db(e2e_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 1
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 47.0

    # 9. Retrieve GET /summary and verify totals, count, top items, and low-stock
    summary_resp = client.get("/summary")
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["total"] == 207.0
    assert summary_data["count"] == 1
    assert summary_data["top_items"][0] == "Rice"  # Rice sold 3 units, Sugar 1 unit

    # 10. Save voice correction using POST /correction
    corr_resp = client.post("/correction", json={"heard_text": "chawall", "item_id": 1})
    assert corr_resp.status_code == 200
    assert corr_resp.json() == {"ok": True}

    with get_db(e2e_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT heard_text, item_id FROM corrections;")
        corr_row = cursor.fetchone()
        assert corr_row["heard_text"] == "chawall"
        assert corr_row["item_id"] == 1
