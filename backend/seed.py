import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.db import init_db, get_db

DEFAULT_ITEMS_FILE = PROJECT_ROOT / "data" / "items.json"


def validate_item_data(item: dict[str, Any], index: int) -> dict[str, Any]:
    """Validate that item dictionary contains all necessary fields with correct types."""
    if not isinstance(item, dict):
        raise ValueError(f"Item at index {index} is not a valid JSON object: {item}")

    for req_field in ("id", "name", "unit", "price"):
        if req_field not in item:
            raise ValueError(f"Item at index {index} is missing required field '{req_field}': {item}")

    try:
        item_id = int(item["id"])
    except (ValueError, TypeError):
        raise ValueError(f"Item at index {index} has invalid non-integer id: {item.get('id')}")

    name = str(item["name"]).strip()
    if not name:
        raise ValueError(f"Item at index {index} has empty name")

    unit = str(item["unit"]).strip()
    if not unit:
        raise ValueError(f"Item at index {index} has empty unit")

    try:
        price = float(item["price"])
        if price < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError(f"Item at index {index} has invalid price: {item.get('price')}")

    # Format synonyms as comma-separated string if list
    synonyms_raw = item.get("synonyms", "")
    if isinstance(synonyms_raw, list):
        synonyms = ",".join(str(s).strip() for s in synonyms_raw if s)
    else:
        synonyms = str(synonyms_raw).strip()

    # Starting stock and low threshold
    starting_stock_val = item.get("starting_stock", item.get("quantity", item.get("stock", 0.0)))
    try:
        quantity = float(starting_stock_val)
    except (ValueError, TypeError):
        raise ValueError(f"Item at index {index} has invalid quantity: {starting_stock_val}")

    low_threshold_val = item.get("low_threshold", item.get("low_stock_threshold", 5.0))
    try:
        low_threshold = float(low_threshold_val)
    except (ValueError, TypeError):
        raise ValueError(f"Item at index {index} has invalid low_threshold: {low_threshold_val}")

    return {
        "id": item_id,
        "name": name,
        "synonyms": synonyms,
        "unit": unit,
        "price": price,
        "quantity": quantity,
        "low_threshold": low_threshold,
    }


def seed_database(
    items_path: str | Path = DEFAULT_ITEMS_FILE,
    db_path: str | Path | None = None,
    reset_demo: bool = False,
) -> int:
    """Seed catalogue items and starting stock into the SQLite database.

    If reset_demo is True, existing catalogue items and stock are reset to initial values.
    Existing sales history and corrections are preserved.
    """
    path = Path(items_path)
    if not path.is_file():
        raise FileNotFoundError(f"Catalogue file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"Expected a list of items in {path}, got {type(data).__name__}")

    # Ensure tables exist
    init_db(db_path)

    validated_items = [validate_item_data(item, idx) for idx, item in enumerate(data)]

    # Check for duplicate IDs in source file
    ids = [item["id"] for item in validated_items]
    if len(ids) != len(set(ids)):
        duplicates = [x for x in ids if ids.count(x) > 1]
        raise ValueError(f"Duplicate product IDs detected in catalogue: {set(duplicates)}")

    with get_db(db_path) as conn:
        if reset_demo:
            # Clean demo reset: clear items and stock only, keeping sales and corrections intact
            conn.execute("DELETE FROM stock;")
            conn.execute("DELETE FROM items;")

        for item in validated_items:
            # Insert or update items table
            conn.execute(
                """
                INSERT INTO items (id, name, synonyms, unit, price)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    synonyms = excluded.synonyms,
                    unit = excluded.unit,
                    price = excluded.price;
                """,
                (item["id"], item["name"], item["synonyms"], item["unit"], item["price"]),
            )

            # Insert or update stock table
            conn.execute(
                """
                INSERT INTO stock (item_id, quantity, low_threshold)
                VALUES (?, ?, ?)
                ON CONFLICT(item_id) DO UPDATE SET
                    quantity = excluded.quantity,
                    low_threshold = excluded.low_threshold;
                """,
                (item["id"], item["quantity"], item["low_threshold"]),
            )

    return len(validated_items)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Hisab Kitab database with catalogue items.")
    parser.add_argument(
        "--file",
        type=str,
        default=str(DEFAULT_ITEMS_FILE),
        help="Path to JSON catalogue file (default: data/items.json)",
    )
    parser.add_argument(
        "--db",
        type=str,
        default=None,
        help="Path to SQLite database file",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset catalogue and stock to initial values before seeding (preserves sales/corrections)",
    )
    args = parser.parse_args()

    count = seed_database(items_path=args.file, db_path=args.db, reset_demo=args.reset)
    print(f"Successfully seeded {count} catalogue items and starting stock.")


if __name__ == "__main__":
    main()
