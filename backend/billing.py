import copy
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.db import get_db

# In-memory store for draft bills keyed by bill_id
bills: dict[str, dict[str, Any]] = {}
confirmed_bills: set[str] = set()
cancelled_bills: set[str] = set()


def _format_num(val: float) -> int | float:
    """Format floating point numbers to integers if they represent whole numbers."""
    rounded = round(val, 2)
    return int(rounded) if rounded.is_integer() else rounded


def generate_bill_id() -> str:
    """Generate a unique bill ID starting with 'b'."""
    return f"b_{uuid.uuid4().hex[:8]}"


def get_bill(bill_id: str) -> dict[str, Any]:
    """Retrieve a copy of a draft bill by bill_id.

    Raises KeyError if bill_id does not exist.
    """
    if bill_id not in bills:
        raise KeyError(f"Bill '{bill_id}' not found.")
    return copy.deepcopy(bills[bill_id])


def clear_bills() -> None:
    """Clear all draft bills from memory (useful for test isolation)."""
    bills.clear()
    confirmed_bills.clear()
    cancelled_bills.clear()


def create_draft_bill(
    items: list[dict[str, Any]],
    db_path: str | Path | None = None,
    bill_id: str | None = None,
) -> dict[str, Any]:
    """Create a new in-memory draft bill from parsed items.

    Price Interpretation Rule:
    - If an explicit `price` is provided in an item dict, it represents the
      spoken unit price for that item and overrides the catalogue price.
    - If `price` is None or omitted, the catalogue `price` from the SQLite
      `items` table is used as the unit price.
    - Line amount is calculated as `round(qty * unit_price, 2)`.
    - Total is the sum of all line amounts.

    Raises:
    - ValueError: for invalid quantities, missing items list, or unknown catalogue item IDs.
    """
    if not isinstance(items, list):
        raise ValueError(f"Items must be a list, got {type(items).__name__}")
    if len(items) == 0:
        raise ValueError("Cannot create a draft bill with no items.")

    actual_bill_id = bill_id if bill_id else generate_bill_id()

    # Pre-validate and lookup catalogue items
    lines: list[dict[str, Any]] = []
    lines_by_item_id: dict[int, dict[str, Any]] = {}

    with get_db(db_path) as conn:
        cursor = conn.cursor()
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Item at index {idx} must be a dict.")

            if "item_id" not in item:
                raise ValueError(f"Item at index {idx} missing 'item_id'.")

            try:
                item_id = int(item["item_id"])
            except (ValueError, TypeError):
                raise ValueError(f"Invalid item_id '{item.get('item_id')}' at index {idx}.")

            if "qty" not in item:
                raise ValueError(f"Item {item_id} is missing 'qty'.")

            try:
                qty = float(item["qty"])
                if qty <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                raise ValueError(f"Invalid quantity '{item.get('qty')}' for item_id {item_id}. Must be > 0.")

            # Lookup in database
            cursor.execute("SELECT id, name, unit, price FROM items WHERE id = ?;", (item_id,))
            cat_row = cursor.fetchone()
            if cat_row is None:
                raise ValueError(f"Unknown item_id {item_id}: item does not exist in catalogue.")

            # Determine unit price: explicit spoken price overrides catalogue price
            explicit_price = item.get("price")
            if explicit_price is not None:
                try:
                    unit_price = float(explicit_price)
                    if unit_price < 0:
                        raise ValueError()
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid price '{explicit_price}' for item_id {item_id}.")
            else:
                unit_price = float(cat_row["price"])

            unit = item.get("unit") or cat_row["unit"]
            name = cat_row["name"]

            if item_id in lines_by_item_id:
                # Merge quantity if item_id already in bill
                existing = lines_by_item_id[item_id]
                existing["qty"] = _format_num(existing["qty"] + qty)
                existing["amount"] = _format_num(existing["qty"] * existing["unit_price"])
            else:
                line_amount = _format_num(qty * unit_price)
                new_line = {
                    "item_id": item_id,
                    "name": name,
                    "qty": _format_num(qty),
                    "unit": unit,
                    "unit_price": _format_num(unit_price),
                    "amount": line_amount,
                }
                lines.append(new_line)
                lines_by_item_id[item_id] = new_line

    total_amount = _format_num(sum(l["amount"] for l in lines))

    bill = {
        "bill_id": actual_bill_id,
        "lines": lines,
        "total": total_amount,
        "status": "draft",
    }

    bills[actual_bill_id] = bill
    return copy.deepcopy(bill)


def edit_draft_bill(bill_id: str, edit: dict[str, Any]) -> dict[str, Any]:
    """Edit an existing draft bill according to the parser edit contract.

    Supported edit actions (Section 4.2):
    - "set_qty": updates the quantity of the item and recalculates line amount and total.
    - "set_price": updates the unit price of the item and recalculates line amount and total.
    - "remove": removes the item line and recalculates the total.

    Guarantees:
    - Atomic validation: invalid edits raise ValueError/KeyError without corrupting the draft.
    - Isolated from other bills.
    """
    if bill_id in confirmed_bills:
        raise ValueError(f"Cannot edit confirmed bill '{bill_id}'.")
    if bill_id in cancelled_bills:
        raise ValueError(f"Cannot edit cancelled bill '{bill_id}'.")
    if bill_id not in bills:
        raise KeyError(f"Bill '{bill_id}' not found.")

    if not isinstance(edit, dict):
        raise ValueError(f"Edit payload must be a dict, got {type(edit).__name__}")

    action = edit.get("action")
    if action not in ("set_qty", "set_price", "remove"):
        raise ValueError(f"Unknown edit action '{action}'. Must be one of 'set_qty', 'set_price', 'remove'.")

    if "item_id" not in edit:
        raise ValueError("Edit payload missing 'item_id'.")

    try:
        item_id = int(edit["item_id"])
    except (ValueError, TypeError):
        raise ValueError(f"Invalid item_id '{edit.get('item_id')}'.")

    # Work on a deep copy first to protect original draft against partial/invalid mutation
    working_bill = copy.deepcopy(bills[bill_id])
    lines = working_bill["lines"]

    line_idx = next((i for i, l in enumerate(lines) if l["item_id"] == item_id), None)

    if action == "remove":
        if line_idx is not None:
            lines.pop(line_idx)
        # If item not found, removal of non-existent item is a safe no-op without draft corruption

    elif action == "set_qty":
        if line_idx is None:
            raise KeyError(f"Cannot set quantity: item_id {item_id} not in bill '{bill_id}'.")

        val = edit.get("value")
        try:
            new_qty = float(val)
            if new_qty <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quantity value '{val}' for set_qty. Must be a positive number.")

        line = lines[line_idx]
        line["qty"] = _format_num(new_qty)
        line["amount"] = _format_num(line["qty"] * line["unit_price"])

    elif action == "set_price":
        if line_idx is None:
            raise KeyError(f"Cannot set price: item_id {item_id} not in bill '{bill_id}'.")

        val = edit.get("value")
        try:
            new_price = float(val)
            if new_price < 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError(f"Invalid price value '{val}' for set_price. Must be non-negative.")

        line = lines[line_idx]
        line["unit_price"] = _format_num(new_price)
        line["amount"] = _format_num(line["qty"] * line["unit_price"])

    # Recalculate bill total
    working_bill["total"] = _format_num(sum(l["amount"] for l in lines))

    # Save validated update to in-memory store
    bills[bill_id] = working_bill
    return copy.deepcopy(working_bill)


def confirm_bill(bill_id: str, db_path: str | Path | None = None) -> dict[str, Any]:
    """Confirm a draft bill: insert sales and sale_items, deduct quantities from stock,

    identify low-stock items, and mark the bill as confirmed.

    Transactional guarantees:
    - Atomically updates sales, sale_items, and stock.
    - If any error occurs, rolls back changes completely.
    - Prevents duplicate confirmation.
    - Follows negative-stock rule: allows stock to become negative and flags it in low_stock.

    Returns:
    {"sale_id": int, "total": float | int, "low_stock": list[str]}
    """
    if bill_id in confirmed_bills:
        raise ValueError(f"Bill '{bill_id}' has already been confirmed.")
    if bill_id in cancelled_bills:
        raise ValueError(f"Bill '{bill_id}' has been cancelled and cannot be confirmed.")
    if bill_id not in bills:
        raise KeyError(f"Bill '{bill_id}' not found.")

    bill = bills[bill_id]
    if bill.get("status") != "draft":
        raise ValueError(f"Bill '{bill_id}' is not in draft state (current: {bill.get('status')}).")
    if len(bill.get("lines", [])) == 0:
        raise ValueError(f"Bill '{bill_id}' has no line items to confirm.")

    low_stock: list[str] = []

    with get_db(db_path) as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()

        # 1. Insert into sales
        cursor.execute(
            "INSERT INTO sales (created_at, total) VALUES (?, ?);",
            (now, bill["total"]),
        )
        sale_id = cursor.lastrowid

        # 2. Insert into sale_items and deduct stock
        for line in bill["lines"]:
            item_id = int(line["item_id"])
            qty = float(line["qty"])
            unit_price = float(line["unit_price"])

            cursor.execute(
                "INSERT INTO sale_items (sale_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?);",
                (sale_id, item_id, qty, unit_price),
            )

            # Check stock record
            cursor.execute("SELECT quantity, low_threshold FROM stock WHERE item_id = ?;", (item_id,))
            stock_row = cursor.fetchone()
            if stock_row is None:
                raise ValueError(f"Stock record for item_id {item_id} not found in database.")

            current_qty = float(stock_row["quantity"])
            low_threshold = float(stock_row["low_threshold"])
            new_qty = _format_num(current_qty - qty)

            cursor.execute(
                "UPDATE stock SET quantity = ? WHERE item_id = ?;",
                (new_qty, item_id),
            )

            # Low stock check (including negative stock)
            if new_qty < low_threshold:
                item_name = line.get("name")
                if not item_name:
                    cursor.execute("SELECT name FROM items WHERE id = ?;", (item_id,))
                    ir = cursor.fetchone()
                    item_name = ir["name"] if ir else f"Item {item_id}"
                if item_name not in low_stock:
                    low_stock.append(item_name)

    # 3. Mark as confirmed
    confirmed_bills.add(bill_id)
    bill["status"] = "confirmed"
    bill["sale_id"] = sale_id

    return {
        "sale_id": sale_id,
        "total": bill["total"],
        "low_stock": low_stock,
    }


def cancel_bill(bill_id: str) -> dict[str, Any]:
    """Cancel a draft bill.

    Prevents future confirmation and discards the draft from active bills.
    Raises:
    - ValueError: if bill has already been confirmed.
    - KeyError: if bill does not exist.
    """
    if bill_id in confirmed_bills:
        raise ValueError(f"Bill '{bill_id}' has already been confirmed and cannot be cancelled.")
    if bill_id in cancelled_bills:
        return {"ok": True}
    if bill_id not in bills:
        raise KeyError(f"Bill '{bill_id}' not found.")

    cancelled_bills.add(bill_id)
    bill = bills.pop(bill_id)
    bill["status"] = "cancelled"

    return {"ok": True}
