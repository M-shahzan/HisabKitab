from io import BytesIO
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import (
    bills,
    clear_bills,
    create_draft_bill,
    get_bill,
)
from backend.db import get_db
from backend.main import app
from backend.parser import _detect_stock_intent_from_text
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_in_memory_state():
    """Ensure in-memory draft bills are cleared before and after each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_stock_receipt.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_parser_intent_heuristics():
    """Verify stock adjustment and query phrasing detection across languages."""
    assert _detect_stock_intent_from_text("Add 10 kg rice to stock") == "stock_in"
    assert _detect_stock_intent_from_text("Remove 2 kg sugar from stock") == "stock_out"
    assert _detect_stock_intent_from_text("Stock mein 20 kilo chawal add karo") == "stock_in"
    assert _detect_stock_intent_from_text("Cheeni ka stock 5 kilo kam karo") == "stock_out"
    assert _detect_stock_intent_from_text("Add 15 packets of salt") == "stock_in"
    assert _detect_stock_intent_from_text("How much rice is in stock?") == "query_stock"
    # Normal sales phrasing must return None (routed to normal billing)
    assert _detect_stock_intent_from_text("Give 2 kg rice") is None
    assert _detect_stock_intent_from_text("2 kilo chawal dena") is None
    assert _detect_stock_intent_from_text("1 packet namak aur 1 kilo cheeni") is None


def test_stock_in_voice_command_updates_inventory_without_adding_bill_item(seeded_db: Path):
    """1. A stock-in voice command updates inventory but does not add a bill item or create a draft."""
    initial_rice_qty = 50.0  # Catalog initial stock for Rice is 50.0

    with patch("backend.main.transcribe", return_value="Add 10 kg rice to stock"):
        with patch("backend.main.parse", return_value={
            "intent": "stock_in",
            "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }):
            fake_audio = BytesIO(b"fake audio data")
            resp = client.post(
                "/voice",
                files={"audio": ("test.webm", fake_audio, "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_in"
    assert data["bill"] is None
    # Verify verbal confirmation of adjustment and new stock quantity
    assert "stock increased by 10" in data["message"]
    assert "New stock: 60" in data["message"]

    # Verify no draft bills created in memory
    assert len(bills) == 0

    # Verify database inventory incremented by exactly 10 kg (50 -> 60)
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 60.0

        # Verify no sales recorded
        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 0


def test_stock_out_voice_command_updates_inventory_without_adding_bill_item(seeded_db: Path):
    """2. A stock-out voice command updates inventory but does not add a bill item or create a draft."""
    initial_sugar_qty = 40.0  # Catalog initial stock for Sugar is 40.0

    with patch("backend.main.transcribe", return_value="Remove 2 kg sugar from stock"):
        with patch("backend.main.parse", return_value={
            "intent": "stock_out",
            "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }):
            fake_audio = BytesIO(b"fake audio data")
            resp = client.post(
                "/voice",
                files={"audio": ("test.webm", fake_audio, "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_out"
    assert data["bill"] is None
    # Verify verbal confirmation of adjustment and new stock quantity
    assert "stock decreased by 2" in data["message"]
    assert "New stock: 38" in data["message"]

    # Verify no draft bills created in memory
    assert len(bills) == 0

    # Verify database inventory decremented by exactly 2 kg (40 -> 38)
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 38.0


def test_existing_sales_draft_remains_unchanged_after_stock_adjustment(seeded_db: Path):
    """3. An existing sales draft remains completely unchanged after a stock adjustment."""
    # Create active draft: 2 kg Rice (₹120)
    draft = create_draft_bill(items=[{"item_id": 1, "qty": 2.0}], db_path=seeded_db)
    bill_id = draft["bill_id"]
    original_total = draft["total"]
    original_lines = draft["lines"]

    # Shopkeeper adjusts stock while bill is active: "Add 15 packets of salt"
    with patch("backend.main.transcribe", return_value="Add 15 packets of salt"):
        with patch("backend.main.parse", return_value={
            "intent": "stock_in",
            "items": [{"item_id": 4, "qty": 15.0, "unit": "packet", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }):
            fake_audio = BytesIO(b"fake audio data")
            resp = client.post(
                "/voice",
                files={"audio": ("test.webm", fake_audio, "audio/webm")},
                data={"bill_id": bill_id},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_in"

    # The active draft returned in response must be identical to original draft
    assert data["bill"] is not None
    assert data["bill"]["bill_id"] == bill_id
    assert data["bill"]["total"] == original_total
    assert data["bill"]["lines"] == original_lines

    # Verify active draft in backend store was NOT modified with stock adjustment item
    saved_bill = get_bill(bill_id)
    assert saved_bill["bill_id"] == bill_id
    assert saved_bill["total"] == original_total
    assert len(saved_bill["lines"]) == 1
    assert saved_bill["lines"][0]["name"] == "Rice"

    # Verify stock for Salt (item 4) was updated in database (initial 10 + 15 = 25)
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 4;")
        assert cursor.fetchone()["quantity"] == 25.0


def test_normal_sale_command_adds_products_to_bill(seeded_db: Path):
    """4. A normal sale command still creates and appends products to the active bill."""
    # First item: 2 kg Rice
    with patch("backend.main.transcribe", return_value="Give 2 kg rice"):
        with patch("backend.main.parse", return_value={
            "intent": "new_sale",
            "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }):
            resp1 = client.post(
                "/voice",
                files={"audio": ("test1.webm", BytesIO(b"audio"), "audio/webm")},
            )

    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["intent"] == "new_sale"
    assert data1["bill"] is not None
    bill_id = data1["bill"]["bill_id"]
    assert len(data1["bill"]["lines"]) == 1
    assert data1["bill"]["total"] == 120

    # Second item: 1 kg Sugar added to existing bill_id
    with patch("backend.main.transcribe", return_value="Give 1 kg sugar"):
        with patch("backend.main.parse", return_value={
            "intent": "new_sale",
            "items": [{"item_id": 2, "qty": 1.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }):
            resp2 = client.post(
                "/voice",
                files={"audio": ("test2.webm", BytesIO(b"audio"), "audio/webm")},
                data={"bill_id": bill_id},
            )

    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["intent"] == "new_sale"
    assert data2["bill"]["bill_id"] == bill_id
    assert len(data2["bill"]["lines"]) == 2
    # 2 kg Rice (120) + 1 kg Sugar (42) = 162
    assert data2["bill"]["total"] == 162


def test_confirming_bill_deducts_stock_exactly_once(seeded_db: Path):
    """5. Confirming a bill deducts stock exactly once; duplicate confirm attempts fail."""
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 2.0},  # Rice: 50 -> 48
            {"item_id": 2, "qty": 1.0},  # Sugar: 40 -> 39
        ],
        db_path=seeded_db,
    )
    b_id = bill["bill_id"]

    # Confirm once
    res1 = client.post("/confirm", json={"bill_id": b_id})
    assert res1.status_code == 200

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 48.0
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 39.0

        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 1

    # Attempt to confirm a second time
    res2 = client.post("/confirm", json={"bill_id": b_id})
    assert res2.status_code == 400

    # Stock must remain unchanged after failed second confirm
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 48.0
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 39.0

        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 1


def test_confirmed_bill_displays_all_line_items_and_correct_grand_total(seeded_db: Path):
    """6. The confirmed bill returns all line items with product names, quantities, unit prices, line totals, and grand total."""
    # 2 kg Rice at ₹60/kg (₹120) and 1 kg Sugar at ₹42/kg (₹42) -> Grand Total ₹162
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 2.0},
            {"item_id": 2, "qty": 1.0},
        ],
        db_path=seeded_db,
    )
    b_id = bill["bill_id"]

    res = client.post("/confirm", json={"bill_id": b_id})
    assert res.status_code == 200
    data = res.json()

    assert "sale_id" in data
    assert data["total"] == 162
    assert "lines" in data
    assert len(data["lines"]) == 2

    rice_line = next(l for l in data["lines"] if l["name"] == "Rice")
    assert rice_line["qty"] == 2
    assert rice_line["unit"] == "kg"
    assert rice_line["unit_price"] == 60
    assert rice_line["amount"] == 120

    sugar_line = next(l for l in data["lines"] if l["name"] == "Sugar")
    assert sugar_line["qty"] == 1
    assert sugar_line["unit"] == "kg"
    assert sugar_line["unit_price"] == 42
    assert sugar_line["amount"] == 42


def test_final_receipt_remains_available_after_active_draft_cleared(seeded_db: Path):
    """7. The final receipt remains retrievable even after the active draft is removed from draft bills."""
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 3.0}],
        db_path=seeded_db,
    )
    b_id = bill["bill_id"]

    res = client.post("/confirm", json={"bill_id": b_id})
    assert res.status_code == 200

    # Active draft is removed from bills dictionary
    assert b_id not in bills

    # Final receipt is still retrievable via get_bill()
    receipt = get_bill(b_id)
    assert receipt is not None
    assert receipt["status"] == "confirmed"
    assert receipt["total"] == 180
    assert len(receipt["lines"]) == 1
    assert receipt["lines"][0]["name"] == "Rice"
