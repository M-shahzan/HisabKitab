from pathlib import Path
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from backend.db import get_db
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_correction.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_valid_correction_saved(seeded_db: Path):
    """1. A valid correction is saved and returns {"ok": true}."""
    # Item 2 is Sugar
    res = client.post("/correction", json={"heard_text": "sakkare", "item_id": 2})
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_saved_record_contains_correct_fields(seeded_db: Path):
    """2. The saved record contains the correct heard text, item ID, and timestamp."""
    # Item 1 is Rice
    res = client.post("/correction", json={"heard_text": "arisi", "item_id": 1})
    assert res.status_code == 200

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM corrections WHERE item_id = 1;")
        row = cursor.fetchone()

    assert row is not None
    assert row["heard_text"] == "arisi"
    assert row["item_id"] == 1
    # Verify ISO timestamp validity
    created_at = datetime.fromisoformat(row["created_at"])
    assert created_at is not None


def test_multiple_corrections_preserved_and_intact(seeded_db: Path):
    """3 & 8. Multiple corrections are preserved and existing records remain intact after later inserts."""
    corrections_to_insert = [
        {"heard_text": "sakkare", "item_id": 2},
        {"heard_text": "chawal", "item_id": 1},
        {"heard_text": "cheeni", "item_id": 2},
    ]

    for corr in corrections_to_insert:
        res = client.post("/correction", json=corr)
        assert res.status_code == 200

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, heard_text, item_id FROM corrections ORDER BY id ASC;")
        rows = cursor.fetchall()

    assert len(rows) == 3
    assert rows[0]["heard_text"] == "sakkare" and rows[0]["item_id"] == 2
    assert rows[1]["heard_text"] == "chawal" and rows[1]["item_id"] == 1
    assert rows[2]["heard_text"] == "cheeni" and rows[2]["item_id"] == 2


def test_empty_or_whitespace_heard_text_rejected(seeded_db: Path):
    """4. Empty or whitespace-only heard text is rejected with HTTP 400."""
    res_empty = client.post("/correction", json={"heard_text": "", "item_id": 1})
    assert res_empty.status_code == 400
    assert "empty or whitespace" in res_empty.json()["detail"]

    res_whitespace = client.post("/correction", json={"heard_text": "   \t\n  ", "item_id": 1})
    assert res_whitespace.status_code == 400
    assert "empty or whitespace" in res_whitespace.json()["detail"]


def test_invalid_item_id_rejected(seeded_db: Path):
    """5. Invalid non-integer item IDs receive controlled validation errors."""
    res = client.post("/correction", json={"heard_text": "sakkare", "item_id": "not_an_int"})
    assert res.status_code == 422


def test_unknown_catalogue_item_rejected(seeded_db: Path):
    """6. Unknown catalogue items are rejected with HTTP 400."""
    res = client.post("/correction", json={"heard_text": "sakkare", "item_id": 9999})
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


def test_invalid_json_payload_rejected(seeded_db: Path):
    """7. Invalid JSON schemas/missing fields receive controlled validation errors."""
    res_missing_item = client.post("/correction", json={"heard_text": "sakkare"})
    assert res_missing_item.status_code == 422

    res_missing_text = client.post("/correction", json={"item_id": 1})
    assert res_missing_text.status_code == 422


def test_catalogue_remains_unchanged(seeded_db: Path):
    """Correction storage is separate from catalogue; does not modify items or stock."""
    # Capture initial item state for Item 2
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM items WHERE id = 2;")
        item_before = dict(cursor.fetchone())
        cursor.execute("SELECT * FROM stock WHERE item_id = 2;")
        stock_before = dict(cursor.fetchone())

    # Log correction
    client.post("/correction", json={"heard_text": "sakkare", "item_id": 2})

    # Verify item and stock are identical
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM items WHERE id = 2;")
        item_after = dict(cursor.fetchone())
        cursor.execute("SELECT * FROM stock WHERE item_id = 2;")
        stock_after = dict(cursor.fetchone())

    assert item_before == item_after
    assert stock_before == stock_after
