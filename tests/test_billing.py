from pathlib import Path
import pytest

from backend.db import init_db
from backend.seed import seed_database
from backend.billing import (
    bills,
    clear_bills,
    create_draft_bill,
    edit_draft_bill,
    get_bill,
)


@pytest.fixture(autouse=True)
def clean_in_memory_bills():
    """Ensure in-memory draft bills dictionary is cleared before and after each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def seeded_db(tmp_path: Path) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_billing.db"
    seed_database(db_path=db_file)
    return db_file


def test_create_bill_single_item(seeded_db: Path):
    """1. Creating a bill with one item."""
    # Item 1 is Rice (unit: kg, catalog price: 60)
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 2}],
        db_path=seeded_db,
    )

    assert bill["status"] == "draft"
    assert bill["bill_id"].startswith("b")
    assert len(bill["lines"]) == 1

    line = bill["lines"][0]
    assert line["item_id"] == 1
    assert line["name"] == "Rice"
    assert line["qty"] == 2
    assert line["unit"] == "kg"
    assert line["unit_price"] == 60
    assert line["amount"] == 120
    assert bill["total"] == 120


def test_create_bill_multiple_items(seeded_db: Path):
    """2. Creating a bill with multiple items."""
    # Item 1 (Rice, 60), Item 2 (Sugar, 42), Item 10 (Tea, 90)
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 1},
            {"item_id": 2, "qty": 2},
            {"item_id": 10, "qty": 1},
        ],
        db_path=seeded_db,
    )

    assert len(bill["lines"]) == 3
    # 1*60 + 2*42 + 1*90 = 60 + 84 + 90 = 234
    assert bill["total"] == 234

    names = [l["name"] for l in bill["lines"]]
    assert names == ["Rice", "Sugar", "Tea"]


def test_line_amounts_and_total_calculation(seeded_db: Path):
    """3. Correct line amounts and total calculation with fractional quantities."""
    # Item 1 (Rice at 60/kg, qty: 1.5 -> amount: 90)
    # Item 18 (Onion at 35/kg, qty: 2.5 -> amount: 87.5)
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 1.5},
            {"item_id": 18, "qty": 2.5},
        ],
        db_path=seeded_db,
    )

    lines = {l["item_id"]: l for l in bill["lines"]}
    assert lines[1]["amount"] == 90
    assert lines[18]["amount"] == 87.5
    assert bill["total"] == 177.5


def test_catalogue_price_used_when_no_explicit_price(seeded_db: Path):
    """4. Using catalogue prices when no explicit price is supplied."""
    # Item 3 is Toor Dal (price: 140)
    bill = create_draft_bill(
        items=[{"item_id": 3, "qty": 1, "price": None}],
        db_path=seeded_db,
    )

    line = bill["lines"][0]
    assert line["unit_price"] == 140
    assert line["amount"] == 140


def test_explicit_price_applied_according_to_rule(seeded_db: Path):
    """5. Applying an explicit price according to the documented rule.

    Rule: Spoken/explicit price represents the unit price override for that item.
    """
    # Item 1 is Rice (catalogue price 60). Shopkeeper speaks explicit price of 65.
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 3, "price": 65}],
        db_path=seeded_db,
    )

    line = bill["lines"][0]
    assert line["unit_price"] == 65
    assert line["amount"] == 195
    assert bill["total"] == 195


def test_edit_quantity_and_recalculate_totals(seeded_db: Path):
    """6. Editing a quantity and recalculating totals."""
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 2}],  # Rice 2 * 60 = 120
        db_path=seeded_db,
    )
    bill_id = bill["bill_id"]

    updated = edit_draft_bill(
        bill_id=bill_id,
        edit={"action": "set_qty", "item_id": 1, "value": 5},
    )

    assert updated["lines"][0]["qty"] == 5
    assert updated["lines"][0]["amount"] == 300
    assert updated["total"] == 300

    # Verify persisted in-memory bill is updated
    assert get_bill(bill_id)["total"] == 300


def test_edit_price_and_recalculate_totals(seeded_db: Path):
    """7. Editing a price and recalculating totals."""
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 2}],  # Rice 2 * 60 = 120
        db_path=seeded_db,
    )
    bill_id = bill["bill_id"]

    updated = edit_draft_bill(
        bill_id=bill_id,
        edit={"action": "set_price", "item_id": 1, "value": 55},
    )

    assert updated["lines"][0]["unit_price"] == 55
    assert updated["lines"][0]["amount"] == 110
    assert updated["total"] == 110


def test_remove_line_and_recalculate_totals(seeded_db: Path):
    """8. Removing a line and recalculating totals."""
    bill = create_draft_bill(
        items=[
            {"item_id": 1, "qty": 2},   # 2 * 60 = 120
            {"item_id": 2, "qty": 1},   # 1 * 42 = 42
        ],
        db_path=seeded_db,
    )
    bill_id = bill["bill_id"]
    assert bill["total"] == 162

    # Remove Item 1 (Rice)
    updated = edit_draft_bill(
        bill_id=bill_id,
        edit={"action": "remove", "item_id": 1},
    )

    assert len(updated["lines"]) == 1
    assert updated["lines"][0]["item_id"] == 2
    assert updated["total"] == 42


def test_reject_unknown_item_id_and_invalid_quantity(seeded_db: Path):
    """9. Rejecting unknown item IDs and invalid quantities."""
    # Unknown item_id 9999
    with pytest.raises(ValueError, match="Unknown item_id 9999"):
        create_draft_bill(
            items=[{"item_id": 9999, "qty": 1}],
            db_path=seeded_db,
        )

    # Invalid non-positive quantity
    with pytest.raises(ValueError, match="Invalid quantity"):
        create_draft_bill(
            items=[{"item_id": 1, "qty": 0}],
            db_path=seeded_db,
        )

    # Negative quantity
    with pytest.raises(ValueError, match="Invalid quantity"):
        create_draft_bill(
            items=[{"item_id": 1, "qty": -3}],
            db_path=seeded_db,
        )

    # Empty items list
    with pytest.raises(ValueError, match="Cannot create a draft bill with no items"):
        create_draft_bill(items=[], db_path=seeded_db)


def test_reject_invalid_edits_without_corrupting_draft(seeded_db: Path):
    """10. Rejecting invalid edits without corrupting the draft."""
    bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 2}],  # 2 * 60 = 120
        db_path=seeded_db,
    )
    bill_id = bill["bill_id"]

    # Invalid edit action
    with pytest.raises(ValueError, match="Unknown edit action"):
        edit_draft_bill(bill_id, {"action": "invalid_action", "item_id": 1, "value": 5})

    # Setting negative quantity should fail
    with pytest.raises(ValueError, match="Invalid quantity value"):
        edit_draft_bill(bill_id, {"action": "set_qty", "item_id": 1, "value": -1})

    # Setting price on non-existent item in bill
    with pytest.raises(KeyError, match="not in bill"):
        edit_draft_bill(bill_id, {"action": "set_price", "item_id": 99, "value": 50})

    # Non-existent bill ID
    with pytest.raises(KeyError, match="not found"):
        edit_draft_bill("non_existent_bill", {"action": "set_qty", "item_id": 1, "value": 3})

    # Removal of non-existent item safely leaves draft uncorrupted
    result = edit_draft_bill(bill_id, {"action": "remove", "item_id": 99})
    assert result["total"] == 120
    assert len(result["lines"]) == 1

    # Verify the original draft remained completely intact and valid
    preserved_bill = get_bill(bill_id)
    assert preserved_bill["total"] == 120
    assert len(preserved_bill["lines"]) == 1
    assert preserved_bill["lines"][0]["qty"] == 2


def test_bills_isolation(seeded_db: Path):
    """11. Keeping separate bills isolated."""
    bill_1 = create_draft_bill(
        items=[{"item_id": 1, "qty": 1}],
        db_path=seeded_db,
    )
    bill_2 = create_draft_bill(
        items=[{"item_id": 2, "qty": 2}],
        db_path=seeded_db,
    )

    assert bill_1["bill_id"] != bill_2["bill_id"]

    # Modify bill 1
    edit_draft_bill(bill_1["bill_id"], {"action": "set_qty", "item_id": 1, "value": 4})

    # Verify bill 2 is completely unaffected
    bill_2_current = get_bill(bill_2["bill_id"])
    assert bill_2_current["lines"][0]["item_id"] == 2
    assert bill_2_current["lines"][0]["qty"] == 2
    assert bill_2_current["total"] == 84
