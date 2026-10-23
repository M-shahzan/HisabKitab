import copy
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, create_draft_bill, bills
from backend.db import get_db
from backend.main import app
from backend.matching import (
    find_best_match,
    match_unknown_word,
    normalize_text,
    compute_similarity,
)
from backend.seed import seed_database

client = TestClient(app)

SAMPLE_CATALOG = [
    {
        "id": 1,
        "name": "Rice",
        "synonyms": "chawal,arisi,basmati",
        "unit": "kg",
        "price": 60.0,
    },
    {
        "id": 2,
        "name": "Sugar",
        "synonyms": "chini,sakkar,sakkare,cheeni",
        "unit": "kg",
        "price": 42.0,
    },
    {
        "id": 3,
        "name": "Toor Dal",
        "synonyms": "arhar dal,tuvar dal,sambar dal",
        "unit": "kg",
        "price": 140.0,
    },
    {
        "id": 4,
        "name": "Wheat Flour",
        "synonyms": "atta,godhumai maavu,gehu atta",
        "unit": "kg",
        "price": 45.0,
    },
]


@pytest.fixture(autouse=True)
def clean_in_memory_state():
    """Ensure in-memory draft bills are reset around each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_matching.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_exact_product_name_matching():
    """1. Exact product name matching yields 100 score and matched status."""
    res = find_best_match("Rice", SAMPLE_CATALOG)
    assert res["status"] == "matched"
    assert res["match"] is not None
    assert res["match"]["id"] == 1
    assert res["match"]["name"] == "Rice"
    assert res["score"] == 100.0
    assert res["confidence"] == 1.0
    assert res["ambiguous"] is False
    assert res["message"] == "Did you mean Rice?"

    # Case insensitivity and whitespace stripping
    res_lower = find_best_match("  rice  ", SAMPLE_CATALOG)
    assert res_lower["status"] == "matched"
    assert res_lower["match"]["name"] == "Rice"
    assert res_lower["score"] == 100.0


def test_exact_synonym_matching():
    """2. Exact synonym matching resolves to the correct catalogue product."""
    # 'chini' is a synonym for Sugar
    res = find_best_match("chini", SAMPLE_CATALOG)
    assert res["status"] == "matched"
    assert res["match"] is not None
    assert res["match"]["id"] == 2
    assert res["match"]["name"] == "Sugar"
    assert res["score"] == 100.0
    assert res["message"] == "Did you mean Sugar?"

    # 'atta' is a synonym for Wheat Flour
    res_atta = find_best_match("atta", SAMPLE_CATALOG)
    assert res_atta["status"] == "matched"
    assert res_atta["match"]["id"] == 4
    assert res_atta["match"]["name"] == "Wheat Flour"
    assert res_atta["score"] == 100.0


def test_typo_near_match_resolves_to_expected_candidate():
    """3. Typo or near-match meeting similarity threshold (>= 80) resolves properly."""
    # 'sukkare' is a typo for Sugar synonym 'sakkare'
    res = find_best_match("sukkare", SAMPLE_CATALOG, threshold=80.0)
    assert res["status"] == "matched"
    assert res["match"] is not None
    assert res["match"]["id"] == 2
    assert res["match"]["name"] == "Sugar"
    assert res["score"] >= 80.0
    assert res["message"] == "Did you mean Sugar?"

    # 'chawall' is a typo for Rice synonym 'chawal'
    res_chawal = find_best_match("chawall", SAMPLE_CATALOG, threshold=80.0)
    assert res_chawal["status"] == "matched"
    assert res_chawal["match"]["name"] == "Rice"
    assert res_chawal["score"] >= 80.0
    assert res_chawal["message"] == "Did you mean Rice?"


def test_candidate_below_threshold_rejected():
    """4. Candidate scoring below threshold is rejected without matching."""
    res = find_best_match("xyzcompletelyunknown", SAMPLE_CATALOG, threshold=80.0)
    assert res["status"] == "no_match"
    assert res["match"] is None
    assert res["score"] < 80.0
    assert res["ambiguous"] is False

    # match_unknown_word helper also returns None
    assert match_unknown_word("xyzcompletelyunknown", SAMPLE_CATALOG, threshold=80.0) is None


def test_ambiguous_candidates_require_clarification():
    """5. Closely scored candidates within ambiguity margin trigger clarification."""
    ambiguous_catalog = [
        {"id": 101, "name": "Tata Salt", "synonyms": "tata namak", "unit": "packet", "price": 25.0},
        {"id": 102, "name": "Bata Salt", "synonyms": "bata namak", "unit": "packet", "price": 22.0},
        {"id": 103, "name": "Sugar", "synonyms": "chini", "unit": "kg", "price": 40.0},
    ]

    # 'Data Salt' is equidistant to 'Tata Salt' and 'Bata Salt'
    res = find_best_match("Data Salt", ambiguous_catalog, threshold=80.0, ambiguity_margin=5.0)
    assert res["status"] == "ambiguous"
    assert res["ambiguous"] is True
    assert res["match"] is None
    assert res["score"] >= 80.0
    assert "Tata Salt" in res["message"]
    assert "Bata Salt" in res["message"]
    assert "Did you mean" in res["message"]

    # match_unknown_word helper safely returns None for ambiguous candidates
    assert match_unknown_word("Data Salt", ambiguous_catalog, threshold=80.0) is None


def test_unknown_products_produce_controlled_add_product_question():
    """6. Unrecognized product below threshold asks whether to add as new product."""
    res = find_best_match("Dragonfruit", SAMPLE_CATALOG, threshold=80.0)
    assert res["status"] == "no_match"
    assert res["match"] is None
    assert res["message"] == "Could not find 'Dragonfruit'. Would you like to add it as a new product?"


def test_matching_never_modifies_catalogue_data(seeded_db: Path):
    """7. Matching operations are strictly read-only and never alter catalogue or stock data."""
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, synonyms, unit, price FROM items ORDER BY id;")
        initial_items = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT item_id, quantity, low_threshold FROM stock ORDER BY item_id;")
        initial_stock = [dict(r) for r in cursor.fetchall()]

    catalog_copy = copy.deepcopy(initial_items)

    # Execute multiple matching operations
    find_best_match("Rice", catalog_copy)
    find_best_match("sukkare", catalog_copy)
    find_best_match("Data Salt", catalog_copy)
    find_best_match("randomunknownitem", catalog_copy)

    # Verify input list is unmodified
    assert catalog_copy == initial_items

    # Verify database tables are completely unchanged
    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, synonyms, unit, price FROM items ORDER BY id;")
        after_items = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT item_id, quantity, low_threshold FROM stock ORDER BY item_id;")
        after_stock = [dict(r) for r in cursor.fetchall()]

    assert after_items == initial_items
    assert after_stock == initial_stock


def test_suggested_product_not_added_to_draft_before_confirmation(seeded_db: Path):
    """8. A fuzzy suggested product is returned as clarification and NOT added to the draft bill."""
    mock_parsed = {
        "intent": "new_sale",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["sukkare"],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="sukkare do kilo"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("sale.webm", b"audio_data", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()

    # Did you mean Sugar? returned without creating a bill
    assert data["message"] == "Did you mean Sugar?"
    assert data["bill"] is None
    assert data["intent"] == "unclear"
    assert len(bills) == 0


def test_existing_draft_not_corrupted_by_unresolved_word(seeded_db: Path):
    """8b. Existing draft bill retains its original lines and total when an unknown word is suggested."""
    initial_bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 1}],  # Rice 1 * 60 = 60
        db_path=seeded_db,
    )
    b_id = initial_bill["bill_id"]

    mock_parsed = {
        "intent": "new_sale",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["sukkare"],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="aur sukkare"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("edit.webm", b"audio_data", "audio/webm")},
                data={"bill_id": b_id},
            )

    assert resp.status_code == 200
    data = resp.json()

    assert data["message"] == "Did you mean Sugar?"
    active_bill = data["bill"]
    assert active_bill is not None
    assert active_bill["bill_id"] == b_id
    assert len(active_bill["lines"]) == 1
    assert active_bill["lines"][0]["name"] == "Rice"
    assert active_bill["total"] == 60


def test_voice_unknown_word_no_match_prompts_add_new_product(seeded_db: Path):
    """Voice with completely unknown product asks whether to add it as a new product."""
    mock_parsed = {
        "intent": "new_sale",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["Dragonfruit"],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Dragonfruit ek kilo"):
        with patch("backend.main.parse", return_value=mock_parsed):
            resp = client.post(
                "/voice",
                files={"audio": ("sale.webm", b"audio_data", "audio/webm")},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert "Could not find 'Dragonfruit'. Would you like to add it as a new product?" in data["message"]
    assert data["bill"] is None
