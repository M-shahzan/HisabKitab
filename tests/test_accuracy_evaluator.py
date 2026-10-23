"""Unit tests for Role A parser accuracy evaluator (tests.run_accuracy).

Tests evaluator logic without making live LLM API calls.
Verifies that:
- Wrong intent causes failure
- Wrong unit causes failure
- Wrong stock query item ID causes failure
- Wrong quantity causes failure
- Missing expected item or unexpected item causes failure
- Perfect matches pass
- Rows 10 and 30 from data/test_sentences.csv behave correctly
"""

import sys
from pathlib import Path
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.run_accuracy import (
    load_catalog,
    evaluate_case,
    evaluate_dataset,
    DEFAULT_CATALOG,
    DEFAULT_DATASET,
)


@pytest.fixture(scope="module")
def catalog_lookup():
    catalog, name_to_id = load_catalog(DEFAULT_CATALOG)
    return catalog, name_to_id


def test_perfect_sale_case_passes(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "1",
        "sentence": "2 kilo chawal de do",
        "expected_intent": "new_sale",
        "expected_items": "1",
        "expected_qty": "2.0",
        "expected_unit": "kg",
        "expected_query_item_id": "",
        "category": "single_sale",
    }
    mock_result = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is True
    assert reasons == []
    assert details["intent_matched"] is True
    assert details["item_matches_count"] == 1
    assert details["qty_matches_count"] == 1
    assert details["unit_matches_count"] == 1


def test_wrong_intent_fails(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "2",
        "sentence": "2 kilo chawal de do",
        "expected_intent": "new_sale",
        "expected_items": "1",
        "expected_qty": "2.0",
        "expected_unit": "kg",
        "expected_query_item_id": "",
        "category": "single_sale",
    }
    mock_result = {
        "intent": "unclear",  # Wrong intent!
        "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is False
    assert any("Intent mismatch: expected 'new_sale', got 'unclear'" in r for r in reasons)


def test_wrong_unit_fails(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "3",
        "sentence": "2 kilo chawal de do",
        "expected_intent": "new_sale",
        "expected_items": "1",
        "expected_qty": "2.0",
        "expected_unit": "kg",
        "expected_query_item_id": "",
        "category": "single_sale",
    }
    mock_result = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 2.0, "unit": "litre", "price": None}],  # Wrong unit!
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is False
    assert any("Unit mismatch for item 1: expected 'kg', got 'litre'" in r for r in reasons)


def test_wrong_quantity_fails(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "4",
        "sentence": "2 kilo chawal de do",
        "expected_intent": "new_sale",
        "expected_items": "1",
        "expected_qty": "2.0",
        "expected_unit": "kg",
        "expected_query_item_id": "",
        "category": "single_sale",
    }
    mock_result = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 1.0, "unit": "kg", "price": None}],  # Wrong qty!
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is False
    assert any("Quantity mismatch for item 1: expected 2.0, got 1.0" in r for r in reasons)


def test_wrong_stock_item_id_fails(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "26",
        "sentence": "cheeni ka kitna stock bacha hai dukaan mein",
        "expected_intent": "query_stock",
        "expected_items": "",
        "expected_qty": "",
        "expected_unit": "",
        "expected_query_item_id": "2",
        "category": "stock_query",
    }
    mock_result = {
        "intent": "query_stock",
        "items": [],
        "edit": None,
        "query_item_id": 1,  # Rice instead of Sugar (2)!
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is False
    assert any("Stock query item mismatch: expected item ID 2, got 1" in r for r in reasons)


def test_correct_stock_item_id_passes(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "26",
        "sentence": "cheeni ka kitna stock bacha hai dukaan mein",
        "expected_intent": "query_stock",
        "expected_items": "",
        "expected_qty": "",
        "expected_unit": "",
        "expected_query_item_id": "2",
        "category": "stock_query",
    }
    mock_result = {
        "intent": "query_stock",
        "items": [],
        "edit": None,
        "query_item_id": 2,  # Correct Sugar item ID!
        "unknown_words": [],
        "needs_clarification": None,
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is True
    assert reasons == []
    assert details["intent_matched"] is True
    assert details["query_item_matched"] is True


def test_row_10_unknown_product_passes(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "10",
        "sentence": "do packet maggi aur ek bottle cold drink dena",
        "expected_intent": "unclear",
        "expected_items": "",
        "expected_qty": "",
        "expected_unit": "",
        "expected_query_item_id": "",
        "category": "unknown_product",
    }
    mock_result = {
        "intent": "unclear",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["maggi", "cold drink"],
        "needs_clarification": "Maggi aur cold drink dukaan mein uplabdh nahi hain.",
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is True
    assert reasons == []


def test_row_30_mixed_sale_passes(catalog_lookup):
    catalog, name_to_id = catalog_lookup
    row = {
        "id": "30",
        "sentence": "do kilo chawal aur ek packet noodles de do",
        "expected_intent": "new_sale",
        "expected_items": "1",
        "expected_qty": "2.0",
        "expected_unit": "kg",
        "expected_query_item_id": "",
        "category": "mixed_sale",
    }
    mock_result = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["noodles"],
        "needs_clarification": "Noodles catalog mein nahi hain.",
    }
    is_exact, reasons, details = evaluate_case(row, mock_result, name_to_id)
    assert is_exact is True
    assert reasons == []


def test_evaluate_dataset_with_mock_oracle(catalog_lookup):
    """Test full dataset evaluation using a mock oracle parser that reflects expected row values."""
    catalog, name_to_id = catalog_lookup

    def mock_parser(transcript, cat, current_bill=None):
        import csv
        with open(DEFAULT_DATASET, "r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r["sentence"].strip() == transcript.strip():
                    exp_items_raw = r.get("expected_items", "")
                    exp_qtys_raw = r.get("expected_qty", "")
                    exp_units_raw = r.get("expected_unit", "")

                    from tests.run_accuracy import (
                        parse_expected_items,
                        parse_expected_quantities,
                        parse_expected_units,
                        parse_expected_query_item_id,
                    )

                    items = []
                    item_ids = parse_expected_items(exp_items_raw, name_to_id)
                    qtys = parse_expected_quantities(exp_qtys_raw)
                    units = parse_expected_units(exp_units_raw)

                    for i, it_id in enumerate(item_ids):
                        q = qtys[i] if i < len(qtys) else 1.0
                        u = units[i] if i < len(units) else "kg"
                        items.append({"item_id": it_id, "qty": q, "unit": u, "price": None})

                    query_id = parse_expected_query_item_id(r.get("expected_query_item_id"))

                    return {
                        "intent": r.get("expected_intent"),
                        "items": items,
                        "edit": None,
                        "query_item_id": query_id,
                        "unknown_words": [],
                        "needs_clarification": None,
                    }
        return {"intent": "unclear", "items": [], "edit": None, "query_item_id": None, "unknown_words": [], "needs_clarification": None}

    metrics = evaluate_dataset(DEFAULT_DATASET, catalog, name_to_id, parse_fn=mock_parser, delay_seconds=0.0)
    assert metrics["total_cases"] == 30
    assert metrics["exact_matches"] == 30
    assert metrics["exact_accuracy"] == 100.0
    assert metrics["intent_accuracy"] == 100.0
    assert metrics["item_matching_accuracy"] == 100.0
    assert metrics["quantity_accuracy"] == 100.0
    assert metrics["unit_accuracy"] == 100.0
    assert metrics["failures"] == []
    assert metrics["throttling_events"] == 0
    assert "wall_clock_time" in metrics


def test_throttle_retry_monitor_counts_429():
    import logging
    from tests.run_accuracy import ThrottleRetryMonitor

    monitor = ThrottleRetryMonitor()
    logger = logging.getLogger("test_throttle_logger")
    logger.addHandler(monitor)
    logger.setLevel(logging.INFO)

    logger.info("HTTP Request: POST https://api.groq.com/openai/v1/chat/completions 'HTTP/1.1 200 OK'")
    assert monitor.throttle_count == 0

    logger.info("HTTP Request: POST https://api.groq.com/openai/v1/chat/completions 'HTTP/1.1 429 Too Many Requests'")
    assert monitor.throttle_count == 1

    logger.info("Retrying request in 12.000000 seconds (retry 1 of 2)")
    assert monitor.throttle_count == 2

    logger.removeHandler(monitor)


def test_pacing_delay_excluded_from_call_latency(tmp_path, catalog_lookup):
    import time
    catalog, name_to_id = catalog_lookup
    csv_file = tmp_path / "tiny_dataset.csv"
    csv_file.write_text(
        "id,sentence,expected_intent,expected_items,expected_qty,expected_unit,expected_query_item_id,category\n"
        "1,2 kilo chawal de do,new_sale,1,2.0,kg,,single_sale\n"
        "2,1 kilo chini do,new_sale,2,1.0,kg,,single_sale\n",
        encoding="utf-8",
    )

    def fast_parser(transcript, cat, current_bill=None):
        time.sleep(0.04)
        item_id = 1 if "chawal" in transcript else 2
        return {
            "intent": "new_sale",
            "items": [{"item_id": item_id, "qty": 2.0 if item_id == 1 else 1.0, "unit": "kg", "price": None}],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": None,
        }

    # Run with 0.15s delay between calls
    metrics = evaluate_dataset(csv_file, catalog, name_to_id, parse_fn=fast_parser, delay_seconds=0.15)
    assert metrics["total_cases"] == 2
    # avg_latency measures strictly the 0.04s parse call
    assert metrics["avg_latency"] < 0.10
    # wall_clock_time includes the 0.15s inter-request delay
    assert metrics["wall_clock_time"] >= 0.20

