#!/usr/bin/env python3
"""
Hisab Kitab - Test Accuracy & Evaluation Harness (Role D)
Author: Member D (Pitch, Testing & Demo Lead)

Reads test utterances from data/test_sentences.csv and evaluates speech-to-text / parser
predictions against expected ground-truth triples (product, quantity, unit).
Supports language breakdown, category breakdown, bill-level accuracy, and latency metrics.
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional, Tuple


def detect_language(sentence: str) -> str:
    """Detects whether sentence is Kannada, Hindi, English, or Code-mixed."""
    has_kannada = bool(re.search(r"[\u0C80-\u0CFF]", sentence))
    has_hindi = bool(re.search(r"[\u0900-\u097F]", sentence))
    has_english = bool(re.search(r"[a-zA-Z]", sentence))

    # Known romanized Indic keywords for code-mixed detection in Latin script
    indic_roman_terms = {
        "alugadde", "eerulli", "sakkare", "maadi", "kodi", "hittu",
        "dena", "karo", "bika", "kitna", "de", "pyaz", "aloo", "roti",
        "paav", "ardha", "doodh", "chawal", "atta", "tel"
    }
    words_lower = set(re.findall(r"[a-zA-Z]+", sentence.lower()))
    has_indic_roman = bool(words_lower.intersection(indic_roman_terms))

    if has_kannada and has_english:
        return "Code-mixed (KN-EN)"
    if has_hindi and has_english:
        return "Code-mixed (HI-EN)"
    if has_kannada and has_hindi:
        return "Code-mixed (KN-HI)"
    if has_kannada:
        return "Kannada"
    if has_hindi:
        return "Hindi"
    if has_indic_roman:
        return "Code-mixed"
    return "English"


def parse_pipe_triples(items_str: str, qtys_str: str, units_str: str) -> List[Dict[str, Any]]:
    """Parses pipe-separated strings into a list of {item, quantity, unit} dicts."""
    if not items_str or items_str.strip() == "":
        return []

    items = [i.strip() for i in items_str.split("|")]
    qtys = [q.strip() for q in qtys_str.split("|")] if qtys_str else [""] * len(items)
    units = [u.strip() for u in units_str.split("|")] if units_str else [""] * len(items)

    # Pad with empty strings if counts mismatch
    while len(qtys) < len(items):
        qtys.append("")
    while len(units) < len(items):
        units.append("")

    triples = []
    for item, qty, unit in zip(items, qtys, units):
        triples.append({
            "item": item.lower(),
            "quantity": str(qty).strip(),
            "unit": unit.lower().strip()
        })
    return triples


def normalize_qty(val: Any) -> Optional[float]:
    """Helper to compare float quantities safely."""
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def match_triple(expected: Dict[str, Any], actual: Dict[str, Any]) -> bool:
    """Checks if an actual triple matches an expected triple."""
    if expected["item"] != actual.get("item", "").lower():
        return False

    exp_unit = expected["unit"]
    act_unit = actual.get("unit", "").lower()
    if exp_unit != act_unit:
        return False

    exp_qty = normalize_qty(expected["quantity"])
    act_qty = normalize_qty(actual.get("quantity"))

    if exp_qty is not None and act_qty is not None:
        return abs(exp_qty - act_qty) < 1e-4
    return str(expected["quantity"]).strip() == str(actual.get("quantity", "")).strip()


def evaluate_case(expected_triples: List[Dict[str, Any]], actual_triples: Optional[List[Dict[str, Any]]]) -> Tuple[str, int, int, bool]:
    """
    Evaluates one test case.
    Returns: (status, correct_items, total_expected_items, bill_passed)
    status can be: UNTESTED, PASSED, FAILED
    """
    if actual_triples is None:
        return "UNTESTED", 0, len(expected_triples), False

    total_expected = len(expected_triples)
    if total_expected == 0:
        # Action with no expected items (e.g. confirmation/cancellation)
        passed = (len(actual_triples) == 0)
        return ("PASSED" if passed else "FAILED"), (1 if passed else 0), 1, passed

    correct_count = 0
    remaining_actual = list(actual_triples)

    for exp in expected_triples:
        match_idx = None
        for idx, act in enumerate(remaining_actual):
            if match_triple(exp, act):
                match_idx = idx
                break
        if match_idx is not None:
            correct_count += 1
            remaining_actual.pop(match_idx)

    bill_passed = (correct_count == total_expected and len(actual_triples) == total_expected)
    status = "PASSED" if bill_passed else "FAILED"
    return status, correct_count, total_expected, bill_passed


def run_evaluation(
    csv_path: str,
    predictions: Optional[Dict[str, Any]] = None,
    output_csv: Optional[str] = None,
    output_md: Optional[str] = None
) -> Dict[str, Any]:
    """Main evaluation runner across all test cases in CSV."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Test CSV not found at: {csv_path}")

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    results = []
    stats_by_lang: Dict[str, Dict[str, int]] = {}
    stats_by_cat: Dict[str, Dict[str, int]] = {}

    total_cases = len(rows)
    cases_tested = 0
    cases_passed = 0
    cases_failed = 0
    cases_untested = 0

    tested_expected_items_all = 0
    total_correct_items_all = 0
    latencies: List[float] = []

    for row in rows:
        tc_id = row["id"]
        sentence = row["sentence"]
        category = row.get("category", "general")
        lang = detect_language(sentence)

        exp_triples = parse_pipe_triples(
            row.get("expected_items", ""),
            row.get("expected_qty", ""),
            row.get("expected_unit", "")
        )

        pred_data = predictions.get(tc_id) if predictions else None
        actual_triples = None
        latency_ms = None

        if pred_data is not None:
            if isinstance(pred_data, list):
                actual_triples = pred_data
            elif isinstance(pred_data, dict):
                actual_triples = pred_data.get("items", [])
                latency_ms = pred_data.get("latency_ms")

        if latency_ms is not None:
            latencies.append(latency_ms)

        status, correct_items, exp_count, bill_passed = evaluate_case(exp_triples, actual_triples)

        if status == "UNTESTED":
            cases_untested += 1
        else:
            cases_tested += 1
            tested_expected_items_all += exp_count
            total_correct_items_all += correct_items
            if bill_passed:
                cases_passed += 1
            else:
                cases_failed += 1

        # Track per language
        if lang not in stats_by_lang:
            stats_by_lang[lang] = {"total_cases": 0, "passed": 0, "failed": 0, "untested": 0, "correct_items": 0, "tested_exp_items": 0}
        stats_by_lang[lang]["total_cases"] += 1
        if status == "UNTESTED":
            stats_by_lang[lang]["untested"] += 1
        else:
            stats_by_lang[lang]["tested_exp_items"] += exp_count
            stats_by_lang[lang]["correct_items"] += correct_items
            if bill_passed:
                stats_by_lang[lang]["passed"] += 1
            else:
                stats_by_lang[lang]["failed"] += 1

        # Track per category
        if category not in stats_by_cat:
            stats_by_cat[category] = {"total_cases": 0, "passed": 0, "failed": 0, "untested": 0, "correct_items": 0, "tested_exp_items": 0}
        stats_by_cat[category]["total_cases"] += 1
        if status == "UNTESTED":
            stats_by_cat[category]["untested"] += 1
        else:
            stats_by_cat[category]["tested_exp_items"] += exp_count
            stats_by_cat[category]["correct_items"] += correct_items
            if bill_passed:
                stats_by_cat[category]["passed"] += 1
            else:
                stats_by_cat[category]["failed"] += 1

        results.append({
            "id": tc_id,
            "sentence": sentence,
            "language": lang,
            "category": category,
            "expected_items": row.get("expected_items", ""),
            "expected_qty": row.get("expected_qty", ""),
            "expected_unit": row.get("expected_unit", ""),
            "status": status,
            "correct_items": correct_items,
            "expected_count": exp_count,
            "bill_passed": bill_passed,
            "latency_ms": latency_ms if latency_ms is not None else ""
        })

    # Calculate overall metrics
    item_accuracy = (total_correct_items_all / tested_expected_items_all * 100) if cases_tested > 0 and tested_expected_items_all > 0 else 0.0
    bill_accuracy = (cases_passed / cases_tested * 100) if cases_tested > 0 else 0.0
    avg_latency = (sum(latencies) / len(latencies)) if latencies else None

    summary = {
        "total_cases": total_cases,
        "cases_tested": cases_tested,
        "cases_passed": cases_passed,
        "cases_failed": cases_failed,
        "cases_untested": cases_untested,
        "item_accuracy_pct": round(item_accuracy, 2) if cases_tested > 0 else None,
        "bill_accuracy_pct": round(bill_accuracy, 2) if cases_tested > 0 else None,
        "avg_latency_ms": round(avg_latency, 2) if avg_latency is not None else None,
        "stats_by_language": stats_by_lang,
        "stats_by_category": stats_by_cat,
        "results": results
    }

    # Write output CSV if requested
    if output_csv:
        os.makedirs(os.path.dirname(os.path.abspath(output_csv)), exist_ok=True)
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["id", "language", "category", "sentence", "expected_items", "expected_qty", "expected_unit", "status", "correct_items", "expected_count", "bill_passed", "latency_ms"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                writer.writerow(r)

    # Write Markdown summary if requested
    if output_md:
        os.makedirs(os.path.dirname(os.path.abspath(output_md)), exist_ok=True)
        with open(output_md, "w", encoding="utf-8") as f:
            f.write(generate_markdown_report(summary))

    return summary


def generate_markdown_report(summary: Dict[str, Any]) -> str:
    """Generates clean Markdown accuracy summary suitable for pitch and docs."""
    lines = [
        "# Hisab Kitab — Test & Accuracy Evaluation Report",
        "",
        f"- **Total Test Cases Registered:** {summary['total_cases']}",
        f"- **Cases Evaluated:** {summary['cases_tested']}",
        f"- **Cases Untested (Pending Pipeline):** {summary['cases_untested']}",
        f"- **Cases Passed:** {summary['cases_passed']}",
        f"- **Cases Failed:** {summary['cases_failed']}",
        f"- **Item-Level Accuracy:** {summary['item_accuracy_pct']}%" if summary['item_accuracy_pct'] is not None else "- **Item-Level Accuracy:** *Pending integration (no live predictions)*",
        f"- **Complete-Bill Accuracy:** {summary['bill_accuracy_pct']}%" if summary['bill_accuracy_pct'] is not None else "- **Complete-Bill Accuracy:** *Pending integration (no live predictions)*",
        f"- **Average Latency:** {summary['avg_latency_ms']} ms" if summary['avg_latency_ms'] is not None else "- **Average Latency:** *Unmeasured*",
        "",
        "## Performance by Language",
        "",
        "| Language | Total Cases | Tested | Passed | Failed | Untested | Item Accuracy |",
        "|---|---|---|---|---|---|---|"
    ]

    for lang, st in summary["stats_by_language"].items():
        tested = st["passed"] + st["failed"]
        acc = f"{(st['correct_items'] / st['tested_exp_items'] * 100):.1f}%" if tested > 0 and st['tested_exp_items'] > 0 else "N/A"
        lines.append(f"| {lang} | {st['total_cases']} | {tested} | {st['passed']} | {st['failed']} | {st['untested']} | {acc} |")

    lines.extend([
        "",
        "## Performance by Category",
        "",
        "| Category | Total Cases | Tested | Passed | Failed | Untested |",
        "|---|---|---|---|---|---|"
    ])

    for cat, st in summary["stats_by_category"].items():
        tested = st["passed"] + st["failed"]
        lines.append(f"| {cat} | {st['total_cases']} | {tested} | {st['passed']} | {st['failed']} | {st['untested']} |")

    lines.append("")
    return "\n".join(lines)


def print_terminal_summary(summary: Dict[str, Any]):
    """Prints a structured summary to the console."""
    print("=" * 72)
    print("  HISAB KITAB — TEST & ACCURACY EVALUATION (Role D)")
    print("=" * 72)
    print(f"Total Test Cases in Dataset: {summary['total_cases']}")
    print(f"Cases Evaluated:             {summary['cases_tested']}")
    print(f"Cases Untested:              {summary['cases_untested']}")

    if summary['cases_tested'] > 0:
        print(f"Passed Bills:                {summary['cases_passed']} ({summary['bill_accuracy_pct']}%)")
        print(f"Failed Bills:                {summary['cases_failed']}")
        print(f"Item-Level Accuracy:         {summary['item_accuracy_pct']}%")
        if summary['avg_latency_ms']:
            print(f"Average Latency:             {summary['avg_latency_ms']} ms")
    else:
        print("\n[NOTE] 0 cases evaluated against live pipeline.")
        print("Status: Evaluator is operational and awaiting backend parser/API integration.")

    print("\n--- Language Distribution ---")
    for lang, st in summary["stats_by_language"].items():
        print(f"  {lang:<22}: {st['total_cases']} cases ({st['untested']} untested, {st['passed']} passed, {st['failed']} failed)")

    print("\n--- Category Breakdown ---")
    for cat, st in summary["stats_by_category"].items():
        print(f"  {cat:<26}: {st['total_cases']} cases")
    print("=" * 72)


def run_self_test():
    """Runs built-in verification suite testing the evaluator itself."""
    print("Running Evaluator Self-Tests...")

    # Test 1: Single item perfect match
    exp1 = [{"item": "onion", "quantity": "2", "unit": "kg"}]
    act1 = [{"item": "onion", "quantity": 2.0, "unit": "kg"}]
    status, corr, total, passed = evaluate_case(exp1, act1)
    assert status == "PASSED" and corr == 1 and passed is True, "Self-test 1 failed"

    # Test 2: Unit mismatch
    act2 = [{"item": "onion", "quantity": "2", "unit": "g"}]
    status, corr, total, passed = evaluate_case(exp1, act2)
    assert status == "FAILED" and corr == 0 and passed is False, "Self-test 2 failed"

    # Test 3: Multi-item partial match
    exp3 = [
        {"item": "onion", "quantity": "2", "unit": "kg"},
        {"item": "potato", "quantity": "1", "unit": "kg"},
        {"item": "tomato", "quantity": "0.5", "unit": "kg"}
    ]
    act3 = [
        {"item": "onion", "quantity": "2", "unit": "kg"},
        {"item": "potato", "quantity": "1", "unit": "kg"},
        {"item": "carrot", "quantity": "0.5", "unit": "kg"} # wrong item
    ]
    status, corr, total, passed = evaluate_case(exp3, act3)
    assert status == "FAILED" and corr == 2 and total == 3 and passed is False, "Self-test 3 failed"

    # Test 4: Untested case
    status, corr, total, passed = evaluate_case(exp1, None)
    assert status == "UNTESTED" and corr == 0 and passed is False, "Self-test 4 failed"

    # Test 5: Pipe parsing
    triples = parse_pipe_triples("onion|potato|tomato", "2|1|0.5", "kg|kg|kg")
    assert len(triples) == 3
    assert triples[2] == {"item": "tomato", "quantity": "0.5", "unit": "kg"}

    print("[SUCCESS] All 5 evaluator self-tests passed cleanly!\n")


def main():
    parser = argparse.ArgumentParser(description="Hisab Kitab Test Accuracy Evaluator")
    parser.add_argument("--csv", default="data/test_sentences.csv", help="Path to test sentences CSV")
    parser.add_argument("--predictions", help="Path to JSON predictions file")
    parser.add_argument("--out-csv", default="tests/accuracy_report.csv", help="Output CSV path for results")
    parser.add_argument("--out-md", default="tests/accuracy_summary.md", help="Output Markdown report path")
    parser.add_argument("--self-test", action="store_true", help="Run internal evaluator validation tests")

    args = parser.parse_args()

    # Configure UTF-8 output encoding for terminals
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    if args.self_test:
        run_self_test()

    preds = None
    if args.predictions and os.path.exists(args.predictions):
        with open(args.predictions, "r", encoding="utf-8") as pf:
            preds = json.load(pf)

    summary = run_evaluation(
        csv_path=args.csv,
        predictions=preds,
        output_csv=args.out_csv,
        output_md=args.out_md
    )

    print_terminal_summary(summary)


if __name__ == "__main__":
    main()
