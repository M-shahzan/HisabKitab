from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.db import get_db


def log_correction(
    heard_text: str,
    item_id: int,
    db_path: str | Path | None = None,
) -> dict[str, Any]:
    """Log a user correction to the corrections table (Section 4.1, 4.3, 7 B6).

    Validates:
    - heard_text is non-empty after trimming.
    - item_id is an integer.
    - item_id exists in the items catalogue table.

    Returns:
    {"ok": True}
    """
    if not isinstance(heard_text, str):
        raise ValueError("heard_text must be a string.")

    cleaned_text = heard_text.strip()
    if not cleaned_text:
        raise ValueError("heard_text cannot be empty or whitespace.")

    try:
        clean_item_id = int(item_id)
    except (ValueError, TypeError):
        raise ValueError("item_id must be a valid integer.")

    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM items WHERE id = ?;", (clean_item_id,))
        if cursor.fetchone() is None:
            raise ValueError(f"Catalogue item with id {clean_item_id} does not exist.")

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO corrections (heard_text, item_id, created_at)
            VALUES (?, ?, ?);
            """,
            (cleaned_text, clean_item_id, now),
        )

    return {"ok": True}
