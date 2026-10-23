# Hisab Kitab (हिसाब किताब)

Voice-first billing and inventory web app designed for small Indian shopkeepers (kirana stores). The shopkeeper speaks items, quantities, and prices naturally; the system captures audio, parses billing intents, calculates totals, allows tap/voice edits, and commits sales while updating stock inventory.

---

## 1. Quick Start & Setup

### A. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Windows / macOS / Linux

### B. Virtual Environment Setup (Windows)
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
# In PowerShell:
.\venv\Scripts\Activate.ps1
# In Command Prompt (cmd.exe):
venv\Scripts\activate.bat
# On Linux / macOS:
source venv/bin/activate
```

### C. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### D. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
# On Windows PowerShell:
Copy-Item .env.example .env
# On Linux / macOS:
cp .env.example .env
```

#### API Keys Configuration:
- `STT_API_KEY`: API key for OpenAI Whisper speech-to-text (`https://api.openai.com/v1/audio/transcriptions`).
- `LLM_API_KEY`: API key for OpenAI Chat Completions parser (`https://api.openai.com/v1/chat/completions`).
- `TTS_API_KEY`: Optional cloud TTS key; the web frontend defaults to the browser's built-in Web Speech API (`window.speechSynthesis`) for local, zero-latency playback.
- **Note on Testing**: Automated tests (`pytest`) mock STT and LLM interactions deterministically; **no API keys or external network connections are needed to run tests**.

### E. Initialize & Seed Database
Reset and load the 25-item kirana catalogue and initial inventory into SQLite (`hisab_kitab.db`):
```bash
python seed.py
```

### F. Start the Backend Server
From the project root directory:
```bash
uvicorn backend.main:app --reload --port 8000
```

---

## 2. Accessing the Application & Endpoints

| Resource | URL | Description |
|---|---|---|
| **Sale Screen (Web UI)** | [http://localhost:8000/frontend/index.html](http://localhost:8000/frontend/index.html) | Voice mic, draft bill view, total, tap/voice confirm & cancel |
| **Summary Screen (Web UI)** | [http://localhost:8000/frontend/summary.html](http://localhost:8000/frontend/summary.html) | Daily sales totals, bill count, top items, and stock inventory |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | API health verification (`{"ok": true}`) |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger/OpenAPI documentation |
| **Stock Inventory API** | [http://localhost:8000/stock](http://localhost:8000/stock) | JSON listing of all catalogue products with stock quantities |
| **Daily Summary API** | [http://localhost:8000/summary?date=YYYY-MM-DD](http://localhost:8000/summary) | Total sales, bill counts, top products, and low stock warnings |

---

## 3. Running Automated Tests

Run the full automated test suite (78 tests):
```bash
python -m pytest tests -v
```

### Test Suite Structure:
- `tests/test_health.py`: Health endpoint, CORS origins, mock voice contract.
- `tests/test_database.py`: SQLite schema initialization, table structures, ACID rollback.
- `tests/test_seed.py`: 25-item catalogue loading, starting stock integrity, `GET /stock`.
- `tests/test_billing.py`: In-memory draft billing, line item math, unit price rules, bill editing.
- `tests/test_voice.py`: `/voice` pipeline orchestration, transcription, parsing, draft creation.
- `tests/test_confirmation.py`: `/confirm` and `/cancel` transaction handling, stock deduction, duplicate prevention.
- `tests/test_summary.py`: `/summary` daily totals, top items ranking, low-stock reporting, voice queries.
- `tests/test_correction.py`: `/correction` voice mishearing correction logging.
- `tests/test_matching.py`: RapidFuzz fallback matching, threshold gating, ambiguity handling, catalogue immutability.
- `tests/test_e2e_flow.py`: Full 10-step end-to-end integration workflow.

---

## 4. Architecture & Implementation Status

### Core Components:
1. **Database Layer (`backend/db.py`)**: SQLite schema managing `items`, `stock`, `sales`, `sale_items`, and `corrections`.
2. **Draft Billing (`backend/billing.py`)**: In-memory draft bill session management. Spoken prices strictly override unit prices (`unit_price * qty = line_amount`).
3. **Voice Pipeline (`backend/main.py`, `backend/stt.py`, `backend/parser.py`)**:
   - `transcribe`: Audio input to transcript via Whisper API.
   - `parse`: Transcript to structured JSON intent and catalogue item IDs via LLM.
4. **Fuzzy Fallback Matching (`backend/matching.py`)**: RapidFuzz-based matching for unrecognized or misspelled products with threshold (80.0) and ambiguity detection before clarification.
5. **Sales Reporting & Inventory (`backend/summary.py`)**: Aggregated daily sales, top products, and real-time stock levels.
6. **Correction Logging (`backend/corrections.py`)**: Tracks voice misrecognitions for model fine-tuning and accuracy auditing.
7. **Frontend Client (`frontend/`)**: Responsive web client with MediaRecorder voice capture, draft card display, confirm/cancel buttons, and browser speech synthesis.

### Component Status:
| Component | Status | Details |
|---|---|---|
| **Database & Seeder** | Implemented | SQLite with 25 pre-seeded kirana items |
| **Billing & Transactions** | Implemented | In-memory draft bills + atomic SQLite commits |
| **Fuzzy Matching** | Implemented | RapidFuzz fallback with threshold (80) & ambiguity check |
| **Summary & Stock Queries** | Implemented | Voice & HTTP endpoints for daily sales & inventory |
| **Correction Logging** | Implemented | `/correction` endpoint saving to SQLite |
| **Speech-to-Text (STT)** | Implemented / Mocked in Tests | Live OpenAI Whisper API; mocked in pytest suite |
| **LLM Structured Parser** | Implemented / Mocked in Tests | Live OpenAI GPT-4o-mini API; mocked in pytest suite |
| **Text-to-Speech (TTS)** | Client-side Integrated | Uses browser `window.speechSynthesis`; cloud TTS is optional |
| **Web UI** | Implemented | HTML5, CSS3, vanilla JS with MediaRecorder |
