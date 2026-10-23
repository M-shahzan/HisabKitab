import sys
from io import BytesIO
from pathlib import Path
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
from fastapi.testclient import TestClient

from backend.billing import bills, clear_bills, create_draft_bill
from backend.db import get_db
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_bills_and_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Ensure in-memory draft bills are cleared and an isolated database is used for each test."""
    clear_bills()
    db_file = tmp_path / "test_api.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    yield
    clear_bills()


def test_confirm_route_success_and_decrements_stock():
    """Verify POST /confirm commits sale, decrements inventory, and removes draft."""
    # Create draft bill with 2 kg Rice (item 1, starting stock 50) and 1 kg Sugar (item 2, starting stock 40)
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}, {"item_id": 2, "qty": 1.0}])
    bill_id = bill["bill_id"]
    assert bill_id in bills

    response = client.post("/confirm", json={"bill_id": bill_id})
    assert response.status_code == 200
    data = response.json()
    assert "sale_id" in data
    assert data["total"] == bill["total"]
    assert isinstance(data["low_stock"], list)

    # Verify draft bill removed from memory
    assert bill_id not in bills

    # Verify stock decremented in database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1")
        assert cursor.fetchone()["quantity"] == 48.0  # 50 - 2
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2")
        assert cursor.fetchone()["quantity"] == 39.0  # 40 - 1

        # Verify sales record inserted
        cursor.execute("SELECT total FROM sales WHERE id = ?", (data["sale_id"],))
        assert cursor.fetchone()["total"] == bill["total"]

        # Verify sale items inserted
        cursor.execute("SELECT item_id, quantity FROM sale_items WHERE sale_id = ?", (data["sale_id"],))
        items_sold = {r["item_id"]: r["quantity"] for r in cursor.fetchall()}
        assert items_sold == {1: 2.0, 2: 1.0}


def test_confirm_route_insufficient_stock_prevents_negative():
    """Verify POST /confirm rejects bill if stock is insufficient and rolls back."""
    # Starting stock for Rice (item 1) is 50.0. Request 100.0.
    bill = create_draft_bill([{"item_id": 1, "qty": 100.0}])
    bill_id = bill["bill_id"]

    response = client.post("/confirm", json={"bill_id": bill_id})
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]

    # Verify bill is NOT removed from drafts
    assert bill_id in bills

    # Verify stock is unmodified
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1")
        assert cursor.fetchone()["quantity"] == 50.0

        # Verify no sale was recorded
        cursor.execute("SELECT COUNT(*) as count FROM sales")
        assert cursor.fetchone()["count"] == 0


def test_confirm_route_duplicate_fails():
    """Verify attempting to confirm an already confirmed bill returns 404."""
    bill = create_draft_bill([{"item_id": 1, "qty": 1.0}])
    bill_id = bill["bill_id"]

    res1 = client.post("/confirm", json={"bill_id": bill_id})
    assert res1.status_code == 200

    # Second attempt should return 404 since draft was removed
    res2 = client.post("/confirm", json={"bill_id": bill_id})
    assert res2.status_code == 404


def test_confirm_route_nonexistent_bill_404():
    """Verify confirming an unknown bill returns 404."""
    response = client.post("/confirm", json={"bill_id": "nonexistent_bill_123"})
    assert response.status_code == 404


def test_cancel_route_success():
    """Verify POST /cancel removes draft bill without altering stock or sales."""
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}])
    bill_id = bill["bill_id"]
    assert bill_id in bills

    response = client.post("/cancel", json={"bill_id": bill_id})
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert bill_id not in bills

    # Verify stock is untouched
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1")
        assert cursor.fetchone()["quantity"] == 50.0


def test_cancel_route_nonexistent_404():
    """Verify cancelling unknown bill returns 404."""
    response = client.post("/cancel", json={"bill_id": "b_unknown"})
    assert response.status_code == 404


def test_get_stock_endpoint():
    """Verify GET /stock returns catalog inventory list."""
    response = client.get("/stock")
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    assert len(items) == 25
    assert items[0]["item_id"] == 1
    assert items[0]["name"] == "Rice"
    assert "quantity" in items[0]
    assert items[0]["unit"] == "kg"


def test_get_summary_endpoint():
    """Verify GET /summary computes daily totals, count, top items, and low stock."""
    # Confirm a sale first
    bill = create_draft_bill([{"item_id": 1, "qty": 5.0}])
    client.post("/confirm", json={"bill_id": bill["bill_id"]})

    response = client.get("/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["count"] == 1
    assert summary["total"] == 300.0  # 5 * 60
    assert len(summary["top_items"]) == 1
    assert summary["top_items"][0]["item_id"] == 1
    assert isinstance(summary["low_stock"], list)
    assert isinstance(summary["message"], str)


def test_voice_endpoint_new_sale(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with new_sale intent creates a draft bill and returns voice message."""
    # Mock STT to return speech text without making live external calls
    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "do kilo chawal dena",
    )
    # Mock parser to return Section 4.2 contract
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "new_sale",
            "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        },
    )

    fake_audio = BytesIO(b"RIFF....WAVEfmt ")
    response = client.post(
        "/voice",
        files={"audio": ("audio.wav", fake_audio, "audio/wav")},
        data={"language": "hi"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["transcript"] == "do kilo chawal dena"
    assert data["intent"] == "new_sale"
    assert data["bill"] is not None
    assert data["bill"]["total"] == 120
    assert "120 rupees" in data["message"]


def test_voice_endpoint_edit_bill(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with edit_bill intent updates the active draft bill."""
    initial_bill = create_draft_bill([{"item_id": 1, "qty": 1.0}])
    bill_id = initial_bill["bill_id"]

    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "chawal teen kilo kar do",
    )
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "edit_bill",
            "items": [],
            "edit": {"action": "set_qty", "item_id": 1, "value": 3.0},
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        },
    )

    fake_audio = BytesIO(b"dummy audio bytes")
    response = client.post(
        "/voice",
        files={"audio": ("audio.webm", fake_audio, "audio/webm")},
        data={"bill_id": bill_id, "language": "hi"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "edit_bill"
    assert data["bill"]["lines"][0]["qty"] == 3
    assert data["bill"]["total"] == 180  # 3 * 60


def test_voice_endpoint_confirm(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with confirm intent confirms active bill."""
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}])
    bill_id = bill["bill_id"]

    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "haan theek hai save karo",
    )
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "confirm",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        },
    )

    fake_audio = BytesIO(b"dummy audio")
    response = client.post(
        "/voice",
        files={"audio": ("audio.webm", fake_audio, "audio/webm")},
        data={"bill_id": bill_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "confirm"
    assert data["bill"] is None
    assert "sale_id" in data
    assert bill_id not in bills


def test_voice_endpoint_cancel(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with cancel intent cancels active bill."""
    bill = create_draft_bill([{"item_id": 1, "qty": 2.0}])
    bill_id = bill["bill_id"]

    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "nahi cancel",
    )
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "cancel",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        },
    )

    fake_audio = BytesIO(b"dummy audio")
    response = client.post(
        "/voice",
        files={"audio": ("audio.webm", fake_audio, "audio/webm")},
        data={"bill_id": bill_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "cancel"
    assert data["bill"] is None
    assert bill_id not in bills


def test_voice_endpoint_query_stock(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with query_stock intent reports remaining stock."""
    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "chawal kitna bacha hai",
    )
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "query_stock",
            "items": [],
            "edit": None,
            "query_item_id": 1,
            "unknown_words": [],
            "needs_clarification": None,
        },
    )

    fake_audio = BytesIO(b"dummy audio")
    response = client.post(
        "/voice",
        files={"audio": ("audio.webm", fake_audio, "audio/webm")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "query_stock"
    assert "Rice ka 50 kg stock bacha hai" in data["message"]


def test_voice_endpoint_unclear(monkeypatch: pytest.MonkeyPatch):
    """Verify POST /voice with unclear intent returns clarification message."""
    monkeypatch.setattr(
        "backend.main.transcribe",
        lambda *args, **kwargs: "dragon fruit de do",
    )
    monkeypatch.setattr(
        "backend.main.parse",
        lambda *args, **kwargs: {
            "intent": "unclear",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": ["dragon fruit"],
            "needs_clarification": "Dragon fruit catalog mein nahi hai.",
        },
    )

    fake_audio = BytesIO(b"dummy audio")
    response = client.post(
        "/voice",
        files={"audio": ("audio.webm", fake_audio, "audio/webm")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "unclear"
    assert data["bill"] is None
    assert "Dragon fruit catalog mein nahi hai" in data["message"]
