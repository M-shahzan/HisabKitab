from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, create_draft_bill
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
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_summary.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def _insert_test_sale(db_path: Path, created_at: str, total: float, items: list[tuple[int, float, float]]):
    """Helper to insert a test sale and its line items directly for date-controlled testing."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sales (created_at, total) VALUES (?, ?);", (created_at, total))
        sale_id = cursor.lastrowid
        for item_id, qty, unit_price in items:
            cursor.execute(
                "INSERT INTO sale_items (sale_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?);",
                (sale_id, item_id, qty, unit_price),
            )


def test_daily_sales_total_and_count(seeded_db: Path):
    """1. Correct daily sales total and count for the requested date."""
    date = "2026-10-23"
    _insert_test_sale(seeded_db, f"{date}T10:00:00", 120.0, [(1, 2.0, 60.0)])
    _insert_test_sale(seeded_db, f"{date}T14:30:00", 140.0, [(3, 1.0, 140.0)])
    _insert_test_sale(seeded_db, f"{date}T18:00:00", 240.0, [(1, 4.0, 60.0)])

    res = client.get(f"/summary?date={date}")
    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 3
    assert data["total"] == 500


def test_top_three_products_ranked_by_quantity_sold(seeded_db: Path):
    """2. Top three products ranked according to total quantity sold (SUM(quantity) DESC)."""
    date = "2026-10-23"
    # Rice (item 1): 10 kg
    # Sugar (item 2): 7 kg
    # Wheat Flour (item 5): 5 kg
    # Salt (item 12): 2 kg
    _insert_test_sale(seeded_db, f"{date}T09:00:00", 600.0, [(1, 10.0, 60.0)])
    _insert_test_sale(seeded_db, f"{date}T11:00:00", 294.0, [(2, 7.0, 42.0)])
    _insert_test_sale(seeded_db, f"{date}T13:00:00", 225.0, [(5, 5.0, 45.0)])
    _insert_test_sale(seeded_db, f"{date}T15:00:00", 50.0, [(12, 2.0, 25.0)])

    res = client.get(f"/summary?date={date}")
    assert res.status_code == 200
    top_items = res.json()["top_items"]

    assert len(top_items) == 3
    assert top_items == ["Rice", "Sugar", "Wheat Flour"]


def test_low_stock_products_included_in_summary(seeded_db: Path):
    """3. Low-stock products (quantity < low_threshold) are included in the summary."""
    # Item 8 (Milk) has initial quantity=25.0, low_threshold=5.0
    # Manually update quantity to 3.0 (< 5.0 threshold)
    with get_db(seeded_db) as conn:
        conn.execute("UPDATE stock SET quantity = 3.0 WHERE item_id = 8;")

    res = client.get("/summary?date=2026-10-23")
    assert res.status_code == 200
    low_stock = res.json()["low_stock"]

    assert "Milk" in low_stock


def test_sales_on_other_dates_excluded(seeded_db: Path):
    """4. Sales on other dates are excluded from the target date summary."""
    _insert_test_sale(seeded_db, "2026-10-22T10:00:00", 999.0, [(1, 5.0, 60.0)])
    _insert_test_sale(seeded_db, "2026-10-23T10:00:00", 120.0, [(1, 2.0, 60.0)])

    res = client.get("/summary?date=2026-10-23")
    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 1
    assert data["total"] == 120


def test_empty_date_behavior(seeded_db: Path):
    """5. Dates with no sales return zero count, zero total, and empty top_items."""
    res = client.get("/summary?date=2025-01-01")
    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 0
    assert data["total"] == 0
    assert data["top_items"] == []
    assert isinstance(data["low_stock"], list)


def test_invalid_date_handling(seeded_db: Path):
    """6. Invalid date formats and impossible calendar dates return HTTP 400."""
    res1 = client.get("/summary?date=not-a-date")
    assert res1.status_code == 400
    assert "Invalid date format" in res1.json()["detail"]

    res2 = client.get("/summary?date=2026-02-31")
    assert res2.status_code == 400
    assert "Invalid calendar date" in res2.json()["detail"]


def test_get_stock_reflects_quantities_after_confirmed_sales(seeded_db: Path):
    """7. GET /stock reflects accurate inventory levels after sales are confirmed."""
    # Item 1 (Rice) starts with quantity=50
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 8}], db_path=seeded_db)
    client.post("/confirm", json={"bill_id": bill["bill_id"]})

    res = client.get("/stock")
    assert res.status_code == 200
    items = {item["item_id"]: item for item in res.json()}

    assert items[1]["name"] == "Rice"
    assert items[1]["quantity"] == 42.0


def test_voice_summary_query(seeded_db: Path):
    """8. Voice query_summary returns spoken daily totals, bill count, and top items."""
    date = "2026-10-23"
    _insert_test_sale(seeded_db, f"{date}T10:00:00", 4320.0, [(1, 10.0, 60.0)])

    mock_parsed = {
        "intent": "query_summary",
        "date": date,
        "items": [],
        "edit": None,
    }

    with patch("backend.main.transcribe", return_value="Aaj ki summary batao"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("summary.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "query_summary"
    assert "4320 rupees" in data["message"]
    assert "1 bills" in data["message"]
    assert "Rice" in data["message"]


def test_voice_stock_query_by_id(seeded_db: Path):
    """9. Voice query_stock returns current quantity and unit for requested product."""
    # Item 1 is Rice (qty=50, unit=kg)
    mock_parsed = {
        "intent": "query_stock",
        "query_item_id": 1,
        "items": [],
        "edit": None,
    }

    with patch("backend.main.transcribe", return_value="Chawal kitna bacha hai"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "query_stock"
    assert "50 kg of Rice in stock" in data["message"]


def test_voice_stock_query_unknown_product(seeded_db: Path):
    """10. Voice query_stock for unrecognized product returns clear clarification message."""
    mock_parsed = {
        "intent": "query_stock",
        "query_item_id": None,
        "items": [],
        "edit": None,
        "unknown_words": ["xyzunknownitem"],
    }

    with patch("backend.main.transcribe", return_value="xyz kitna bacha hai"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("stock.webm", b"audio_content", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "query_stock"
    assert "Could not identify the item" in data["message"]
