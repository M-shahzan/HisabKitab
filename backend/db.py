import os
from pathlib import Path
import sqlite3
from contextlib import contextmanager
from typing import Generator, Any

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "hisab_kitab.db"


def get_db_path(db_path: str | Path | None = None) -> str:
    """Return the database path, prioritizing an explicit argument,

    then environment variables (DATABASE_PATH or DB_PATH), and finally
    the default project database path.
    """
    if db_path is not None:
        return str(db_path)
    env_path = os.getenv("DATABASE_PATH") or os.getenv("DB_PATH")
    if env_path:
        return env_path
    return str(DEFAULT_DB_PATH)


def get_connection(db_path: str | Path | None = None) -> sqlite3.Connection:
    """Create and return a new SQLite database connection."""
    target_path = get_db_path(db_path)
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_db(db_path: str | Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite connections with transaction management.

    Commits on successful block completion, rolls back on error, and
    safely closes the connection upon exit.
    """
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT,
    synonyms TEXT,
    unit TEXT,
    price REAL
);

CREATE TABLE IF NOT EXISTS stock (
    item_id INTEGER PRIMARY KEY,
    quantity REAL,
    low_threshold REAL
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    created_at TEXT,
    total REAL
);

CREATE TABLE IF NOT EXISTS sale_items (
    sale_id INTEGER,
    item_id INTEGER,
    quantity REAL,
    unit_price REAL
);

CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY,
    heard_text TEXT,
    item_id INTEGER,
    created_at TEXT
);
"""


def init_db(db_path: str | Path | None = None) -> None:
    """Initialize the SQLite database schema according to Section 4.1.

    Safe to run repeatedly; does not drop tables or delete existing data.
    """
    with get_db(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
