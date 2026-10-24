import sys
from pathlib import Path
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient

from backend.billing import bills, clear_bills, create_draft_bill
from backend.db import get_db
from backend.history import get_all_bills, get_bill_by_id
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_bills_and_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Ensure in-memory draft bills are cleared and an isolated database is used for each test."""
    clear_bills()
    db_file = tmp_path / "test_bills_history.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    yield
    clear_bills()


def test_empty_bills_history():
    """Verify GET /bills returns an empty list when no sales have been confirmed yet."""
    response = client.get("/bills")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data == []


def test_multiple_confirmed_bills_appear_newest_first():
    """Requirement 1: Verify multiple confirmed bills appear newest first (id DESC)."""
    # Bill 1: Rice (item 1, 2 kg at 60 = 120)
    bill1 = create_draft_bill([{"item_id": 1, "qty": 2.0}])
    res1 = client.post("/confirm", json={"bill_id": bill1["bill_id"]})
    assert res1.status_code == 200
    sale1_id = res1.json()["sale_id"]

    # Bill 2: Sugar (item 2, 1 kg at 42 = 42)
    bill2 = create_draft_bill([{"item_id": 2, "qty": 1.0}])
    res2 = client.post("/confirm", json={"bill_id": bill2["bill_id"]})
    assert res2.status_code == 200
    sale2_id = res2.json()["sale_id"]

    # Bill 3: Salt (item 3, 3 units at 25 = 75)
    bill3 = create_draft_bill([{"item_id": 3, "qty": 3.0}])
    res3 = client.post("/confirm", json={"bill_id": bill3["bill_id"]})
    assert res3.status_code == 200
    sale3_id = res3.json()["sale_id"]

    response = client.get("/bills")
    assert response.status_code == 200
    all_bills = response.json()
    assert isinstance(all_bills, list)
    assert len(all_bills) == 3

    # Must be ordered newest first (sale3, sale2, sale1)
    ids = [b["id"] for b in all_bills]
    assert ids == [sale3_id, sale2_id, sale1_id]
    assert ids[0] > ids[1] > ids[2]

    # Verify each entry has required summary fields
    for b in all_bills:
        assert "bill_number" in b
        assert "created_at" in b
        assert "item_count" in b
        assert "total" in b


def test_each_bill_opens_with_correct_saved_line_items():
    """Requirement 2: Verify each bill opens with correct line items, quantities, and line totals."""
    # Draft with Rice (2 kg at 60) and Sugar (1.5 kg at 42)
    bill = create_draft_bill([
        {"item_id": 1, "qty": 2.0},
        {"item_id": 2, "qty": 1.5},
    ])
    confirm_res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    assert confirm_res.status_code == 200
    sale_id = confirm_res.json()["sale_id"]

    # Fetch detail
    response = client.get(f"/bills/{sale_id}")
    assert response.status_code == 200
    detail = response.json()

    assert detail["id"] == sale_id
    assert detail["bill_number"] == str(sale_id)
    assert detail["total"] == 120.0 + 63.0  # 183.0
    assert detail["item_count"] == 2
    assert len(detail["items"]) == 2

    rice_line = next(i for i in detail["items"] if i["item_id"] == 1)
    assert rice_line["name"] == "Rice"
    assert rice_line["quantity"] == 2.0
    assert rice_line["unit"] == "kg"
    assert rice_line["unit_price"] == 60.0
    assert rice_line["line_total"] == 120.0

    sugar_line = next(i for i in detail["items"] if i["item_id"] == 2)
    assert sugar_line["name"] == "Sugar"
    assert sugar_line["quantity"] == 1.5
    assert sugar_line["unit"] == "kg"
    assert sugar_line["unit_price"] == 42.0
    assert sugar_line["line_total"] == 63.0


def test_historical_prices_remain_correct_when_catalog_prices_change():
    """Requirement 3: Verify historical prices remain intact even if catalog prices later change."""
    # Create and confirm sale when Rice catalog price is 60.0
    bill = create_draft_bill([{"item_id": 1, "qty": 3.0}])
    confirm_res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    assert confirm_res.status_code == 200
    sale_id = confirm_res.json()["sale_id"]

    # Later: Update catalog price of Rice in database from 60.0 to 120.0!
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE items SET price = 120.0 WHERE id = 1")
        conn.commit()

    # Verify GET /bills and GET /bills/{sale_id} still return historical unit price 60.0 and total 180.0
    list_res = client.get("/bills")
    assert list_res.status_code == 200
    assert list_res.json()[0]["total"] == 180.0

    detail_res = client.get(f"/bills/{sale_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["total"] == 180.0
    assert detail["items"][0]["unit_price"] == 60.0
    assert detail["items"][0]["line_total"] == 180.0


def test_unknown_bill_id_returns_404():
    """Requirement 4: Validate IDs and return a clear 404 response when a bill does not exist."""
    # Non-existent ID
    res1 = client.get("/bills/999999")
    assert res1.status_code == 404
    assert "not found" in res1.json()["detail"].lower()

    # Negative ID
    res2 = client.get("/bills/-1")
    assert res2.status_code == 404

    # Non-numeric ID
    res3 = client.get("/bills/invalid-id")
    assert res3.status_code == 404


def test_viewing_history_does_not_modify_stock():
    """Requirement 5: Verify viewing history or details is strictly read-only and does not modify stock."""
    # Initial confirmation: Rice stock becomes 50 - 2 = 48
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}])
    confirm_res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    sale_id = confirm_res.json()["sale_id"]

    def get_stock_qty(item_id=1):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT quantity FROM stock WHERE item_id = ?", (item_id,))
            return cursor.fetchone()["quantity"]

    stock_before = get_stock_qty(1)
    assert stock_before == 48.0

    # Call GET /bills multiple times
    for _ in range(5):
        client.get("/bills")

    # Call GET /bills/{sale_id} multiple times
    for _ in range(5):
        client.get(f"/bills/{sale_id}")

    stock_after = get_stock_qty(1)
    assert stock_after == stock_before == 48.0


def test_viewing_history_does_not_create_or_change_sales():
    """Requirement 6: Verify viewing history does not create new sales records or alter existing sales."""
    bill = create_draft_bill([{"item_id": 1, "qty": 1.0}])
    confirm_res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    sale_id = confirm_res.json()["sale_id"]

    def count_sales():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM sales")
            return cursor.fetchone()["cnt"]

    count_before = count_sales()
    assert count_before == 1

    # Repeatedly read history
    client.get("/bills")
    client.get(f"/bills/{sale_id}")
    client.get("/bills/9999")

    count_after = count_sales()
    assert count_after == count_before == 1


def test_history_survives_application_restart():
    """Requirement 7: Verify history survives restart because it is backed by SQLite."""
    # Confirm a bill in the SQLite database
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}, {"item_id": 2, "qty": 3.0}])
    confirm_res = client.post("/confirm", json={"bill_id": bill["bill_id"]})
    sale_id = confirm_res.json()["sale_id"]

    # Simulate restart by clearing any in-memory state and creating a brand new TestClient instance
    clear_bills()
    fresh_client = TestClient(app)

    response = fresh_client.get("/bills")
    assert response.status_code == 200
    bills_list = response.json()
    assert len(bills_list) == 1
    assert bills_list[0]["id"] == sale_id
    assert bills_list[0]["item_count"] == 2

    detail_res = fresh_client.get(f"/bills/{sale_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == sale_id
    assert len(detail_res.json()["items"]) == 2


def test_active_unconfirmed_drafts_are_not_exposed_as_completed_bills():
    """Requirement 3 constraint: Do not expose active, unconfirmed drafts as completed bills."""
    # Create draft bill but do NOT confirm it
    draft = create_draft_bill([{"item_id": 1, "qty": 5.0}])
    assert draft["bill_id"] in bills

    # GET /bills should NOT contain this draft
    response = client.get("/bills")
    assert response.status_code == 200
    assert response.json() == []

    # GET /bills/{draft_id} should return 404
    detail_res = client.get(f"/bills/{draft['bill_id']}")
    assert detail_res.status_code == 404


def test_transactions_endpoint_works_for_dashboard():
    """Verify GET /transactions returns formatted transaction records."""
    bill = create_draft_bill([{"item_id": 1, "qty": 1.0}])
    client.post("/confirm", json={"bill_id": bill["bill_id"]})

    response = client.get("/transactions")
    assert response.status_code == 200
    txns = response.json()
    assert len(txns) == 1
    assert txns[0]["status"] == "completed"
    assert txns[0]["itemCount"] == 1
