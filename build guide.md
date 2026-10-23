# Hisab Kitab: Detailed Build Guide and Team Responsibilities

Project: Voice-first billing and stock app for small shopkeepers (24-hour hackathon) Team: 4 roles (A Voice and AI, B Backend and Data, C Frontend and UX, D Pitch, Testing and Demo) Related documents: Voice Billing PRD, 24-Hour Project Plan, Team Split

This guide says what each person builds, how to build it, and how the pieces fit. Where a tool choice is given, it is a sensible default. Swap it if your team knows something else better, but keep the interfaces in section 4 unchanged.


## 1. The System in One Picture

Shopkeeper speaks, then: Browser (record audio) → Backend → Speech to text → LLM parser (intent plus items) → Matching and business logic (SQLite) → Bill JSON → Browser (show bill, speak total).

The shopkeeper then says yes, no, or an edit. Edits go through the same pipeline and update the same draft bill. A saved bill reduces stock.

Key design choice: the LLM receives the shop's item catalog (names, synonyms, units) in its prompt and returns catalog item ids directly. This is simpler and more accurate than matching strings afterwards. Fuzzy matching is only a fallback.


## 2. Default Tech Stack


| Layer | Default | Why | Fallback |
| --- | --- | --- | --- |
| Frontend | Plain HTML, CSS and JavaScript, or Vite and React | Fast to build, mobile friendly | Any framework your frontend lead knows |
| Audio capture | Browser MediaRecorder | No install, works on phones | Web Speech API (see Role A) |
| Speech to text | Whisper (hosted API, or open model if you have a GPU) | Multilingual, accepts a language and a hint prompt | Bhashini API for Indian languages, or browser Web Speech API |
| Parsing | LLM API with JSON-only output | Handles messy speech and slang | Rule-based parser for numbers and units |
| Backend | Python FastAPI | Quick to write, easy JSON | Node and Express |
| Database | SQLite | Zero setup, one file | JSON files |
| Text to speech | Cloud TTS with a voice for your language | Natural audio | Browser speechSynthesis |
| Hosting | Local laptop plus an HTTPS tunnel (ngrok or Cloudflare Tunnel) | Phones need HTTPS for the microphone | Deploy to a free host |


Important: phone browsers only allow microphone access on HTTPS pages (or localhost on the same device). Set up the tunnel in hour 1, not hour 20.


## 3. Repository Structure

```text
hisab-kitab/
  backend/
    main.py          # FastAPI app and routes
    db.py            # SQLite helpers
    parser.py        # LLM prompt and parse call
    stt.py           # speech to text wrapper
    matching.py      # fallback fuzzy matching
    seed.py          # resets demo data
  frontend/
    index.html       # sale screen
    summary.html     # daily summary and stock
    app.js           # recording, API calls, state
    styles.css
  data/
    items.json       # catalog with synonyms
    test_sentences.csv
  tests/
    run_accuracy.py  # accuracy script
    audio/           # recorded test clips
  README.md
```

Git rules: one main branch, each person works in a branch named by role (voice, backend, frontend), merge to main at every sync point and after any working milestone. Never push a broken main after hour 11. Keep API keys in a .env file that is listed in .gitignore.


## 4. Shared Contracts (agree in hour 2, then freeze)


### 4.1 Database schema (owner: B)

```sql
CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, synonyms TEXT, unit TEXT, price REAL);
CREATE TABLE stock (item_id INTEGER PRIMARY KEY, quantity REAL, low_threshold REAL);
CREATE TABLE sales (id INTEGER PRIMARY KEY, created_at TEXT, total REAL);
CREATE TABLE sale_items (sale_id INTEGER, item_id INTEGER, quantity REAL, unit_price REAL);
CREATE TABLE corrections (id INTEGER PRIMARY KEY, heard_text TEXT, item_id INTEGER, created_at TEXT);
```

synonyms is a comma-separated list in the script the speech model outputs (for example native script and common romanized spellings). Draft bills are held in memory on the server (a Python dictionary keyed by bill id) until saved.


### 4.2 Parser output (owner: A)

The LLM returns this JSON for every utterance:

```json
{
  "intent": "new_sale | edit_bill | confirm | cancel | query_summary | query_stock | unclear",
  "items": [ {"item_id": 3, "qty": 2, "unit": "kg", "price": null} ],
  "edit": {"action": "set_qty | remove | set_price", "item_id": 3, "value": 3},
  "query_item_id": null,
  "unknown_words": ["sakkare"],
  "needs_clarification": null
}
```

Only the fields relevant to the intent are filled. price is the spoken price per unit or total for that line (state this rule in the prompt and be consistent).


### 4.3 API endpoints (owner: B, consumer: C)


| Endpoint | Request | Response |
| --- | --- | --- |
| POST /voice | audio file, optional bill_id, language | {transcript, intent, bill, message} |
| POST /confirm | {bill_id} | {sale_id, total, low_stock: []} |
| POST /cancel | {bill_id} | {ok: true} |
| GET /summary | ?date=YYYY-MM-DD | {total, count, top_items, low_stock} |
| GET /stock | none | list of {item_id, name, quantity, unit} |
| POST /correction | {heard_text, item_id} | {ok: true} |


The bill object:

```json
{"bill_id": "b1", "lines": [{"item_id": 3, "name": "Rice", "qty": 2, "unit": "kg", "unit_price": 60, "amount": 120}], "total": 120, "status": "draft"}
```

message is the short sentence the app speaks aloud, such as the total read-back or a clarifying question. Having the backend produce it keeps the frontend simple.

Mock first: B publishes a mock_voice.json with a sample response in hour 2 so C can build the full UI without waiting.


## 5. Hours 0 to 2: Everyone Together

- Pick the demo language and shop type. A native speaker says 10 sale sentences into the candidate speech provider. If most items are misheard, use Hindi for the demo and be honest about it in the pitch.
- Pick providers (one speech to text, one LLM, one TTS). Spend no more than 30 minutes comparing.
- Write items.json: 20 to 30 items for the chosen shop type, each with name, synonyms, unit, price, starting stock and low-stock threshold. Real shop sentences from D make the synonym list far better.
- Freeze section 4. Put it in the README.
- Set up the HTTPS tunnel and confirm a phone can open a test page and use its microphone.
- Create the repo and branches. Everyone pulls and runs a hello-world.

## 6. Role A: Voice and AI Lead (detailed)


### A1. Audio in (hour 2 to 4)

What: get clean audio from the phone to the backend. How:

- C records with MediaRecorder and uploads a blob. A tests the backend with saved files first.
- Convert to a format the speech provider accepts (WAV or MP3) with ffmpeg if needed.
- Ask the shopkeeper for 3 to 6 seconds per sale. Short clips transcribe faster and more accurately.

### A2. Speech to text wrapper (hour 2 to 5)

What: stt.py with one function transcribe(audio_path, language) -> text. How:

- Pass the language code explicitly (for example hi, kn, ta). Do not rely on auto-detect for short clips.
- Pass a hint prompt containing the item names from the catalog. This noticeably improves recognition of item names on Whisper-style models.
- Add a fallback: the browser Web Speech API (Chrome) can recognize several Indian languages with no key. C can call it from the page if the backend STT fails. Treat it as a safety net, not the main path.
- Time every call and log it. You will need the numbers for the pitch.

### A3. Parsing prompt (hour 3 to 8)

What: parser.py with parse(transcript, catalog, current_bill) -> JSON (section 4.2). How: use a system prompt along these lines, then tune on real sentences.

```
You are the billing parser for a small shop. Input is a transcript of what
the shopkeeper said, in any Indian language or a mix with English.
CATALOG (id, names, unit): {catalog}
CURRENT DRAFT BILL (may be empty): {bill}
Return ONLY valid JSON matching the schema. No explanation.
Rules:
- Map every item to a catalog id using names and synonyms. If nothing fits,
  put the heard word in unknown_words.
- Convert units to the catalog unit (grams to kg, half kilo = 0.5 kg,
  dozen = 12 pieces, pav = 0.25 kg).
- A spoken price overrides the catalog price. Say whether it is per unit.
- Words like yes/haan/save mean confirm. no/cancel/rehne do mean cancel.
- If a current bill exists and the user says change/remove/make it, use
  edit_bill with the right item_id.
- If quantity or item is unclear, set needs_clarification to one short question.
```

Tips:

- Ask the API for JSON-only output, then wrap the parse in try/except and retry once if the JSON is invalid.
- Keep the catalog compact (id, main name, synonyms, unit). Long prompts add latency.
- Use a fast, inexpensive model first. Move to a stronger one only if accuracy needs it.
- Add 5 to 8 worked examples from real sentences in the prompt (few-shot). This usually helps more than extra rules.

### A4. Number and unit handling (hour 6 to 10)

What: make quantities and prices correct. How:

- Test spoken numbers in your language ("dhai kilo" is 2.5 kg, "derh" is 1.5, "sava" is 1.25). Add the common ones to the prompt as a lookup table.
- After the LLM replies, run a sanity check in code: reject negative or absurd quantities (for example more than 100 kg in one line) and ask for confirmation.

### A5. Spoken replies (hour 8 to 12)

What: produce the short sentence that gets read aloud. How: build it from a template in code, not from the LLM, so it is fast and predictable. Example: Rice 2 kilo, oil 1 litre. Total 270 rupees. Save? Translate the template strings into the demo language once. Use TTS (cloud or browser speechSynthesis) to speak it. Test the voice with real numbers, since TTS often mispronounces them.


### A6. Accuracy script (hour 11 to 15)

What: tests/run_accuracy.py. How: read data/test_sentences.csv (audio path, expected items with qty), call the pipeline for each, compare, print overall item accuracy, a list of failures and average latency. Save results with a timestamp so you can show improvement over time.


### A7. Tuning (hour 15 to 19)

How: sort failures by type (item name, quantity, unit, intent). Fix the biggest group first by adding synonyms, few-shot examples or hint words. Rerun the full set after every change and keep the change only if the score does not drop.


### A8. Stretch: personalization

How: after each confirmed correction, store (heard_text, item_id). Before parsing, add the user's most frequent corrections to the prompt as "this shopkeeper often says X meaning Y". Apply a mapping only after the same fix appears twice.

A is done when: at least 85% item accuracy on the test set, under 4 seconds to a parsed result, and the parser returns valid JSON on every test sentence.


## 7. Role B: Backend and Data Lead (detailed)


### B1. Setup (hour 0 to 2)

- Create the FastAPI project, enable CORS for the frontend origin, and add a /health route.
- Write seed.py that creates the tables and loads items.json and starting stock. It must be re-runnable in under 5 seconds so you can reset before every rehearsal.
- Create the mock response file so C can start immediately.

### B2. Draft bill logic (hour 2 to 7)

What: build and hold the draft bill. How:

- Keep bills = {} in memory. On new_sale, create a bill id, add lines from the parser output using the catalog price (or the spoken price when present), and compute amount per line and the total.
- Round amounts to whole rupees for display, but store exact values.
- On edit_bill, find the line by item_id and set quantity, price or remove it. Recompute the total.
- Return the full bill every time, so the frontend never has to compute anything.

### B3. /voice endpoint (hour 4 to 8)

Orchestrates everything: receive audio, call A's transcribe, call A's parse, apply the intent (create bill, edit bill, confirm, cancel, query), and return {transcript, intent, bill, message}. Start with a stub that returns hard-coded data, then replace pieces with A's real functions as they are ready. Log each stage's time.


### B4. Confirm and stock (hour 7 to 11)

How: on /confirm, in one database transaction insert into sales and sale_items, subtract quantities from stock, and return any items now below low_threshold. If stock would go negative, allow it but flag it (shopkeepers often sell before updating stock).


### B5. Summary and stock queries (hour 11 to 15)

How: /summary runs three queries: total and count of sales for the date, the top 3 items by quantity or revenue, and items below threshold. Build the spoken message from a template, for example Today you sold 4,320 rupees across 37 bills. Top items: rice, oil, sugar. Low stock: sugar. For "how much rice is left" read from stock.


### B6. Corrections log (hour 8 to 11)

The frontend sends /correction when a user fixes an item. Insert the row and keep it simple. This table feeds the stretch personalization and the accuracy story.


### B7. Fallback matching (hour 8 to 12)

How: if the parser returns an unknown word, use rapidfuzz to find the closest synonym with a score threshold (for example 80). If a match is found, ask Did you mean <item>?. If not, ask whether to add a new item.


### B8. Integration and deployment (all day)

- You own main. Merge from voice and frontend at hours 6, 11, 15 and 19.
- Run the full flow yourself after every merge.
- Start the tunnel, run the server and share the URL. Keep the server running with logs visible.
- Write the README with run steps (install, .env, python seed.py, uvicorn main:app).
B is done when: speech to saved sale works with no manual database edits, /summary is correct against hand-checked sales, and seed.py resets cleanly.


## 8. Role C: Frontend and UX Lead (detailed)


### C1. Design (hour 0 to 2)

- Sketch three screens on paper: Sale (mic, transcript, bill, total, confirm and cancel), Summary (day total, top items, low stock) and Stock (item list with quantities).
- Rules: one primary action per screen, a minimum 20px body size, a very large mic button, high contrast, and numbers shown larger than labels. The shopkeeper may have wet hands and a crowded counter.

### C2. Recording (hour 2 to 5)

How:

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const rec = new MediaRecorder(stream);
let chunks = [];
rec.ondataavailable = e => chunks.push(e.data);
rec.onstop = async () => {
  const blob = new Blob(chunks, { type: rec.mimeType });
  chunks = [];
  const form = new FormData();
  form.append('audio', blob, 'sale.webm');
  if (billId) form.append('bill_id', billId);
  const res = await fetch(API + '/voice', { method: 'POST', body: form });
  render(await res.json());
};
```

- Use tap to start and tap to stop at first (hold-to-talk is harder on touch screens). Add automatic stop after silence once the basics work (check volume with an AnalyserNode, stop after about 1.2 seconds below a threshold).
- Show a clear state on the button: ready, listening, thinking.

### C3. Screen state flow (hour 3 to 8)

Keep one small state object: idle, listening, processing, showing_bill. After a response, show the transcript (so the shopkeeper can see what was heard), the bill card and the total in large digits, then play the message audio. Keep billId in a variable so follow-up commands (edit, yes, no) attach to the same bill.


### C4. Audio playback (hour 6 to 10)

Play the TTS audio returned by the backend, or call speechSynthesis.speak with the message text and the right language code if the browser voice is good enough. Test on the real demo phone, because some phones lack voices for regional languages. Add a replay button.


### C5. Confirm, cancel and edit by tap (hour 8 to 13)

- Big green Confirm and red Cancel buttons call /confirm and /cancel.
- Each bill line has plus and minus buttons and a remove icon, which update the bill locally and send an edit to the backend. This is the tap fallback for every voice action.
- When a line was changed because of a correction, call /correction with the heard text and the item id.

### C6. Summary and stock screens (hour 11 to 15)

A button for "Today" that calls /summary, shows the totals and plays the message. A stock list that calls /stock with low-stock items highlighted.


### C7. Error and empty states (hour 12 to 16)

Microphone permission denied, network failure, silent recording and unclear speech all need a visible message and a clear next step (retry, or type). Add a loading indicator that appears within 200 ms of stopping the recording.


### C8. Polish and device testing (hour 15 to 19)

Test on the demo phone in portrait, with the screen locked and unlocked, in a noisy place and on a weak connection. Make sure nothing scrolls sideways, the bill fits one screen, and the total is readable from arm's length. Add a small logo and the product name.

C is done when: a first-time user completes a bill without explanation, every voice action has a tap alternative, and the page works on the demo phone over the tunnel.


## 9. Role D: Pitch, Testing and Demo Lead (detailed)


### D1. Real user research (hour 0 to 6, in parallel)

What: two or three short conversations with real shopkeepers or helpers. How: ask five questions. How do you record sales today? What slows you down at the counter? What mistakes do you make? What words do you use for your items and units? Would you speak to your phone if it saved time? Note exact phrases and one usable quote. Ask permission before quoting anyone, and do not record without consent.


### D2. Test sentence set (hour 0 to 4)

How: write at least 30 sentences in a CSV with columns id, sentence, expected_items, expected_qty, expected_unit, category. Cover:

- single item (6)
- three items in one sentence (6)
- spoken price (4)
- quantity edits and removals (6)
- queries such as daily total and stock (4)
- slang, local item names and mixed units (4)
Use the real phrases from D1. Share the CSV with A in hour 4.


### D3. Recording protocol (hour 4 to 11)

How: record each sentence as a separate audio file named by id, from at least 2 speakers, on the phone you will demo with. Record each sentence twice: quiet room and with background noise (a fan or a cafe sound). Keep a short log of speaker, device and noise level. This gives you honest accuracy numbers by condition.


### D4. Accuracy measurement (hour 11 to 19)

Definition (write it on a slide): item accuracy is the number of correct (item, quantity, unit) triples divided by the number of expected triples. Report it overall and by condition (quiet and noisy), and report average time to bill. Run the script with A after each tuning round and keep the history. Chart the improvement over time. Use only numbers you measured.


### D5. Pitch deck (hour 12 to 22)

Seven slides, as in the project plan:

- Title and tagline
- Problem (the notebook at a busy counter, with the real quote)
- Gap (voice billing exists mostly for Hindi and Hinglish; your focus is the difference)
- Solution and live demo
- How it works (one pipeline diagram)
- Results (measured accuracy and speed, user feedback)
- Impact and next steps
Design rules: big text, one idea per slide, almost no bullet paragraphs. The demo carries the pitch.


### D6. Demo script (hour 15 to 22)

Write the exact sentences to speak, in order, and the exact responses you expect:

- A three-item sale. Show the bill and hear the total.
- A correction ("make rice three kilo").
- "Yes". Show stock reducing.
- "How much did I sell today?" Hear the answer.
- Show the accuracy chart.
Mark which speaker uses which phrases. Practice the exact sentences until they work every time, and keep a second set of equivalent sentences ready.


### D7. Backup video (hour 20 to 22)

Record a screen-and-audio run of the full demo on the demo phone. Keep it under 90 seconds. Save it on the laptop, the phone and a USB drive.


### D8. Rehearsal (hour 22 to 24)

Three full run-throughs with a timer, one of them with the team acting as hostile judges asking the questions from the project plan. Decide who speaks, who drives the phone and who answers technical questions.

D is done when: the pitch fits 3 to 5 minutes, every number on a slide was measured, the backup video exists and the demo driver can run it twice in a row without errors.


## 10. Hour-by-Hour Timeline by Role


| Hours | A: Voice and AI | B: Backend and Data | C: Frontend and UX | D: Pitch and Testing |
| --- | --- | --- | --- | --- |
| 0 to 2 | Test STT with a native speaker, choose providers | Repo, schema, seed, mock endpoint | Wireframes, tunnel check | Sentence list, shopkeeper contact |
| 2 to 6 | Audio in, STT wrapper, first parsing prompt | /voice stub, draft bill logic | Recording, mock UI, bill card | Interviews, first recordings |
| 6 to 11 | Numbers and units, spoken replies, edit and confirm parsing | Confirm, stock, corrections log, merge | Confirm and edit UI, live API | Full recording set |
| 11 to 15 | Accuracy script, first tuning | Summary, stock queries, fallback matching | Summary and stock screens, error states | First accuracy run, deck draft |
| 15 to 19 | Tuning, stretch personalization | Stretch udhaar or help A, merge | Polish, device testing | Final numbers, chart, user feedback |
| 19 to 22 | Bug fixes only | Bug fixes, final deploy, reset script | Bug fixes only | Backup video, deck final |
| 22 to 24 | Rehearse | Rehearse, keep server running | Rehearse | Rehearse, lead pitch |



## 11. Sync Points

At hours 6, 11, 15 and 19, stop for 15 minutes. Each person shows what works. Check against these gates:

- Hour 6: speak a sentence, see a bill on screen.
- Hour 11: three different sales work end to end without code changes.
- Hour 15: MVP list complete. Decide whether to attempt a stretch goal. If anything is shaky, spend the next 4 hours fixing it.
- Hour 19: feature freeze. Only bug fixes after this.

## 12. Common Problems and Quick Fixes


| Problem | Likely cause | Fix |
| --- | --- | --- |
| Microphone does not work on the phone | Page not on HTTPS | Use the tunnel URL, not the local IP |
| Audio uploads but the transcript is empty | Wrong format or silent clip | Check the file plays, convert with ffmpeg, record at least 2 seconds |
| Transcript is correct but items are wrong | Synonyms missing | Add the heard word to the item's synonyms, add few-shot examples |
| LLM returns invalid JSON | Output includes text | Ask for JSON only, strip code fences, retry once |
| Total is wrong | Unit or price rule inconsistent | Fix the rule once in the prompt, add a unit test with 5 bills |
| It takes more than 6 seconds | Long prompt, slow model, large audio | Shorten the catalog, use a faster model, trim silence, record shorter clips |
| TTS says numbers badly | Voice lacks the language | Try another voice, spell numbers as words in the template |
| Works at your desk, fails at the demo | Noise, Wi-Fi or cold start | Test at the venue early, keep the backup video, warm the server |



## 13. Rules for the Whole Team

- Do not change section 4 without telling everyone and updating the README.
- Every function gets one real-sentence test before it is called done.
- If anyone is stuck for 30 minutes, pair with the backup buddy (A with B, C with D).
- Do not add features after hour 15 unless the MVP list is fully working.
- Cut in this order if time runs out: second language, udhaar, personalization, low-stock alerts, WhatsApp sharing. Never cut the confirmation step, voice correction, stock update or the backup video.
- Keep all API keys private, and never commit them.
- Be honest in the pitch: sample data is sample data, and report only measured results.

## 14. Final Checklist

- [ ] Three-item sale works end to end on the demo phone.
- [ ] Edit by voice and by tap both work.
- [ ] Confirmation saves the sale and reduces stock.
- [ ] Daily summary works by voice.
- [ ] seed.py resets the demo data cleanly.
- [ ] Accuracy numbers measured and written down.
- [ ] Backup video saved in three places.
- [ ] Deck finished, rehearsed three times with a timer.
- [ ] README and setup steps work on a clean machine.
- [ ] Everyone can run the demo and answer the likely judge questions.