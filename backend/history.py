from pathlib import Path
from typing import Any
import sqlite3
from backend.db import get_db


def _format_num(val: float) -> int | float:
    """Format floating point numbers to integers if they represent whole numbers."""
    rounded = round(val, 2)
    return int(rounded) if rounded.is_integer() else rounded


def get_all_bills(db_path: str | Path | None = None) -> list[dict[str, Any]]:
    """Retrieve all confirmed sales bills from SQLite, ordered by newest first.

    Guarantees:
    - Read-only: does not modify stock or sales data.
    - Excludes in-memory drafts.
    - Ordered by newest first (id DESC).
    """
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                s.id,
                s.created_at,
                s.total,
                COUNT(si.item_id) AS item_count
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            GROUP BY s.id
            ORDER BY s.id DESC;
            """
        )
        rows = cursor.fetchall()

    bills = []
    for r in rows:
        total_val = _format_num(float(r["total"]))
        bills.append({
            "id": int(r["id"]),
            "sale_id": int(r["id"]),
            "bill_number": str(r["id"]),
            "created_at": r["created_at"],
            "total": total_val,
            "item_count": int(r["item_count"]),
        })
    return bills


def get_bill_by_id(sale_id: int | str, db_path: str | Path | None = None) -> dict[str, Any]:
    """Retrieve full bill details for a confirmed sale from SQLite.

    Joins sales, sale_items, and items to provide:
    - bill_number, created_at, grand total
    - every item: name, quantity, unit, unit_price, line_total (using stored sale-time prices!)

    Raises:
    - ValueError: if sale_id is invalid (non-integer or <= 0).
    - KeyError: if bill does not exist in the database (maps to 404 in API).
    """
    try:
        valid_id = int(sale_id)
        if valid_id <= 0:
            raise KeyError(f"Bill with ID {sale_id} not found.")
    except (ValueError, TypeError):
        raise KeyError(f"Bill with ID {sale_id} not found.")

    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, created_at, total FROM sales WHERE id = ?;",
            (valid_id,),
        )
        sale_row = cursor.fetchone()
        if not sale_row:
            raise KeyError(f"Bill with ID {valid_id} not found.")

        cursor.execute(
            """
            SELECT
                si.item_id,
                COALESCE(i.name, 'Item ' || si.item_id) AS name,
                COALESCE(i.unit, 'units') AS unit,
                si.quantity,
                si.unit_price
            FROM sale_items si
            LEFT JOIN items i ON si.item_id = i.id
            WHERE si.sale_id = ?
            ORDER BY si.rowid ASC;
            """,
            (valid_id,),
        )
        item_rows = cursor.fetchall()

    items = []
    for r in item_rows:
        qty = _format_num(float(r["quantity"]))
        unit_price = _format_num(float(r["unit_price"]))
        line_total = _format_num(float(qty * unit_price))
        items.append({
            "item_id": int(r["item_id"]),
            "name": str(r["name"]),
            "quantity": qty,
            "unit": str(r["unit"]),
            "unit_price": unit_price,
            "line_total": line_total,
        })

    grand_total = _format_num(float(sale_row["total"]))

    return {
        "id": int(sale_row["id"]),
        "bill_number": str(sale_row["id"]),
        "created_at": sale_row["created_at"],
        "total": grand_total,
        "item_count": len(items),
        "items": items,
    }


def get_transactions_history(db_path: str | Path | None = None) -> list[dict[str, Any]]:
    """Return confirmed bills formatted as transaction list for dashboard/summary widgets."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                s.id,
                s.created_at,
                s.total,
                COUNT(si.item_id) AS item_count
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            GROUP BY s.id
            ORDER BY s.id DESC;
            """
        )
        rows = cursor.fetchall()

    return [
        {
            "id": str(r["id"]),
            "billNumber": str(r["id"]),
            "customerName": "Walk-in Customer",
            "itemCount": int(r["item_count"]),
            "total": _format_num(float(r["total"])),
            "paymentMode": "cash",
            "createdAt": r["created_at"],
            "status": "completed",
        }
        for r in rows
    ]
