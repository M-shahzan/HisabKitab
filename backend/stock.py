"""Stock adjustment and inventory tracking for Hisab Kitab."""

from pathlib import Path
from typing import Any, Optional, Union
import sqlite3

from backend.db import get_db


def _format_num(val: float) -> int | float:
    """Format floating point numbers to integers if whole numbers."""
    rounded = round(val, 2)
    return int(rounded) if rounded.is_integer() else rounded


# Unit conversion mappings to canonical catalog units
UNIT_CONVERSIONS: dict[tuple[str, str], float] = {
    # (spoken_unit, catalog_unit) -> multiplier to convert to catalog unit
    ("g", "kg"): 0.001,
    ("gram", "kg"): 0.001,
    ("grams", "kg"): 0.001,
    ("gm", "kg"): 0.001,
    ("kg", "kg"): 1.0,
    ("kilo", "kg"): 1.0,
    ("kilos", "kg"): 1.0,
    ("kilogram", "kg"): 1.0,
    ("kilograms", "kg"): 1.0,
    ("ml", "litre"): 0.001,
    ("millilitre", "litre"): 0.001,
    ("l", "litre"): 1.0,
    ("litre", "litre"): 1.0,
    ("liter", "litre"): 1.0,
    ("litres", "litre"): 1.0,
    ("liters", "litre"): 1.0,
    ("packet", "packet"): 1.0,
    ("packets", "packet"): 1.0,
    ("pkt", "packet"): 1.0,
    ("pkts", "packet"): 1.0,
    ("piece", "piece"): 1.0,
    ("pieces", "piece"): 1.0,
    ("pc", "piece"): 1.0,
    ("pcs", "piece"): 1.0,
}


def normalize_quantity_for_item(
    qty: float,
    spoken_unit: Optional[str],
    catalog_unit: str,
    item_name: str,
) -> float:
    """Validate and convert quantity into the catalog's unit."""
    try:
        numeric_qty = float(qty)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid quantity '{qty}'. Must be a valid number.")

    if numeric_qty <= 0:
        raise ValueError("Adjustment quantity must be greater than zero.")

    cat_unit_norm = str(catalog_unit).lower().strip()
    if not spoken_unit:
        return numeric_qty

    spk_unit_norm = str(spoken_unit).lower().strip()
    if spk_unit_norm == cat_unit_norm:
        return numeric_qty

    key = (spk_unit_norm, cat_unit_norm)
    if key in UNIT_CONVERSIONS:
        multiplier = UNIT_CONVERSIONS[key]
        converted = numeric_qty * multiplier
        return round(converted, 3)

    raise ValueError(
        f"Unit mismatch for {item_name}: cannot convert '{spoken_unit}' to catalog unit '{catalog_unit}'."
    )


def adjust_stock(
    item_id: int,
    qty: float,
    action: str = "stock_in",
    unit: Optional[str] = None,
    db_path: str | Path | None = None,
) -> dict[str, Any]:
    """Adjust inventory quantity for a single item (increase or decrease).

    Args:
        item_id: Product ID in SQLite items catalog.
        qty: Positive adjustment quantity.
        action: 'stock_in' / 'in' (add) or 'stock_out' / 'out' (remove).
        unit: Optional spoken unit.
        db_path: Optional path to SQLite database.

    Returns:
        dict with item_id, name, action, delta, previous_quantity, new_quantity, unit, message.

    Raises:
        ValueError: if quantity <= 0, unit is incompatible, or stock_out exceeds current stock.
        KeyError: if item_id does not exist in catalog.
    """
    normalized_action = str(action).lower().strip()
    if normalized_action in ("stock_in", "in", "add"):
        action_type = "stock_in"
        verb = "increased"
    elif normalized_action in ("stock_out", "out", "remove", "deduct"):
        action_type = "stock_out"
        verb = "decreased"
    else:
        raise ValueError(f"Invalid stock action '{action}'. Must be 'stock_in' or 'stock_out'.")

    with get_db(db_path) as conn:
        cursor = conn.cursor()

        # 1. Lookup item in catalog
        cursor.execute("SELECT id, name, unit FROM items WHERE id = ?;", (int(item_id),))
        item_row = cursor.fetchone()
        if not item_row:
            raise KeyError(f"Product ID {item_id} not found in catalog.")

        item_name = item_row["name"]
        cat_unit = item_row["unit"]

        # 2. Normalize quantity
        qty_in_cat_unit = normalize_quantity_for_item(
            qty=qty,
            spoken_unit=unit,
            catalog_unit=cat_unit,
            item_name=item_name,
        )

        # 3. Lookup existing stock
        cursor.execute("SELECT quantity, low_threshold FROM stock WHERE item_id = ?;", (int(item_id),))
        stock_row = cursor.fetchone()
        if not stock_row:
            raise KeyError(f"Stock record for item #{item_id} ({item_name}) not found.")

        current_qty = float(stock_row["quantity"])

        # 4. Check negative stock constraint on stock_out
        if action_type == "stock_out":
            if current_qty < qty_in_cat_unit:
                curr_disp = _format_num(current_qty)
                req_disp = _format_num(qty_in_cat_unit)
                raise ValueError(
                    f"Cannot reduce {req_disp} {cat_unit} of {item_name}. "
                    f"Current stock is only {curr_disp} {cat_unit}."
                )
            new_qty = _format_num(current_qty - qty_in_cat_unit)
        else:
            new_qty = _format_num(current_qty + qty_in_cat_unit)

        # 5. Atomically update stock record
        cursor.execute(
            "UPDATE stock SET quantity = ? WHERE item_id = ?;",
            (new_qty, int(item_id)),
        )

    delta_disp = _format_num(qty_in_cat_unit)
    new_disp = _format_num(new_qty)
    message = f"{item_name} stock {verb} by {delta_disp} {cat_unit}. New stock: {new_disp} {cat_unit}."

    return {
        "item_id": int(item_id),
        "name": item_name,
        "action": action_type,
        "delta": delta_disp,
        "previous_quantity": _format_num(current_qty),
        "new_quantity": new_disp,
        "unit": cat_unit,
        "message": message,
    }


def adjust_stock_items(
    items: list[dict[str, Any]],
    action: str = "stock_in",
    db_path: str | Path | None = None,
) -> dict[str, Any]:
    """Atomically adjust stock for one or more items in a single transaction.

    If any item validation fails (e.g. insufficient stock), rolls back completely.
    """
    if not items:
        raise ValueError("No items provided for stock adjustment.")

    normalized_action = str(action).lower().strip()
    if normalized_action in ("stock_in", "in", "add"):
        action_type = "stock_in"
        verb = "increased"
    elif normalized_action in ("stock_out", "out", "remove", "deduct"):
        action_type = "stock_out"
        verb = "decreased"
    else:
        raise ValueError(f"Invalid stock action '{action}'. Must be 'stock_in' or 'stock_out'.")

    results = []
    messages = []

    with get_db(db_path) as conn:
        cursor = conn.cursor()

        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Item entry at index {idx} must be a dictionary.")

            raw_id = item.get("item_id")
            if raw_id is None:
                raise ValueError(f"Item at index {idx} is missing 'item_id'.")

            item_id = int(raw_id)
            cursor.execute("SELECT id, name, unit FROM items WHERE id = ?;", (item_id,))
            item_row = cursor.fetchone()
            if not item_row:
                raise KeyError(f"Product ID {item_id} not found in catalog.")

            item_name = item_row["name"]
            cat_unit = item_row["unit"]

            raw_qty = item.get("qty", item.get("quantity"))
            if raw_qty is None:
                raise ValueError(f"Missing quantity for {item_name}.")

            qty_in_cat_unit = normalize_quantity_for_item(
                qty=raw_qty,
                spoken_unit=item.get("unit"),
                catalog_unit=cat_unit,
                item_name=item_name,
            )

            cursor.execute("SELECT quantity, low_threshold FROM stock WHERE item_id = ?;", (item_id,))
            stock_row = cursor.fetchone()
            if not stock_row:
                raise KeyError(f"Stock record for item #{item_id} ({item_name}) not found.")

            current_qty = float(stock_row["quantity"])

            if action_type == "stock_out":
                if current_qty < qty_in_cat_unit:
                    curr_disp = _format_num(current_qty)
                    req_disp = _format_num(qty_in_cat_unit)
                    raise ValueError(
                        f"Cannot reduce {req_disp} {cat_unit} of {item_name}. "
                        f"Current stock is only {curr_disp} {cat_unit}."
                    )
                new_qty = _format_num(current_qty - qty_in_cat_unit)
            else:
                new_qty = _format_num(current_qty + qty_in_cat_unit)

            cursor.execute(
                "UPDATE stock SET quantity = ? WHERE item_id = ?;",
                (new_qty, item_id),
            )

            delta_disp = _format_num(qty_in_cat_unit)
            new_disp = _format_num(new_qty)
            msg = f"{item_name} stock {verb} by {delta_disp} {cat_unit}. New stock: {new_disp} {cat_unit}."
            messages.append(msg)

            results.append({
                "item_id": item_id,
                "name": item_name,
                "action": action_type,
                "delta": delta_disp,
                "previous_quantity": _format_num(current_qty),
                "new_quantity": new_disp,
                "unit": cat_unit,
                "message": msg,
            })

    return {
        "action": action_type,
        "results": results,
        "message": " ".join(messages),
    }
