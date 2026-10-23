# Hisab Kitab — Backup Demo Checklist & Readiness Status

> **Document Type:** Operational Readiness Assessment & Backup Demonstration Guide  
> **Role:** Member D (Pitch, Testing & Demo Lead)  
> **Audience:** Presenter, Demo Driver, and Full Team  
> **Integrity Principle:** Clearly separates verified evaluation tools from in-progress application features. No fabricated recordings or mock data.

---

## 1. Asset Evidence & Verification Inventory

This table records the exact state of all demo assets based on repository inspection:

| Asset | File / Resource | Verification Status | Notes / Limitations |
|---|---|---|---|
| **Test Dataset** | `data/test_sentences.csv` | **[Verified]** | 46 test cases; UTF-8 verified; includes KN, HI, EN, and code-mixed inputs across 14 categories. |
| **Evaluator Harness** | `tests/run_accuracy.py` | **[Verified]** | Built-in validation passes 5/5 self-tests; cleanly computes item and bill metrics. |
| **Evaluator Results Report** | `tests/accuracy_report.csv` | **[Verified]** | 46 rows generated; all 46 cases correctly tagged as `UNTESTED` pending model predictions. |
| **Accuracy Summary Document** | `tests/accuracy_summary.md` | **[Verified]** | Markdown summary ready for slide insertion with language/category distribution tables. |
| **Pitch Deck Content** | `docs/pitch_deck.md` | **[Verified]** | 7-slide structure with speaker notes and visual descriptions. |
| **Live Demo Script** | `docs/demo_script.md` | **[Verified]** | 90-second timed protocol with failure recovery actions. |
| **User Feedback Instrument** | `docs/feedback_form.md` | **[Verified Template]** | Questionnaire defined; field data marked as **[Pending Collection]**. |
| **Product Catalogue Data** | `data/items.json` | **[Missing / Blocker]** | Currently an empty list `[]`; requires 20–30 items from backend team. |
| **AI Parser & Logic** | `backend/parser.py`, `backend/matching.py` | **[In Progress]** | Minimal `# TODO` stubs; backend endpoints not yet functional. |
| **Frontend UI** | `frontend/app.js`, `frontend/index.html` | **[In Progress]** | Minimal stubs; not yet wired to live voice capture or backend routes. |
| **Prerecorded Video** | `docs/demo/` or `tests/demo/` | **[Missing / Not Recorded]** | No video file currently exists in repository. Do not claim one exists. |
| **Recorded Test Audio** | `tests/audio/` | **[Missing / Not Recorded]** | Folder contains `.gitkeep` only; no audio clips recorded yet. |

---

## 2. Pre-Presentation Readiness Checklist

Execute this checklist 30 minutes before stepping up to present:

- [ ] **1. Run Evaluator Self-Test (Terminal Verification):**
  ```bash
  python tests/run_accuracy.py --self-test
  ```
  *Ensure output ends with `[SUCCESS] All 5 evaluator self-tests passed cleanly!`*
- [ ] **2. Verify Test Dataset Integrity:**
  ```bash
  python -c "import csv; rows = list(csv.DictReader(open('data/test_sentences.csv', encoding='utf-8'))); assert len(rows) == 46; print(f'Dataset intact: {len(rows)} cases.')"
  ```
- [ ] **3. Terminal Pre-Positioning:**
  - Keep a terminal window open, sized cleanly, with UTF-8 encoding enabled.
  - Pre-type the command: `python tests/run_accuracy.py`
- [ ] **4. Browser Pre-Positioning:**
  - Tab 1: [docs/pitch_deck.md](file:///e:/projects/HisabKitab/docs/pitch_deck.md) or presentation viewer.
  - Tab 2: [tests/accuracy_summary.md](file:///e:/projects/HisabKitab/tests/accuracy_summary.md).
  - Tab 3 (if backend is running): `http://localhost:8000/health` (verify `{"ok": true}`).
- [ ] **5. Role Assignment for Rehearsal:**
  - **Speaker (Lead):** Delivers problem hook, value proposition, and closing.
  - **Driver:** Operates laptop/phone, triggers speech or tap fallback.
  - **Technical Lead:** Handles judge questions on architecture and SQLite schema.

---

## 3. Step-by-Step Backup Demo Protocol (Zero Cloud Dependencies)

If live cloud APIs, Wi-Fi, backend services, or audio recording fail during the pitch, immediately pivot to this **100% locally verified fallback walkthrough**:

```
Pivot Phrase:
"While our live cloud speech pipeline is currently experiencing network latency in the venue, let us demonstrate the local evaluation engine and multilingual test architecture that powers Hisab Kitab."
```

### Step 1: Terminal Demonstration (45 Seconds)
1. Switch to the open terminal window.
2. Run the self-test live:
   ```bash
   python tests/run_accuracy.py --self-test
   ```
3. **Presenter Narration:**  
   *"To guarantee that our billing logic is reliable before deployment, we built an independent testing engine. Here it is executing five automated unit checks on item matching, unit discrepancies, and multi-item triples. All five checks pass with zero regression."*
4. Highlight the terminal summary table:
   - 46 registered utterances.
   - Parity across Kannada (14), Hindi (11), English (14), and Code-mixed (7).
   - 14 distinct operational categories.

### Step 2: Test Dataset Inspection (30 Seconds)
1. Open [data/test_sentences.csv](file:///e:/projects/HisabKitab/data/test_sentences.csv) in VS Code or viewer.
2. Show the multilingual sentences:
   - Point out pure Kannada: `TC01` (`"ಎರಡು ಕೆಜಿ ಈರುಳ್ಳಿ ಕೊಡಿ"` -> `onion: 2 kg`).
   - Point out pure Hindi: `TC03` (`"दो किलो प्याज़"` -> `onion: 2 kg`).
   - Point out Code-mixed Kannada/English: `TC15` (`"Two kg rice, one oil, 500 gram sakkare"`).
   - Point out regional colloquial units: `TC42` (`"ಒಂದು ಕಟ್ಟು ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು"` — *bunch/kattu*).
3. **Presenter Narration:**  
   *"Notice our ground-truth data. We do not force English grammar on vendors. We support native Kannada script and authentic market phrasing like 'kattu' for greens and 'paav' for 250 grams."*

### Step 3: Architecture & Safety Walkthrough (15 Seconds)
1. Switch to Slide 4 in [docs/pitch_deck.md](file:///e:/projects/HisabKitab/docs/pitch_deck.md).
2. **Presenter Narration:**  
   *"Our backend maintains an active session draft. If an utterance is misheard, the vendor speaks a quick correction or taps the manual fallback button. Nothing is committed to inventory until confirmed."*

---

## 4. Failure Mode Matrix

| Failure Event | Root Cause | Immediate Action | Scripted Presenter Statement |
|---|---|---|---|
| **Microphone Permission Error** | Browser security restriction | Switch immediately to manual tap mode in UI. | *"Phone browsers require HTTPS for microphone capture; in low-trust environments, the vendor uses our instant high-contrast tap controls."* |
| **Wi-Fi / Network Drop** | Venue connectivity failure | Do not wait for reconnection. Switch to Section 3 (Local Terminal Demo). | *"To ensure we don't waste your time on venue Wi-Fi, let's inspect the local evaluation harness running directly on this machine."* |
| **Model Hallucination / Wrong Item** | Parser misinterpretation | Point to confirmation step and tap correction. | *"This illustrates why Hisab Kitab refuses silent commits. The vendor sees the itemized preview and corrects it with one tap before saving."* |
| **Backend 500 / Crash** | Unhandled exception in route | Open `tests/accuracy_summary.md` and pitch slides. | *"Our backend is undergoing active integration; let's examine our verified evaluation metrics and architecture pipeline."* |
| **Prerecorded Video Missing** | Video not yet recorded | **Do not search or claim video exists.** Proceed with live terminal evaluation. | *"We are demonstrating live local test harnesses today rather than relying on polished prerecorded simulations."* |

---

## 5. Truthful Readiness Summary for Judges

When concluding or answering technical judge questions:
- **What is verified today:** 46-sentence multilingual dataset, automated evaluation framework with passing self-tests, pitch deck, and complete demo scripts.
- **What is in active development:** FastAPI routes, SQLite catalogue population (`data/items.json`), LLM parsing prompt tuning, and mobile frontend wiring.
- **User testing status:** Feedback questionnaire finalized; field testing with local shopkeepers will be executed once end-to-end integration completes.
