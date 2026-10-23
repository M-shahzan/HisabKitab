import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.db import get_db


def validate_date(date_str: str) -> str:
    """Validate that date_str is in YYYY-MM-DD format and is a valid calendar date."""
    if not isinstance(date_str, str):
        raise ValueError("Date must be a string in YYYY-MM-DD format.")
    cleaned = date_str.strip()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.")
    try:
        datetime.strptime(cleaned, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid calendar date: {cleaned}")
    return cleaned


def get_sales_summary(
    date_str: str | None = None,
    db_path: str | Path | None = None,
) -> dict[str, Any]:
    """Calculate daily sales total, sale count, top 3 items by quantity sold,

    and currently low-stock items (Section 4.3 & 7 B5).

    Ranking Metric:
    Top items are ranked by total quantity sold (SUM(sale_items.quantity) DESC),
    with secondary sort by item name ascending.

    Response format:
    {
        "total": float | int,
        "count": int,
        "top_items": list[str],
        "low_stock": list[str]
    }
    """
    if date_str is None:
        target_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    else:
        target_date = validate_date(date_str)

    pattern = f"{target_date}%"

    with get_db(db_path) as conn:
        cursor = conn.cursor()

        # 1. Total revenue and count of sales for the target date
        cursor.execute(
            """
            SELECT COUNT(*) AS sale_count, COALESCE(SUM(total), 0) AS total_revenue
            FROM sales
            WHERE created_at LIKE ?;
            """,
            (pattern,),
        )
        row = cursor.fetchone()
        count = int(row["sale_count"]) if row else 0
        raw_total = float(row["total_revenue"]) if row else 0.0
        total = int(raw_total) if raw_total.is_integer() else round(raw_total, 2)

        # 2. Top 3 items by quantity sold on the date
        cursor.execute(
            """
            SELECT i.name, SUM(si.quantity) AS total_qty
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN items i ON si.item_id = i.id
            WHERE s.created_at LIKE ?
            GROUP BY si.item_id, i.name
            ORDER BY total_qty DESC, i.name ASC
            LIMIT 3;
            """,
            (pattern,),
        )
        top_items = [r["name"] for r in cursor.fetchall()]

        # 3. Current items below low-stock threshold
        cursor.execute(
            """
            SELECT i.name
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.quantity < s.low_threshold
            ORDER BY (s.quantity - s.low_threshold) ASC, i.name ASC;
            """
        )
        low_stock = [r["name"] for r in cursor.fetchall()]

    return {
        "total": total,
        "count": count,
        "top_items": top_items,
        "low_stock": low_stock,
    }
