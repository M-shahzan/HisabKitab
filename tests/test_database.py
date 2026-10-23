import sqlite3
import pytest
from pathlib import Path

from backend.db import init_db, get_connection, get_db


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Fixture providing an isolated temporary database path for tests."""
    return tmp_path / "test_hisab_kitab.db"


def test_database_initialization_succeeds(temp_db: Path):
    """Verify database initialization succeeds without errors."""
    assert not temp_db.exists()
    init_db(temp_db)
    assert temp_db.exists()


def test_all_required_tables_exist(temp_db: Path):
    """Verify all five required tables exist in the schema."""
    init_db(temp_db)

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        )
        tables = {row["name"] for row in cursor.fetchall()}

    expected_tables = {"items", "stock", "sales", "sale_items", "corrections"}
    assert expected_tables.issubset(tables), (
        f"Missing tables: {expected_tables - tables}"
    )

    # Verify column structures for the required tables
    with get_db(temp_db) as conn:
        cursor = conn.cursor()

        def get_columns(table: str) -> set[str]:
            cursor.execute(f"PRAGMA table_info({table});")
            return {row["name"] for row in cursor.fetchall()}

        assert {"id", "name", "synonyms", "unit", "price"}.issubset(get_columns("items"))
        assert {"item_id", "quantity", "low_threshold"}.issubset(get_columns("stock"))
        assert {"id", "created_at", "total"}.issubset(get_columns("sales"))
        assert {"sale_id", "item_id", "quantity", "unit_price"}.issubset(get_columns("sale_items"))
        assert {"id", "heard_text", "item_id", "created_at"}.issubset(get_columns("corrections"))


def test_repeated_initialization_preserves_data(temp_db: Path):
    """Verify repeated initialization does not drop tables or delete existing records."""
    init_db(temp_db)

    with get_db(temp_db) as conn:
        conn.execute(
            "INSERT INTO items (id, name, synonyms, unit, price) VALUES (?, ?, ?, ?, ?);",
            (1, "Sugar", "chini,shakkar", "kg", 45.0),
        )

    # Run initialization again
    init_db(temp_db)

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM items WHERE id = ?;", (1,))
        row = cursor.fetchone()

    assert row is not None
    assert row["name"] == "Sugar"
    assert row["price"] == 45.0


def test_insert_and_retrieve_item(temp_db: Path):
    """Verify an item can be inserted and retrieved correctly with parameterized SQL."""
    init_db(temp_db)

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO items (name, synonyms, unit, price) VALUES (?, ?, ?, ?);",
            ("Rice", "chawal,arisi", "kg", 60.0),
        )
        inserted_id = cursor.lastrowid

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM items WHERE id = ?;", (inserted_id,))
        item = cursor.fetchone()

    assert item is not None
    assert item["id"] == inserted_id
    assert item["name"] == "Rice"
    assert item["synonyms"] == "chawal,arisi"
    assert item["unit"] == "kg"
    assert item["price"] == 60.0


def test_transaction_rollback_on_error(temp_db: Path):
    """Verify that exceptions inside get_db trigger a transaction rollback."""
    init_db(temp_db)

    with pytest.raises(ValueError):
        with get_db(temp_db) as conn:
            conn.execute(
                "INSERT INTO items (name, synonyms, unit, price) VALUES (?, ?, ?, ?);",
                ("Toor Dal", "arhar dal", "kg", 140.0),
            )
            # Simulate unexpected failure
            raise ValueError("Simulated unexpected failure")

    with get_db(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM items WHERE name = ?;", ("Toor Dal",))
        row = cursor.fetchone()

    assert row is None, "Record should not have been committed due to rollback"
