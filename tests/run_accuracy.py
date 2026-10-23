"""Hisab Kitab: Parser Accuracy Evaluation Script (Role A).

Evaluates the natural language parser (backend.parser.parse) against the dataset
in data/test_sentences.csv, computing intent accuracy, item-matching accuracy,
quantity accuracy, unit accuracy, full exact-case accuracy, average latency,
total benchmark wall-clock time, throttling event counts, and detailed failure diagnostics.

Usage:
    python tests/run_accuracy.py
    python tests/run_accuracy.py data/test_sentences.csv
    python tests/run_accuracy.py data/test_sentences.csv --delay 2.0
"""

import argparse
import csv
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv

# Reliably load .env
_ENV_PATH = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

DEFAULT_DATASET = PROJECT_ROOT / "data" / "test_sentences.csv"
DEFAULT_CATALOG = PROJECT_ROOT / "data" / "items.json"
RESULTS_HISTORY = PROJECT_ROOT / "tests" / "accuracy_history.json"
DEFAULT_DELAY_SECONDS = float(os.getenv("PARSER_BENCHMARK_DELAY", "2.0"))


class ThrottleRetryMonitor(logging.Handler):
    """Thread-safe logging handler to count HTTP 429 throttling and SDK retry attempts without exposing secrets."""

    def __init__(self) -> None:
        super().__init__()
        self.throttle_count = 0

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = str(record.getMessage())
            if "429" in msg or "status error: 429" in msg or "Retrying request in" in msg:
                self.throttle_count += 1
        except Exception:
            pass


def load_catalog(catalog_path: Path = DEFAULT_CATALOG) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """Load catalog items and build a name/synonym lookup table."""
    if not catalog_path.is_file():
        raise FileNotFoundError(f"Catalog file not found at: {catalog_path}")

    with open(catalog_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not isinstance(items, list):
        raise ValueError(f"Catalog must contain a list of items, got {type(items).__name__}")

    name_to_id: Dict[str, int] = {}
    for it in items:
        if not isinstance(it, dict) or "id" not in it:
            continue
        item_id = int(it["id"])
        name = str(it.get("name", "")).strip().lower()
        if name:
            name_to_id[name] = item_id

        synonyms = [s.strip().lower() for s in str(it.get("synonyms", "")).split(",") if s.strip()]
        for syn in synonyms:
            if syn and syn not in name_to_id:
                name_to_id[syn] = item_id

    return items, name_to_id


def parse_expected_items(
    items_val: Any,
    name_to_id: Dict[str, int],
) -> List[int]:
    """Parse comma/semicolon-separated item IDs or product names into item ID integers."""
    raw = str(items_val or "").strip()
    if not raw or raw.lower() in ("none", "null", "[]"):
        return []

    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = json.loads(raw)
            ids = []
            for elem in parsed:
                if isinstance(elem, int):
                    ids.append(elem)
                elif isinstance(elem, dict) and "item_id" in elem:
                    ids.append(int(elem["item_id"]))
                elif isinstance(elem, str) and elem.strip().lower() in name_to_id:
                    ids.append(name_to_id[elem.strip().lower()])
            return ids
        except (json.JSONDecodeError, ValueError):
            pass

    delimiters = [",", ";", "|"]
    for d in delimiters[1:]:
        raw = raw.replace(d, ",")

    tokens = [t.strip() for t in raw.split(",") if t.strip()]
    result_ids: List[int] = []
    for token in tokens:
        if token.isdigit():
            result_ids.append(int(token))
        else:
            low = token.lower()
            if low in name_to_id:
                result_ids.append(name_to_id[low])
            else:
                try:
                    result_ids.append(int(token))
                except ValueError:
                    pass
    return result_ids


def parse_expected_quantities(qty_val: Any) -> List[float]:
    """Parse comma/semicolon-separated quantity numbers into float values."""
    raw = str(qty_val or "").strip()
    if not raw or raw.lower() in ("none", "null", "[]"):
        return []

    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = json.loads(raw)
            return [float(q) for q in parsed if q is not None]
        except (json.JSONDecodeError, ValueError):
            pass

    delimiters = [",", ";", "|"]
    for d in delimiters[1:]:
        raw = raw.replace(d, ",")

    tokens = [t.strip() for t in raw.split(",") if t.strip()]
    quantities: List[float] = []
    for t in tokens:
        try:
            quantities.append(float(t))
        except ValueError:
            pass
    return quantities


def parse_expected_units(unit_val: Any) -> List[str]:
    """Parse comma/semicolon-separated units into lowercase string list."""
    raw = str(unit_val or "").strip()
    if not raw or raw.lower() in ("none", "null", "[]"):
        return []

    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = json.loads(raw)
            return [str(u).strip().lower() for u in parsed if u]
        except (json.JSONDecodeError, ValueError):
            pass

    delimiters = [",", ";", "|"]
    for d in delimiters[1:]:
        raw = raw.replace(d, ",")

    return [t.strip().lower() for t in raw.split(",") if t.strip()]


def parse_expected_query_item_id(val: Any) -> Optional[int]:
    """Parse single expected query item ID if present."""
    if val is None:
        return None
    raw = str(val).strip()
    if not raw or raw.lower() in ("none", "null", "[]", ""):
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def evaluate_case(
    row: Dict[str, Any],
    result: Dict[str, Any],
    name_to_id: Dict[str, int],
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """Evaluate a parser result dictionary against expected values from a dataset row.

    Returns:
        is_exact: True if no discrepancies found, False otherwise.
        reasons: List of human-readable diagnostic failure descriptions.
        details: Dictionary containing parsed expectations and match flags.
    """
    reasons: List[str] = []

    # 1. Parse expectations
    exp_item_ids = parse_expected_items(row.get("expected_items"), name_to_id)
    exp_qtys = parse_expected_quantities(row.get("expected_qty"))
    exp_units = parse_expected_units(row.get("expected_unit"))
    exp_query_id = parse_expected_query_item_id(row.get("expected_query_item_id"))

    # Determine expected intent
    exp_intent = str(row.get("expected_intent") or "").strip().lower()
    if not exp_intent:
        cat = str(row.get("category") or "").strip().lower()
        if cat in ("confirm", "cancel", "query_summary", "query_stock", "unclear"):
            exp_intent = cat
        else:
            exp_intent = "new_sale" if exp_item_ids else cat

    # 2. Extract predictions
    pred_intent = str(result.get("intent") or "").strip().lower()
    pred_items = result.get("items") or []
    if not isinstance(pred_items, list):
        pred_items = []
    pred_item_ids = [it["item_id"] for it in pred_items if isinstance(it, dict) and "item_id" in it]
    pred_query_id = result.get("query_item_id")

    # 3. Validate intent
    intent_matched = (pred_intent == exp_intent)
    if not intent_matched:
        reasons.append(f"Intent mismatch: expected '{exp_intent}', got '{pred_intent}'")

    # 4. Validate stock query target
    query_item_matched = True
    if exp_intent == "query_stock" or exp_query_id is not None:
        if exp_query_id is not None:
            if pred_query_id != exp_query_id:
                query_item_matched = False
                reasons.append(
                    f"Stock query item mismatch: expected item ID {exp_query_id}, got {pred_query_id}"
                )

    # 5. Validate items, quantities, and units
    item_matches_count = 0
    qty_matches_count = 0
    unit_matches_count = 0

    if exp_item_ids:
        for idx_item, exp_id in enumerate(exp_item_ids):
            exp_q = exp_qtys[idx_item] if idx_item < len(exp_qtys) else None
            exp_u = exp_units[idx_item] if idx_item < len(exp_units) else None

            matching_pred = [p for p in pred_items if isinstance(p, dict) and p.get("item_id") == exp_id]
            if matching_pred:
                item_matches_count += 1
                p_match = matching_pred[0]

                # Check quantity
                if exp_q is not None:
                    pred_q = p_match.get("qty")
                    if pred_q is not None and abs(float(pred_q) - float(exp_q)) < 0.01:
                        qty_matches_count += 1
                    else:
                        reasons.append(
                            f"Quantity mismatch for item {exp_id}: expected {exp_q}, got {pred_q}"
                        )

                # Check unit
                if exp_u:
                    pred_u = str(p_match.get("unit", "")).strip().lower()
                    if pred_u == exp_u:
                        unit_matches_count += 1
                    else:
                        reasons.append(
                            f"Unit mismatch for item {exp_id}: expected '{exp_u}', got '{pred_u}'"
                        )
            else:
                reasons.append(f"Missing expected item ID {exp_id}")

        # Check for unexpected extra items
        for p_id in pred_item_ids:
            if p_id not in exp_item_ids:
                reasons.append(f"Unexpected item ID {p_id} predicted")
    else:
        # Non-sale or pure unknown request: no sale items should be predicted
        if pred_item_ids:
            reasons.append(f"Unexpected items predicted for non-sale sentence: {pred_item_ids}")

    is_exact = (len(reasons) == 0)

    details = {
        "exp_intent": exp_intent,
        "exp_item_ids": exp_item_ids,
        "exp_qtys": exp_qtys,
        "exp_units": exp_units,
        "exp_query_id": exp_query_id,
        "intent_matched": intent_matched,
        "query_item_matched": query_item_matched,
        "item_matches_count": item_matches_count,
        "qty_matches_count": qty_matches_count,
        "unit_matches_count": unit_matches_count,
    }
    return is_exact, reasons, details


def evaluate_dataset(
    dataset_path: Path,
    catalog: List[Dict[str, Any]],
    name_to_id: Dict[str, int],
    parse_fn: Optional[Callable[[str, List[Dict[str, Any]], Optional[Dict[str, Any]]], Dict[str, Any]]] = None,
    delay_seconds: float = DEFAULT_DELAY_SECONDS,
) -> Dict[str, Any]:
    """Run accuracy benchmark against a dataset file and return metrics and failures.

    Args:
        dataset_path: Path to dataset CSV.
        catalog: List of items from items.json.
        name_to_id: Item name/synonym lookup dictionary.
        parse_fn: Optional callable replacing default backend.parser.parse for hermetic testing.
        delay_seconds: Pacing delay between sequential live calls (default: 2.0s). Excluded from per-call latency.
    """
    if parse_fn is None:
        from backend.parser import parse as parse_fn

    with open(dataset_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        return {
            "total_cases": 0,
            "message": f"Dataset at {dataset_path} contains 0 test rows.",
            "intent_accuracy": 0.0,
            "item_matching_accuracy": 0.0,
            "quantity_accuracy": 0.0,
            "unit_accuracy": 0.0,
            "exact_accuracy": 0.0,
            "avg_latency": 0.0,
            "wall_clock_time": 0.0,
            "throttling_events": 0,
            "inter_request_delay": delay_seconds,
            "failures": [],
        }

    # Attach throttling and retry monitor safely to HTTP client loggers
    monitor = ThrottleRetryMonitor()
    httpx_logger = logging.getLogger("httpx")
    openai_logger = logging.getLogger("openai._base_client")

    orig_httpx_level = httpx_logger.level
    orig_openai_level = openai_logger.level

    httpx_logger.setLevel(logging.INFO)
    openai_logger.setLevel(logging.INFO)
    httpx_logger.addHandler(monitor)
    openai_logger.addHandler(monitor)

    total_cases = len(rows)
    total_matched_intents = 0
    total_expected_items = 0
    total_matched_items = 0
    total_quantity_evaluated = 0
    total_matched_quantities = 0
    total_unit_evaluated = 0
    total_matched_units = 0
    exact_matches = 0
    total_latency = 0.0
    failures: List[Dict[str, Any]] = []

    benchmark_wall_start = time.time()

    print(f"\nEvaluating {total_cases} test sentences from: {dataset_path}")
    if delay_seconds > 0:
        print(f"Pacing delay enabled: {delay_seconds}s between live requests (excluded from per-call latency)")
    print("=" * 70)

    try:
        for idx, row in enumerate(rows, start=1):
            case_id = row.get("id") or str(idx)
            sentence = str(row.get("sentence", "")).strip()
            category = str(row.get("category", "")).strip().lower()

            if not sentence:
                continue

            # Time ONLY the parser invocation strictly
            start_time = time.time()
            try:
                result = parse_fn(sentence, catalog, None)
                elapsed = time.time() - start_time
            except Exception as exc:
                elapsed = time.time() - start_time
                err_msg = str(exc)
                # Never print secrets
                api_key = os.getenv("LLM_API_KEY")
                if api_key and api_key in err_msg:
                    err_msg = err_msg.replace(api_key, "[REDACTED]")

                failures.append({
                    "id": case_id,
                    "sentence": sentence,
                    "error": err_msg,
                    "expected": {
                        "intent": row.get("expected_intent"),
                        "items": row.get("expected_items"),
                        "qty": row.get("expected_qty"),
                        "unit": row.get("expected_unit"),
                        "query_item_id": row.get("expected_query_item_id"),
                    },
                    "actual": None,
                    "reasons": [f"Parser error: {err_msg}"],
                })
                total_latency += elapsed

                if delay_seconds > 0 and idx < total_cases:
                    time.sleep(delay_seconds)
                continue

            total_latency += elapsed

            is_exact, case_reasons, details = evaluate_case(row, result, name_to_id)

            # Update metric counters
            if details["intent_matched"]:
                total_matched_intents += 1

            exp_items = details["exp_item_ids"]
            total_expected_items += len(exp_items)
            total_matched_items += details["item_matches_count"]

            exp_qtys = details["exp_qtys"]
            total_quantity_evaluated += len(exp_qtys)
            total_matched_quantities += details["qty_matches_count"]

            exp_units = details["exp_units"]
            total_unit_evaluated += len(exp_units)
            total_matched_units += details["unit_matches_count"]

            if is_exact:
                exact_matches += 1
                print(f"[{case_id}] PASS ({round(elapsed, 2)}s): {sentence}")
            else:
                print(f"[{case_id}] FAIL ({round(elapsed, 2)}s): {sentence}")
                for r in case_reasons:
                    print(f"       * {r}")
                failures.append({
                    "id": case_id,
                    "sentence": sentence,
                    "expected": {
                        "intent": details["exp_intent"],
                        "items": details["exp_item_ids"],
                        "qty": details["exp_qtys"],
                        "unit": details["exp_units"],
                        "query_item_id": details["exp_query_id"],
                        "category": category,
                    },
                    "actual": {
                        "intent": result.get("intent"),
                        "items": result.get("items"),
                        "query_item_id": result.get("query_item_id"),
                        "edit": result.get("edit"),
                    },
                    "reasons": case_reasons,
                })

            # Pacing delay between calls (outside timed block, only before next item)
            if delay_seconds > 0 and idx < total_cases:
                time.sleep(delay_seconds)

    finally:
        # Clean up logging handlers safely
        httpx_logger.removeHandler(monitor)
        openai_logger.removeHandler(monitor)
        httpx_logger.setLevel(orig_httpx_level)
        openai_logger.setLevel(orig_openai_level)

    wall_clock_time = round(time.time() - benchmark_wall_start, 2)
    intent_accuracy = round((total_matched_intents / total_cases) * 100, 2) if total_cases > 0 else 0.0
    item_accuracy = (
        round((total_matched_items / total_expected_items) * 100, 2)
        if total_expected_items > 0
        else (100.0 if not failures else 0.0)
    )
    quantity_accuracy = (
        round((total_matched_quantities / total_quantity_evaluated) * 100, 2)
        if total_quantity_evaluated > 0
        else 100.0
    )
    unit_accuracy = (
        round((total_matched_units / total_unit_evaluated) * 100, 2)
        if total_unit_evaluated > 0
        else 100.0
    )
    exact_accuracy = round((exact_matches / total_cases) * 100, 2) if total_cases > 0 else 0.0
    avg_latency = round(total_latency / total_cases, 2) if total_cases > 0 else 0.0

    return {
        "total_cases": total_cases,
        "exact_matches": exact_matches,
        "intent_accuracy": intent_accuracy,
        "item_matching_accuracy": item_accuracy,
        "quantity_accuracy": quantity_accuracy,
        "unit_accuracy": unit_accuracy,
        "exact_accuracy": exact_accuracy,
        "avg_latency": avg_latency,
        "wall_clock_time": wall_clock_time,
        "throttling_events": monitor.throttle_count,
        "inter_request_delay": delay_seconds,
        "failures": failures,
    }


def save_history(metrics: Dict[str, Any]) -> None:
    """Save benchmark run metrics to accuracy history file."""
    history = []
    if RESULTS_HISTORY.is_file():
        try:
            with open(RESULTS_HISTORY, "r", encoding="utf-8") as f:
                history = json.load(f)
            if not isinstance(history, list):
                history = []
        except Exception:
            history = []

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": os.getenv("LLM_MODEL", "openai/gpt-oss-20b"),
        "total_cases": metrics.get("total_cases", 0),
        "exact_matches": metrics.get("exact_matches", 0),
        "intent_accuracy": metrics.get("intent_accuracy", 0.0),
        "item_matching_accuracy": metrics.get("item_matching_accuracy", 0.0),
        "quantity_accuracy": metrics.get("quantity_accuracy", 0.0),
        "unit_accuracy": metrics.get("unit_accuracy", 0.0),
        "exact_accuracy": metrics.get("exact_accuracy", 0.0),
        "avg_latency": metrics.get("avg_latency", 0.0),
        "wall_clock_time": metrics.get("wall_clock_time", 0.0),
        "throttling_events": metrics.get("throttling_events", 0),
        "failures_count": len(metrics.get("failures", [])),
    }
    history.append(record)
    try:
        with open(RESULTS_HISTORY, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass


def main() -> None:
    arg_parser = argparse.ArgumentParser(description="Evaluate natural language parser accuracy for Hisab Kitab.")
    arg_parser.add_argument("dataset", nargs="?", default=str(DEFAULT_DATASET), help="Path to test sentences CSV")
    arg_parser.add_argument(
        "--delay",
        "-d",
        type=float,
        default=DEFAULT_DELAY_SECONDS,
        help="Pacing delay in seconds between sequential live parser requests (default: 2.0s)",
    )
    args = arg_parser.parse_args()

    # 1. Check API Key
    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        print("ERROR: LLM_API_KEY is not set in environment or project .env.")
        print("Cannot run accuracy evaluation without LLM API.")
        sys.exit(1)

    # 2. Check Dataset Path
    dataset_path = Path(args.dataset)
    if not dataset_path.is_file():
        print(f"ERROR: Dataset file not found at: {dataset_path}")
        print("Please provide a valid dataset path (e.g. data/test_sentences.csv).")
        sys.exit(1)

    # 3. Check Catalog
    try:
        catalog, name_to_id = load_catalog(DEFAULT_CATALOG)
    except Exception as exc:
        print(f"ERROR loading catalog: {exc}")
        sys.exit(1)

    # 4. Check Dataset contents
    with open(dataset_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print(f"DATASET EMPTY: Dataset '{dataset_path}' has a header but contains 0 test rows.")
        print("Accuracy evaluation cannot run on an empty dataset.")
        print("Add test rows to data/test_sentences.csv to run evaluations.")
        sys.exit(0)

    # 5. Run Evaluation
    results = evaluate_dataset(
        dataset_path=dataset_path,
        catalog=catalog,
        name_to_id=name_to_id,
        delay_seconds=args.delay,
    )

    # 6. Report Results
    print("\n" + "=" * 70)
    print("PARSER ACCURACY EVALUATION RESULTS")
    print("=" * 70)
    print(f"Total Test Cases Evaluated : {results['total_cases']}")
    print(f"Exact Full-Case Matches    : {results['exact_matches']}/{results['total_cases']} ({results['exact_accuracy']}%)")
    print(f"Intent Accuracy            : {results['intent_accuracy']}%")
    print(f"Item-Matching Accuracy     : {results['item_matching_accuracy']}%")
    print(f"Quantity Accuracy          : {results['quantity_accuracy']}%")
    print(f"Unit Accuracy              : {results['unit_accuracy']}%")
    print(f"Average Parser Latency     : {results['avg_latency']}s per sentence (API call only)")
    print(f"Total Benchmark Duration   : {results['wall_clock_time']}s wall-clock time")
    print(f"Pacing Delay Between Calls : {results['inter_request_delay']}s")
    print(f"Throttling / Retry Events  : {results['throttling_events']}")
    print(f"Total Failures             : {len(results['failures'])}")

    if results["failures"]:
        print("\n" + "-" * 70)
        print("FAILURE DIAGNOSTICS:")
        print("-" * 70)
        for idx, fail in enumerate(results["failures"], start=1):
            print(f"\nFailure #{idx} [ID: {fail.get('id')}]:")
            print(f"  Transcript : \"{fail.get('sentence')}\"")
            print(f"  Expected   : {fail.get('expected')}")
            print(f"  Actual     : {fail.get('actual')}")
            print("  Reasons    :")
            for r in fail.get("reasons", []):
                print(f"    - {r}")

    # 7. Persist to history
    save_history(results)
    print("\nEvaluation complete. Run record saved to tests/accuracy_history.json.")


if __name__ == "__main__":
    main()
