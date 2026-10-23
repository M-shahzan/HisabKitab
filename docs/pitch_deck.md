# Hisab Kitab — Hackathon Pitch Deck

> **Project:** Hisab Kitab (Working Title: Voice Billing)  
> **Track:** 24-Hour Hackathon — Open Innovation Track  
> **Audience:** Hackathon Judges, Mentors, and Retail Innovators  
> **Version:** 1.0 (Pitch Draft)

---

## Slide 1: Title and Team

### Hisab Kitab: Voice-First Billing for Small Shopkeepers
- **Focus:** Hands-free billing and real-time inventory management for vegetable vendors and kirana stores in Karnataka.
- **Core Promise:** "Speak the sale, confirm the total, update the stock — without touching the screen."
- **Hackathon Team Roles:**
  - Role A: Voice & AI (STT, LLM Prompting, TTS Adapters)
  - Role B: Backend & Data (FastAPI, SQLite, Session Drafts, Stock Sync)
  - Role C: Frontend & UX (Mobile-First Interface, High Contrast, Tap Fallbacks)
  - Role D: Pitch, Testing & Demo Lead (Evaluator, Benchmark Suite, Rehearsal)

**Suggested Visual:**
> Clean, high-contrast mobile screen mockup displaying a live bill card with an active audio waveform indicator and language badge (Kannada | Hindi | English).

**Speaker Notes:**
> "Good day, judges. Many small vegetable vendors and kirana shopkeepers in Karnataka work with busy hands and face high customer rushes. Typing into a billing app or hunting through menus slows down business. Today we present Hisab Kitab: a speak-first billing web application that turns natural regional speech directly into verified bills and inventory updates."

---

## Slide 2: The Problem

### Friction at the Kirana Counter
- **Rush Hour Bottleneck:** Typing items or hunting categories on small smartphone screens during customer rushes causes queues and delays (*Documented Fact*).
- **Reliance on Paper Khata:** Many local vendors still track transactions on paper slips or memory, causing arithmetic errors and untracked dues (*Documented Fact*).
- **Regional Language Gap:** Existing billing solutions predominantly cater to English or Hindi menus, leaving Kannada speakers and natural code-mixed speech underserved (*Documented Fact*).
- **Operational Reality:** Vegetable and fruit prices fluctuate daily; hands are physically busy handling produce and weighing scales (*Documented Fact*).
- *Assumption Note:* Exact daily revenue loss and counter delay percentages are unverified operational assumptions pending field deployments.

**Suggested Visual:**
> Split screen: Left side shows a grease-stained, handwritten paper notebook and a vendor weighing tomatoes; right side shows a crowded customer queue waiting at the counter.

**Speaker Notes:**
> "Small vendors run their counters alone. When weighing vegetables or packing grains, their hands are occupied. Navigating complicated dropdowns or English menus simply doesn't fit their workflow. They resort to paper notes or memory, risking arithmetic mistakes. While Hindi voice tools exist, regional merchants speaking Kannada and mixed dialects are left behind."

---

## Slide 3: Our Solution

### Speak-First Billing with Complete Verification
- **Hands-Free Input:** Shopkeepers speak the sale aloud in mixed Kannada, Hindi, or English (e.g., *"Two kg onion, one oil, 500g sakkare"*).
- **Instant Itemized Preview:** Utterances are parsed into structured items, quantities, and units, instantly displayed on a high-contrast screen.
- **Spoken Total & Confirmation:** Text-to-speech reads back the total amount; vendor confirms ("Yes") or speaks corrections (*In Progress*).
- **Automated Stock Sync & Tap Fallbacks:** Confirmed sales decrement stock and update daily totals; every voice action includes full manual tap controls (*In Progress*).

**Suggested Visual:**
> 4-step horizontal process diagram:
> 1. Mic Tap & Speech -> 2. Instant Bill Preview -> 3. Spoken Total & Confirmation -> 4. Automatic Stock Update.

**Speaker Notes:**
> "Hisab Kitab solves this by making voice the primary input. The vendor speaks a sale naturally. The app extracts the items, applies catalog prices, displays a large bill, and reads the total aloud. Crucially, nothing is committed silently: the vendor confirms by saying 'Yes', which instantly records the sale and updates inventory. If anything is wrong, tap buttons provide instant fallback."

---

## Slide 4: How It Works

### Architecture & Technical Pipeline
- **Audio Capture & STT:** Browser `MediaRecorder` captures audio; STT adapter transcribes speech using selected language hint (*In Progress*).
- **Structured LLM Parsing:** Agnostic prompt extracts standardized JSON (`action`, `items`, `quantity`, `unit`, `price_override`) (*In Progress*).
- **Catalog Matching & Session Draft:** SQLite database matches items using multilingual synonyms (Kannada, Hindi, English) while preserving an active multi-turn session draft (*In Progress*).
- **Stock Guard & Spoken Feedback:** Checks stock availability (warns without blocking) and synthesizes audio total via TTS adapter (*Planned*).
- **Persistence Layer:** Confirmed bills, bill items, and correction logs stored in local SQLite database (*In Progress*).

**Suggested Visual:**
> Linear architecture flow diagram:
> `Browser (Audio)` -> `FastAPI Backend` -> `Whisper/STT` -> `LLM Parser (JSON)` -> `SQLite (Synonym Matching & Draft)` -> `TTS Readback` -> `Browser UI`.

**Speaker Notes:**
> "Under the hood, we keep the architecture clean and resilient. The browser records audio and transmits it to our FastAPI backend. The speech model transcribes the regional input, and an LLM extracts structured item triples. Our backend matches these against catalog synonyms, calculates prices deterministically, and holds a session draft for multi-turn corrections. Once confirmed, SQLite records the transaction."

---

## Slide 5: Key Features & Differentiation

### Built for Regional Indian Realities
- **Strict Multilingual Parity:** Equal first-class support for Kannada, Hindi, and English, with support for mid-sentence code-mixing (*Architectural Decision*).
- **Karnataka Local Synonyms & Units:** Native recognition of local vocabulary (e.g., *eerulli*, *alugadde*, *sakkare*, *kattu*, *paav*) mapped to standard units (*Implemented in Test Suite*).
- **Multi-Turn Voice Corrections:** Modify quantities (*"Make rice 3 kg"*), remove items, or update catalog prices permanently (*"Tomato price 40"*) (*Documented in DECISIONS.md*).
- **Voice Queries:** Spoken stock checks (*"How much rice is left?"*) and daily sales summaries (*"What is today's total sales?"*) (*Documented in PRD*).
- **Status:** Core data models and schemas finalized; service endpoints and adapters currently in progress.

**Suggested Visual:**
> Comparison table:
> Standard Billing Apps (Typing required, English/Hindi menus, rigid units, silent saving) vs.
> Hisab Kitab (Voice-driven, Kannada/Hindi/English parity, regional units, spoken confirmation).

**Speaker Notes:**
> "Unlike existing billing software, Hisab Kitab treats Kannada as a peer to Hindi and English, allowing shopkeepers to mix languages naturally. We handle local units like 'kattu' for greens and 'paav' for 250 grams. Shopkeepers can also issue multi-turn corrections or ask for stock levels and daily totals by voice, keeping them completely informed hands-free."

---

## Slide 6: Testing & Validation

### Rigorous Evaluation & Honest Benchmarking
- **46-Case Multilingual Benchmark Suite:** Structured test dataset covering Kannada (14), Hindi (11), English (14), and Code-mixed (7) across 14 operational categories (*Implemented*).
- **Independent Evaluation Harness:** Built `tests/run_accuracy.py` computing item-level triple accuracy `(item, qty, unit)`, complete-bill accuracy, and latency (*Implemented*).
- **Evaluator Self-Tests Verified:** 5 out of 5 internal evaluator validation tests passed cleanly across matching, mismatches, and multi-item triples (*Verified*).
- **Current Live Accuracy Status:** Evaluator is operational and reports 0/46 tested against live model; live end-to-end model accuracy remains unmeasured pending backend parser and catalog completion (*Honest Disclosure*).

**Suggested Visual:**
> Dashboard graphic highlighting the 46 test cases categorized by language and category, accompanied by the terminal snippet showing `5/5 Evaluator Self-Tests Passed`.

**Speaker Notes:**
> "As testing and demo lead, reliability is our priority. We designed a 46-sentence test suite reflecting realistic Karnataka kirana utterances. Our custom evaluation harness measures accuracy per item, per language, and per complete bill. The evaluator passed all five internal self-tests. We are transparent: live end-to-end model accuracy is currently unmeasured until our AI parser and catalog are integrated, ensuring every metric presented is real."

---

## Slide 7: Impact, Roadmap and Demo Plan

### Delivering Hands-Free Retail Speed
- **Intended Value:** Reduces checkout friction at crowded counters, reduces manual calculation errors, and tracks stock automatically (*Intended Impact*).
- **Current Implementation Status:**
  - Rules, PRD, Decisions & Architecture: **Complete**
  - Test Suite & Evaluation Harness: **Complete**
  - Backend Scaffolding & DB Models: **In Progress**
  - Frontend UI & AI Adapters: **In Progress**
- **Live Demo Sequence (90 Seconds):**
  1. *Spoken Sale:* Speak 3-item multilingual utterance -> Display instant bill.
  2. *Audio Readback:* System speaks total via TTS.
  3. *Voice Edit:* "Make rice 3 kg" -> Draft bill updates.
  4. *Confirmation:* "Yes" -> Sale committed and stock decremented.
  5. *Voice Query:* "What is today's total sales?" -> Spoken daily summary.

**Suggested Visual:**
> Roadmap timeline:
> `Hour 0–6: Specs & Testing Suite (Done)` -> `Hour 6–15: Core API, Parser & UI (In Progress)` -> `Hour 15–20: End-to-End Integration` -> `Hour 20–24: Rehearsal & Live Demo`.

**Speaker Notes:**
> "Hisab Kitab bridges the digital divide for small vendors whose hands are busy and whose native language technology often ignores. Our test framework and requirements are locked in, and our team is integrating the core parser and UI. In our live demo, we will show a 3-item sale, a voice correction, a confirmation with stock deduction, and a spoken daily summary. Thank you, and we welcome your questions."
