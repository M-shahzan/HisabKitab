from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import (
    bills,
    clear_bills,
    confirm_bill,
    create_draft_bill,
    get_bill,
)
from backend.db import get_db
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_in_memory_state():
    """Ensure in-memory draft bills dictionary is cleared before and after each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_confirmation.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_confirm_single_item_bill_saves_sale(seeded_db: Path):
    """1. Confirming a single-item bill saves the sale in the sales table."""
    # Item 1 is Rice (qty=2, price=60 -> total=120)
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 2}], db_path=seeded_db)
    b_id = bill["bill_id"]

    res = client.post("/confirm", json={"bill_id": b_id})
    assert res.status_code == 200
    data = res.json()
    assert "sale_id" in data
    assert data["total"] == 120

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id = ?;", (data["sale_id"],))
        sale = cursor.fetchone()

    assert sale is not None
    assert sale["total"] == 120
    assert sale["created_at"] is not None


def test_confirm_multi_item_bill_saves_all_lines(seeded_db: Path):
    """2. Confirming a multi-item bill saves all sale lines in sale_items."""
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 2},  # Rice 2 * 60 = 120
            {"item_id": 2, "qty": 1},  # Sugar 1 * 42 = 42
            {"item_id": 10, "qty": 3}, # Tea 3 * 90 = 270
        ],
        db_path=seeded_db,
    )
    b_id = bill["bill_id"]

    res = client.post("/confirm", json={"bill_id": b_id})
    assert res.status_code == 200
    sale_id = res.json()["sale_id"]

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY item_id;", (sale_id,))
        lines = cursor.fetchall()

    assert len(lines) == 3
    assert lines[0]["item_id"] == 1
    assert lines[0]["quantity"] == 2
    assert lines[1]["item_id"] == 2
    assert lines[1]["quantity"] == 1
    assert lines[2]["item_id"] == 10
    assert lines[2]["quantity"] == 3


def test_stock_decreases_by_correct_quantities(seeded_db: Path):
    """3. Stock decreases by the correct sold quantities."""
    # Item 1 initial stock: 50.0
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        initial_stock = cursor.fetchone()["quantity"]

    bill = create_draft_bill(items=[{"item_id": 1, "qty": 5}], db_path=seeded_db)
    client.post("/confirm", json={"bill_id": bill["bill_id"]})

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        final_stock = cursor.fetchone()["quantity"]

    assert final_stock == initial_stock - 5.0


def test_returned_total_matches_draft_total(seeded_db: Path):
    """4. The returned total matches the draft total."""
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 1.5}, # 1.5 * 60 = 90
            {"item_id": 2, "qty": 2},   # 2 * 42 = 84
        ],
        db_path=seeded_db,
    )
    draft_total = bill["total"]

    res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    assert res.status_code == 200
    assert res.json()["total"] == draft_total


def test_low_stock_products_returned_correctly(seeded_db: Path):
    """5. Low-stock products are returned correctly in the response."""
    # Item 9 (Curd) has starting_stock=15.0 and low_threshold=4.0
    # Selling 12 units leaves 3.0 (< 4.0 threshold) -> must be in low_stock
    bill = create_draft_bill(items=[{"item_id": 9, "qty": 12}], db_path=seeded_db)

    res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    assert res.status_code == 200
    low_stock = res.json()["low_stock"]

    assert "Curd" in low_stock


def test_negative_stock_allowed_and_flagged(seeded_db: Path):
    """6. Negative stock is allowed to proceed and flagged in low_stock."""
    # Item 6 (Mustard Oil) initial stock = 20.0, low_threshold = 5.0
    # Selling 25 units leaves -5.0 stock (< 5.0 threshold)
    bill = create_draft_bill(items=[{"item_id": 6, "qty": 25}], db_path=seeded_db)

    res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    assert res.status_code == 200
    data = res.json()

    assert "Mustard Oil" in data["low_stock"]

    # Verify database stored negative stock
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 6;")
        stock_qty = cursor.fetchone()["quantity"]

    assert stock_qty == -5.0


def test_confirm_twice_prevents_duplicate_sale_and_deduction(seeded_db: Path):
    """7. Confirming the same bill twice does not duplicate the sale or deduct stock twice."""
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 2}], db_path=seeded_db)
    b_id = bill["bill_id"]

    res1 = client.post("/confirm", json={"bill_id": b_id})
    assert res1.status_code == 200

    # Second confirmation attempt
    res2 = client.post("/confirm", json={"bill_id": b_id})
    assert res2.status_code == 400
    assert "already been confirmed" in res2.json()["detail"]

    # Verify sales table only contains 1 sale
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        sales_count = cursor.fetchone()["cnt"]

        # Stock deducted only once: 50 - 2 = 48
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        stock_qty = cursor.fetchone()["quantity"]

    assert sales_count == 1
    assert stock_qty == 48.0


def test_cancel_draft_creates_no_sale_and_preserves_stock(seeded_db: Path):
    """8. Cancelling a draft creates no sale and does not change stock."""
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 4}], db_path=seeded_db)
    b_id = bill["bill_id"]

    res = client.post("/cancel", json={"bill_id": b_id})
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 0

        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 50.0


def test_cancelled_bill_cannot_be_confirmed(seeded_db: Path):
    """9. A cancelled bill cannot be confirmed."""
    bill = create_draft_bill(items=[{"item_id": 1, "qty": 2}], db_path=seeded_db)
    b_id = bill["bill_id"]

    client.post("/cancel", json={"bill_id": b_id})

    res = client.post("/confirm", json={"bill_id": b_id})
    assert res.status_code == 400
    assert "cancelled" in res.json()["detail"]


def test_unknown_bill_ids_handled_safely():
    """10. Unknown bill IDs are handled safely with 404 response."""
    res_confirm = client.post("/confirm", json={"bill_id": "non_existent_b999"})
    assert res_confirm.status_code == 404
    assert "not found" in res_confirm.json()["detail"]

    res_cancel = client.post("/cancel", json={"bill_id": "non_existent_b999"})
    assert res_cancel.status_code == 404
    assert "not found" in res_cancel.json()["detail"]


def test_database_failure_rolls_back_sale_items_and_stock(seeded_db: Path):
    """11. A simulated database failure rolls back sale, sale items, and stock changes."""
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 2},
            {"item_id": 2, "qty": 3},
        ],
        db_path=seeded_db,
    )
    b_id = bill["bill_id"]

    # Create a trigger that fails during sale_items insertion to simulate a DB error
    with get_db(seeded_db) as conn:
        conn.execute(
            """
            CREATE TRIGGER fail_sale_items
            BEFORE INSERT ON sale_items
            BEGIN
                SELECT RAISE(FAIL, 'Simulated database failure');
            END;
            """
        )

    with pytest.raises(Exception):
        confirm_bill(b_id, db_path=seeded_db)

    # Verify rollback: no sales inserted, stock unchanged, bill still in draft
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM sales;")
        assert cursor.fetchone()["cnt"] == 0

        cursor.execute("SELECT COUNT(*) AS cnt FROM sale_items;")
        assert cursor.fetchone()["cnt"] == 0

        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 50.0

    # Bill should not be marked confirmed
    assert get_bill(b_id)["status"] == "draft"


def test_voice_confirm_and_cancel_integration(seeded_db: Path):
    """12. Existing voice confirmation and cancellation behavior executes DB updates and remains consistent."""
    # Voice confirm
    bill1 = create_draft_bill(items=[{"item_id": 1, "qty": 3}], db_path=seeded_db)
    b_id1 = bill1["bill_id"]

    with patch("backend.main.transcribe", return_value="Haan confirm karo"):
        with patch("backend.main.parse", return_value={"intent": "confirm"}):
            resp1 = client.post(
                "/voice",
                files={"audio": ("confirm.webm", b"audio_content", "audio/webm")},
                data={"bill_id": b_id1},
            )

    assert resp1.status_code == 200
    assert resp1.json()["intent"] == "confirm"
    assert "Sale confirmed" in resp1.json()["message"]

    # Verify sale was persisted in DB
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id = ?;", (resp1.json()["bill"]["sale_id"],))
        assert cursor.fetchone() is not None

    # Voice cancel
    bill2 = create_draft_bill(items=[{"item_id": 2, "qty": 1}], db_path=seeded_db)
    b_id2 = bill2["bill_id"]

    with patch("backend.main.transcribe", return_value="Nahi cancel karo"):
        with patch("backend.main.parse", return_value={"intent": "cancel"}):
            resp2 = client.post(
                "/voice",
                files={"audio": ("cancel.webm", b"audio_content", "audio/webm")},
                data={"bill_id": b_id2},
            )

    assert resp2.status_code == 200
    assert resp2.json()["intent"] == "cancel"
    assert resp2.json()["bill"] is None
    assert "Sale cancelled" in resp2.json()["message"]
