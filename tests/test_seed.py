import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.db import get_db, init_db
from backend.seed import seed_database, validate_item_data, DEFAULT_ITEMS_FILE
from backend.main import app

client = TestClient(app)


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Fixture providing an isolated temporary database path."""
    return tmp_path / "test_catalogue.db"


def test_seed_loads_successfully(temp_db: Path):
    """Verify seed data loads successfully into a temporary database."""
    count = seed_database(db_path=temp_db)
    assert count >= 20, "Expected at least 20 items seeded"

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM items;")
        items_cnt = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) AS cnt FROM stock;")
        stock_cnt = cursor.fetchone()["cnt"]

    assert items_cnt == count
    assert stock_cnt == count


def test_running_seeder_twice_no_duplicates(temp_db: Path):
    """Verify running the seeder twice does not create duplicate products."""
    first_count = seed_database(db_path=temp_db)
    second_count = seed_database(db_path=temp_db)
    assert first_count == second_count

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM items;")
        items_cnt = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(DISTINCT id) AS dist_cnt FROM items;")
        distinct_cnt = cursor.fetchone()["dist_cnt"]

    assert items_cnt == first_count
    assert distinct_cnt == first_count


def test_stock_references_correct_item(temp_db: Path):
    """Verify each seeded stock record references the correct item."""
    seed_database(db_path=temp_db)

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.item_id, i.id, i.name
            FROM stock s
            LEFT JOIN items i ON s.item_id = i.id
            """
        )
        rows = cursor.fetchall()

    assert len(rows) > 0
    for row in rows:
        assert row["id"] is not None, f"Stock item {row['item_id']} has no matching item in items table"
        assert row["item_id"] == row["id"]


def test_product_attributes_loaded_correctly(temp_db: Path):
    """Verify product prices, units, quantities, and thresholds are loaded correctly."""
    seed_database(db_path=temp_db)

    with open(DEFAULT_ITEMS_FILE, "r", encoding="utf-8") as f:
        source_items = {item["id"]: item for item in json.load(f)}

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT i.id, i.name, i.synonyms, i.unit, i.price, s.quantity, s.low_threshold
            FROM items i
            JOIN stock s ON i.id = s.item_id
            """
        )
        loaded_rows = cursor.fetchall()

    assert len(loaded_rows) == len(source_items)
    for row in loaded_rows:
        src = source_items[row["id"]]
        assert row["name"] == src["name"]
        assert row["unit"] == src["unit"]
        assert row["price"] == pytest.approx(float(src["price"]))
        assert row["quantity"] == pytest.approx(float(src.get("starting_stock", src.get("quantity", 0))))
        assert row["low_threshold"] == pytest.approx(float(src.get("low_threshold", 5)))


def test_get_stock_endpoint_structure(temp_db: Path, monkeypatch: pytest.MonkeyPatch):
    """Verify GET /stock returns the expected JSON structure and handles empty states."""
    monkeypatch.setenv("DATABASE_PATH", str(temp_db))

    # Before seeding: empty database returns empty list without error
    init_db(temp_db)
    res_empty = client.get("/stock")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # After seeding: returns joined item and stock list
    seed_database(db_path=temp_db)
    res = client.get("/stock")
    assert res.status_code == 200
    stock_list = res.json()
    assert isinstance(stock_list, list)
    assert len(stock_list) >= 20

    expected_keys = {"item_id", "name", "quantity", "unit"}
    for item in stock_list:
        assert expected_keys.issubset(item.keys())
        assert isinstance(item["item_id"], int)
        assert isinstance(item["name"], str)
        assert isinstance(item["quantity"], (int, float))
        assert isinstance(item["unit"], str)


def test_validation_rejects_invalid_data(tmp_path: Path):
    """Verify seeder rejects invalid data, missing fields, or duplicate IDs."""
    test_db = tmp_path / "invalid_test.db"

    # Missing required field 'price'
    invalid_file = tmp_path / "bad_items.json"
    invalid_file.write_text(
        json.dumps([{"id": 1, "name": "Item 1", "unit": "kg"}]),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="missing required field 'price'"):
        seed_database(items_path=invalid_file, db_path=test_db)

    # Duplicate IDs
    dup_file = tmp_path / "dup_items.json"
    dup_file.write_text(
        json.dumps([
            {"id": 1, "name": "Item 1", "unit": "kg", "price": 10.0},
            {"id": 1, "name": "Item 1 dup", "unit": "kg", "price": 12.0},
        ]),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="Duplicate product IDs"):
        seed_database(items_path=dup_file, db_path=test_db)


def test_demo_reset_preserves_sales_history(temp_db: Path):
    """Verify demo reset resets items and stock while preserving sales history."""
    seed_database(db_path=temp_db)

    # Record a sale in the database
    with get_db(temp_db) as conn:
        conn.execute(
            "INSERT INTO sales (id, created_at, total) VALUES (?, ?, ?);",
            (101, "2026-10-23T12:00:00", 250.0),
        )

    # Re-run with reset_demo=True
    seed_database(db_path=temp_db, reset_demo=True)

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id = 101;")
        sale = cursor.fetchone()

    assert sale is not None, "Demo reset must not delete sales records"
    assert sale["total"] == 250.0
