from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.billing import clear_bills, create_draft_bill, bills
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
