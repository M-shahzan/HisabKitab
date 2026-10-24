from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, create_draft_bill, bills
from backend.db import get_db
from backend.main import app
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_in_memory_state():
    """Ensure in-memory draft bills are cleared before and after each test."""
    clear_bills()
    yield
    clear_bills()


@pytest.fixture
def seeded_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Fixture providing an isolated temporary database pre-seeded with catalogue items."""
    db_file = tmp_path / "test_voice.db"
    seed_database(db_path=db_file)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    return db_file


def test_voice_missing_audio_rejected():
    """Missing audio upload returns 400 Bad Request."""
    response = client.post("/voice")
    assert response.status_code == 400
    assert "Audio file is required" in response.json()["detail"]


def test_voice_empty_audio_rejected():
    """Empty audio file returns 400 Bad Request."""
    response = client.post(
        "/voice",
        files={"audio": ("empty.wav", b"", "audio/wav")},
    )
    assert response.status_code == 400
    assert "Audio file cannot be empty" in response.json()["detail"]


def test_voice_transcription_failure():
    """Failure in transcription provider returns 502 with controlled error message."""
    with patch("backend.main.transcribe", side_effect=RuntimeError("Whisper API error")):
        response = client.post(
            "/voice",
            files={"audio": ("test.wav", b"fake_audio_content", "audio/wav")},
        )
    assert response.status_code == 502
    assert "Transcription service failed" in response.json()["detail"]


def test_voice_parser_failure():
    """Failure in LLM parser returns 502 with controlled error message."""
    with patch("backend.main.transcribe", return_value="2 kg Rice"):
        with patch("backend.main.parse", side_effect=RuntimeError("LLM API timeout")):
            response = client.post(
                "/voice",
                files={"audio": ("test.wav", b"fake_audio_content", "audio/wav")},
            )
    assert response.status_code == 502
    assert "Parser service failed" in response.json()["detail"]


def test_voice_invalid_parser_output():
    """Parser output failing Section 4.2 schema returns 502 error."""
    with patch("backend.main.transcribe", return_value="Some text"):
        with patch("backend.main.parse", return_value={"intent": "unsupported_intent"}):
            response = client.post(
                "/voice",
                files={"audio": ("test.wav", b"fake_audio_content", "audio/wav")},
            )
    assert response.status_code == 502
    assert "Parser service failed" in response.json()["detail"]


def test_voice_create_draft_bill(seeded_db: Path):
    """Transcript for a new sale successfully creates and returns a draft bill."""
    mock_parsed = {
        "intent": "new_sale",
        "items": [
            {"item_id": 1, "qty": 2, "unit": "kg", "price": None},   # Rice: 2 * 60 = 120
            {"item_id": 2, "qty": 1, "unit": "kg", "price": None},   # Sugar: 1 * 42 = 42
        ],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Rice 2 kg, Sugar 1 kg"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("sale.webm", b"valid_audio_bytes", "audio/webm")},
                data={"language": "hi"},
            )

    assert response.status_code == 200
    data = response.json()

    assert data["transcript"] == "Rice 2 kg, Sugar 1 kg"
    assert data["intent"] == "new_sale"
    assert "Save?" in data["message"]

    bill = data["bill"]
    assert bill is not None
    assert bill["status"] == "draft"
    assert len(bill["lines"]) == 2
    assert bill["total"] == 162


def test_voice_edit_existing_draft(seeded_db: Path):
    """Transcript for edit_bill updates the existing bill matching bill_id."""
    initial_bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 2}],  # Rice 2 * 60 = 120
        db_path=seeded_db,
    )
    b_id = initial_bill["bill_id"]

    mock_parsed = {
        "intent": "edit_bill",
        "items": [],
        "edit": {"action": "set_qty", "item_id": 1, "value": 5},
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Make rice 5 kilo"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("edit.webm", b"valid_audio_bytes", "audio/webm")},
                data={"bill_id": b_id, "language": "hi"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "edit_bill"

    updated_bill = data["bill"]
    assert updated_bill["bill_id"] == b_id
    assert updated_bill["lines"][0]["qty"] == 5
    assert updated_bill["total"] == 300
    assert "Bill updated" in data["message"]


def test_voice_unclear_intent_with_clarification():
    """Unclear intent returns clarification message without creating bill."""
    mock_parsed = {
        "intent": "unclear",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": ["kuch"],
        "needs_clarification": "Did you mean Rice or Sugar?",
    }

    with patch("backend.main.transcribe", return_value="Kuch aur do"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("unclear.webm", b"valid_audio_bytes", "audio/webm")},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "unclear"
    assert data["bill"] is None
    assert data["message"] == "Did you mean Rice or Sugar?"


def test_voice_confirm_intent(seeded_db: Path):
    """Confirm intent returns controlled confirmation message."""
    initial_bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 1}],
        db_path=seeded_db,
    )
    b_id = initial_bill["bill_id"]

    mock_parsed = {
        "intent": "confirm",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Haan bill save karo"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("confirm.webm", b"valid_audio_bytes", "audio/webm")},
                data={"bill_id": b_id},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "confirm"
    assert data["message"] == "Sale confirmed."


def test_voice_cancel_intent(seeded_db: Path):
    """Cancel intent clears the draft and returns controlled cancel message."""
    initial_bill = create_draft_bill(
        items=[{"item_id": 1, "qty": 1}],
        db_path=seeded_db,
    )
    b_id = initial_bill["bill_id"]

    mock_parsed = {
        "intent": "cancel",
        "items": [],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    with patch("backend.main.transcribe", return_value="Rehne do cancel karo"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("cancel.webm", b"valid_audio_bytes", "audio/webm")},
                data={"bill_id": b_id},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "cancel"
    assert data["bill"] is None
    assert data["message"] == "Sale cancelled."
    assert b_id not in bills


def test_voice_response_contract_compliance(seeded_db: Path):
    """Verify the /voice endpoint response format complies exactly with Section 4.3 contract."""
    mock_parsed = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 1, "unit": "kg", "price": 60}],
        "edit": None,
    }

    with patch("backend.main.transcribe", return_value="1 kg Rice"):
        with patch("backend.main.parse", return_value=mock_parsed):
            response = client.post(
                "/voice",
                files={"audio": ("sale.webm", b"valid_bytes", "audio/webm")},
            )

    assert response.status_code == 200
    data = response.json()

    # Exact required top-level keys
    assert {"transcript", "intent", "bill", "message"}.issubset(data.keys())

    bill = data["bill"]
    assert {"bill_id", "lines", "total", "status"}.issubset(bill.keys())
    assert bill["status"] == "draft"

    line = bill["lines"][0]
    assert {"item_id", "name", "qty", "unit", "unit_price", "amount"}.issubset(line.keys())


def test_voice_consecutive_additions_preserve_items(seeded_db: Path):
    """Consecutive voice requests during an active draft bill add items without replacing previous items."""
    # 1. First spoken product: 2 kg Rice
    mock_rice = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 2, "unit": "kg", "price": None}],
        "edit": None,
    }
    with patch("backend.main.transcribe", return_value="2 kilo chawal"):
        with patch("backend.main.parse", return_value=mock_rice):
            res1 = client.post(
                "/voice",
                files={"audio": ("sale1.webm", b"audio1", "audio/webm")},
            )
    assert res1.status_code == 200
    d1 = res1.json()
    b_id = d1["bill"]["bill_id"]
    assert len(d1["bill"]["lines"]) == 1
    assert d1["bill"]["lines"][0]["name"] == "Rice"
    assert d1["bill"]["total"] == 120

    # 2. Second spoken product: 1 kg Sugar with bill_id
    mock_sugar = {
        "intent": "new_sale",
        "items": [{"item_id": 2, "qty": 1, "unit": "kg", "price": None}],
        "edit": None,
    }
    with patch("backend.main.transcribe", return_value="1 kilo cheeni"):
        with patch("backend.main.parse", return_value=mock_sugar):
            res2 = client.post(
                "/voice",
                files={"audio": ("sale2.webm", b"audio2", "audio/webm")},
                data={"bill_id": b_id},
            )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["transcript"] == "1 kilo cheeni"
    assert d2["bill"]["bill_id"] == b_id
    assert len(d2["bill"]["lines"]) == 2
    names = [l["name"] for l in d2["bill"]["lines"]]
    assert names == ["Rice", "Sugar"]
    assert d2["bill"]["total"] == 162

    # 3. Third spoken product: 1 kg Salt with bill_id
    mock_salt = {
        "intent": "new_sale",
        "items": [{"item_id": 12, "qty": 1, "unit": "kg", "price": None}],
        "edit": None,
    }
    with patch("backend.main.transcribe", return_value="1 packet namak"):
        with patch("backend.main.parse", return_value=mock_salt):
            res3 = client.post(
                "/voice",
                files={"audio": ("sale3.webm", b"audio3", "audio/webm")},
                data={"bill_id": b_id},
            )
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["transcript"] == "1 packet namak"
    assert len(d3["bill"]["lines"]) == 3
    names3 = [l["name"] for l in d3["bill"]["lines"]]
    assert names3 == ["Rice", "Sugar", "Salt"]
    assert d3["bill"]["total"] == 187

    # 4. Confirm bill and verify stock is decremented exactly once
    conf_res = client.post("/confirm", json={"bill_id": b_id})
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["total"] == 187

    with get_db(seeded_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 1;")
        assert cursor.fetchone()["quantity"] == 48.0  # 50 - 2
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 2;")
        assert cursor.fetchone()["quantity"] == 39.0  # 40 - 1
        cursor.execute("SELECT quantity FROM stock WHERE item_id = 12;")
        assert cursor.fetchone()["quantity"] == 39.0  # 40 - 1

    # 5. Verify cancel on a second draft still works
    mock_item = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 1, "unit": "kg", "price": None}],
        "edit": None,
    }
    with patch("backend.main.transcribe", return_value="1 kg chawal"):
        with patch("backend.main.parse", return_value=mock_item):
            res_new = client.post(
                "/voice",
                files={"audio": ("sale4.webm", b"audio4", "audio/webm")},
            )
    assert res_new.status_code == 200
    b2_id = res_new.json()["bill"]["bill_id"]
    assert b2_id != b_id

    cancel_res = client.post("/cancel", json={"bill_id": b2_id})
    assert cancel_res.status_code == 200
    assert cancel_res.json() == {"ok": True}


def test_get_supported_languages_endpoint():
    """Verify GET /languages returns configured regional and national languages."""
    resp = client.get("/languages")
    assert resp.status_code == 200
    data = resp.json()
    assert data["default"] == "hi"
    codes = {l["code"] for l in data["languages"]}
    expected = {"hi", "en", "kn", "ta", "te", "mr", "gu", "bn", "ml", "pa", "ur"}
    assert expected.issubset(codes)


def test_normalize_language_helper():
    """Verify normalize_language handles language names, tags, and variations."""
    from backend.stt import normalize_language

    assert normalize_language("kannada") == "kn"
    assert normalize_language("kn-IN") == "kn"
    assert normalize_language("tamil") == "ta"
    assert normalize_language("ta-IN") == "ta"
    assert normalize_language("telugu") == "te"
    assert normalize_language("te_IN") == "te"
    assert normalize_language("marathi") == "mr"
    assert normalize_language("gujarati") == "gu"
    assert normalize_language("bengali") == "bn"
    assert normalize_language("bangla") == "bn"
    assert normalize_language("english") == "en"
    assert normalize_language("hindi") == "hi"
    assert normalize_language(None) == "hi"


def test_voice_multilingual_dispatch(seeded_db: Path):
    """Verify POST /voice accepts regional language parameters and normalizes them."""
    mock_item = {
        "intent": "new_sale",
        "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": None}],
        "edit": None,
        "query_item_id": None,
        "unknown_words": [],
        "needs_clarification": None,
    }

    # Test Tamil voice call
    with patch("backend.main.transcribe", return_value="2 kg arisi") as mock_stt:
        with patch("backend.main.parse", return_value=mock_item) as mock_parse:
            resp = client.post(
                "/voice",
                files={"audio": ("sale_ta.webm", b"bytes_ta", "audio/webm")},
                data={"language": "tamil"},
            )
            assert resp.status_code == 200
            assert mock_stt.call_args[1]["language"] == "ta"
            assert mock_parse.call_args[1]["language"] == "ta"

    # Test Telugu voice call
    with patch("backend.main.transcribe", return_value="2 kg biyyam") as mock_stt:
        with patch("backend.main.parse", return_value=mock_item) as mock_parse:
            resp = client.post(
                "/voice",
                files={"audio": ("sale_te.webm", b"bytes_te", "audio/webm")},
                data={"language": "te-IN"},
            )
            assert resp.status_code == 200
            assert mock_stt.call_args[1]["language"] == "te"
            assert mock_parse.call_args[1]["language"] == "te"




