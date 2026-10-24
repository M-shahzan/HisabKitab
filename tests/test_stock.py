"""Unit and integration tests for voice-based and API-based stock adjustments."""

from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, create_draft_bill, get_bill
from backend.db import get_db
from backend.main import app
from backend.seed import seed_database
from backend.stock import adjust_stock, normalize_quantity_for_item

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
    db_file = tmp_path / "test_stock.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_stock_in_voice_increases_inventory(seeded_db: Path):
    """1. Increasing stock through a voice command updates database without creating sales."""
    # Item 1 is Rice (starting stock: 50.0 kg)
    mock_parsed = {
        "intent": "stock_in",
        "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Add 10 kg rice to stock"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_in"
    assert "Rice stock increased by 10 kg. New stock: 60 kg." in data["message"]
    assert data["bill"] is None

    # Verify database updated
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 60.0

        # Verify no sales records created
        cursor.execute("SELECT COUNT(*) as cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 0
        cursor.execute("SELECT COUNT(*) as cnt FROM sale_items;")
        assert cursor.fetchone()["cnt"] == 0


def test_stock_out_voice_decreases_inventory(seeded_db: Path):
    """2. Decreasing stock through a voice command updates database without creating sales."""
    # Item 2 is Sugar (starting stock: 40.0 kg)
    mock_parsed = {
        "intent": "stock_out",
        "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Remove 2 kg sugar from stock"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_out"
    assert "Sugar stock decreased by 2 kg. New stock: 38 kg." in data["message"]
    assert data["bill"] is None

    # Verify database updated
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 38.0

        # Verify no sales records created
        cursor.execute("SELECT COUNT(*) as cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 0


def test_query_stock_voice_does_not_modify_inventory(seeded_db: Path):
    """3. Querying stock reports current quantity without modifying inventory."""
    mock_parsed = {
        "intent": "query_stock",
        "items": [],
        "edit": None,
        "query_item_id": 1,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="How much rice is in stock?"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("query.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "query_stock"
    assert "50 kg of Rice in stock" in data["message"]

    # Verify database stock untouched
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 50.0


def test_stock_adjustment_rejects_unknown_product(seeded_db: Path):
    """4. Rejecting an unknown product without altering any stock."""
    mock_parsed = {
        "intent": "unclear",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["dragon fruit"],
        "needs_clarification": "Dragon fruit catalog mein nahi hai.",
    }

    with patch("backend.main.transcribe", return_value="Add 5 kg dragon fruit to stock"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert "catalog mein nahi mila" in data["message"] or "Dragon fruit" in data["message"]

    # Direct adjust_stock with unknown ID raises KeyError
    with pytest.raises(KeyError, match="not found in catalog"):
        adjust_stock(item_id=9999, qty=5.0, action="stock_in", db_path=seeded_db)


def test_stock_adjustment_rejects_zero_and_negative_quantities(seeded_db: Path):
    """5. Rejecting zero and negative adjustment quantities."""
    with pytest.raises(ValueError, match="greater than zero"):
        adjust_stock(item_id=1, qty=0, action="stock_in", db_path=seeded_db)

    with pytest.raises(ValueError, match="greater than zero"):
        adjust_stock(item_id=1, qty=-5.0, action="stock_in", db_path=seeded_db)

    # API endpoint also rejects <= 0
    resp = client.post(
        "/stock/adjust",
        json={"item_id": 1, "quantity": 0, "action": "stock_in"},
    )
    assert resp.status_code == 400
    assert "greater than zero" in resp.json()["detail"]


def test_stock_out_rejects_reduction_beyond_available_inventory(seeded_db: Path):
    """6. Rejecting stock reductions beyond available inventory with rollback."""
    # Rice starting stock is 50.0 kg. Attempt to remove 60.0 kg.
    with pytest.raises(ValueError, match="Current stock is only 50"):
        adjust_stock(item_id=1, qty=60.0, action="stock_out", db_path=seeded_db)

    # Verify stock remained completely unchanged
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 50.0

    # Test via voice endpoint
    mock_parsed = {
        "intent": "stock_out",
        "items": [{"item_id": 1, "qty": 60.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Remove 60 kg rice from stock"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    assert "Cannot reduce" in resp.json()["message"]

    # Verify stock still 50.0
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 50.0


def test_stock_adjustment_does_not_modify_active_draft_bill(seeded_db: Path):
    """7. Stock adjustments must not create or modify an existing active sales draft."""
    # 1. Create a draft bill with 2 kg Rice
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 2.0}], db_path=seeded_db)
    b_id = bill["bill_id"]
    assert bill["total"] == 120.0

    # 2. While draft is active, perform stock adjustment for Sugar
    mock_parsed = {
        "intent": "stock_in",
        "items": [{"item_id": 2, "qty": 15.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Add 15 kg sugar to stock"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
                data={"bill_id": b_id},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "stock_in"
    assert "Sugar stock increased by 15 kg" in data["message"]

    # Active bill must remain untouched
    active_bill = get_bill(b_id)
    assert active_bill["bill_id"] == b_id
    assert len(active_bill["lines"]) == 1
    assert active_bill["lines"][0]["name"] == "Rice"
    assert active_bill["total"] == 120.0


def test_stock_adjust_rest_api_endpoint(seeded_db: Path):
    """8. Test the POST /stock/adjust endpoint directly."""
    # Stock in: Sugar (40 -> 55)
    res_in = client.post(
        "/stock/adjust",
        json={"item_id": 2, "quantity": 15.0, "action": "stock_in"},
    )
    assert res_in.status_code == 200
    assert res_in.json()["new_quantity"] == 55.0

    # Stock out: Sugar (55 -> 50)
    res_out = client.post(
        "/stock/adjust",
        json={"item_id": 2, "quantity": 5.0, "action": "stock_out"},
    )
    assert res_out.status_code == 200
    assert res_out.json()["new_quantity"] == 50.0

    # Unknown product returns 404
    res_404 = client.post(
        "/stock/adjust",
        json={"item_id": 9999, "quantity": 5.0, "action": "stock_in"},
    )
    assert res_404.status_code == 404

    # Excessive deduction returns 400
    res_400 = client.post(
        "/stock/adjust",
        json={"item_id": 2, "quantity": 100.0, "action": "stock_out"},
    )
    assert res_400.status_code == 400


def test_unit_conversion_in_stock_adjust(seeded_db: Path):
    """9. Unit conversions (e.g. grams to kg) are handled accurately."""
    # Rice is in kg. Adding 500 grams increases stock by 0.5 kg (50 -> 50.5)
    res = adjust_stock(item_id=1, qty=500.0, action="stock_in", unit="g", db_path=seeded_db)
    assert res["delta"] == 0.5
    assert res["new_quantity"] == 50.5

    # Incompatible unit (e.g. litre for Rice) raises ValueError
    with pytest.raises(ValueError, match="Unit mismatch"):
        adjust_stock(item_id=1, qty=5.0, action="stock_in", unit="litre", db_path=seeded_db)


def test_sales_and_cancellation_still_work(seeded_db: Path):
    """10. Verify sales flow (draft, confirm, cancel) continues working seamlessly."""
    # Create draft: 2 kg Rice
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 2.0}], db_path=seeded_db)
    b_id = bill["bill_id"]

    # Confirm sale
    conf_res = client.post("/confirm", json={"bill_id": b_id})
    assert conf_res.status_code == 200
    assert conf_res.json()["total"] == 120.0

    # Stock was decremented (50 -> 48)
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 48.0
        cursor.execute("SELECT COUNT(*) as cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 1

    # Cancel a second draft without affecting stock
    b2 = create_draft_bill(items=[{"item_id": 1, "qty": 5.0}], db_path=seeded_db)
    cancel_res = client.post("/cancel", json={"bill_id": b2["bill_id"]})
    assert cancel_res.status_code == 200

    # Stock still 48.0
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 48.0


def test_kannada_voice_stock_and_sales(seeded_db: Path):
    """11. Verify Kannada language voice commands for stock adjustments and sales."""
    # Test Kannada stock_in ("Stock ge 10 kg akki serisi")
    mock_parsed_stock_in = {
        "intent": "stock_in",
        "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Stock ge 10 kg akki serisi") as mock_stt:
        with patch("backend.main.parse", return_value=mock_parsed_stock_in):
            resp = client.post(
                "/voice",
                files={"audio": ("stock_kn.webm", b"audio_content", "audio/webm")},
                data={"language": "kn"},
            )

    assert resp.status_code == 200
    assert mock_stt.call_args[1]["language"] == "kn"
    data = resp.json()
    assert data["intent"] == "stock_in"
    assert "Rice stock increased by 10 kg. New stock: 60 kg." in data["message"]

    # Test Kannada stock_out ("Stock ninda 2 kg sakkare thegiri")
    mock_parsed_stock_out = {
        "intent": "stock_out",
        "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Stock ninda 2 kg sakkare thegiri") as mock_stt:
        with patch("backend.main.parse", return_value=mock_parsed_stock_out):
            resp2 = client.post(
                "/voice",
                files={"audio": ("stock_out_kn.webm", b"audio_content", "audio/webm")},
                data={"language": "kn"},
            )

    assert resp2.status_code == 200
    assert mock_stt.call_args[1]["language"] == "kn"
    data2 = resp2.json()
    assert data2["intent"] == "stock_out"
    assert "Sugar stock decreased by 2 kg. New stock: 38 kg." in data2["message"]

