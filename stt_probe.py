"""
Hisab Kitab: speech-to-text probe (Role A)

Runs every audio file in tests/audio through speech to text and writes
tests/stt_probe_results.csv so you can compare providers and languages.

Setup:
    pip install openai python-dotenv
    # .env must contain STT_API_KEY=...

Usage (from the project root):
    python stt_probe.py hi          # language code: hi, kn, ta, te, ur, en ...
    python stt_probe.py hi tests/audio

To test a different provider, replace only the body of transcribe().
"""
import csv
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".mp4"}


MAX_PROMPT_LEN = 840

# Core shop vocabulary: units, numbers, billing and pricing terms in Hindi & English
CORE_SHOP_TERMS = [
    "किलो", "kilo", "kg", "लीटर", "litre", "ग्राम", "gram", "पैकेट", "packet", "पाव", "pav",
    "आधा", "adha", "डेढ़", "derh", "ढाई", "dhai", "सवा", "sava",
    "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
    "रुपये", "rupaye", "रुपए", "भाव", "bhav", "रेट", "rate", "प्राइस", "price", "टोटल", "total",
]

# Non-Hindi regional dialect words in items.json to skip in favor of Hindi terms
NON_HINDI_DIALECT = {
    "arisi", "sakkare", "tuvaram paruppu", "payatham paruppu", "pasi paruppu",
    "godhumai maavu", "kadugu ennai", "paal", "thayir", "chaapathi", "kaapi",
    "uppu", "manjal", "milagai thool", "kothamalli thool", "jeeragam", "milagu",
    "vengayam", "urulaikizhangu", "thakkali", "kapde dhone ka powder", "brush paste",
}


def load_hint(items_path="data/items.json", max_length=MAX_PROMPT_LEN):
    """Item names joined into a hint string under max_length characters (default 840).

    Prioritizes core Hindi shop terms, units, number words, and primary Hindi product synonyms.
    """
    try:
        items = json.loads(Path(items_path).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        items = []

    seen = set()
    ordered_terms = []

    def add_term(term):
        t = str(term).strip()
        if not t:
            return
        key = t.lower()
        if key not in seen and key not in NON_HINDI_DIALECT:
            seen.add(key)
            ordered_terms.append(t)

    # 1. Essential units, numbers, and price words
    for term in CORE_SHOP_TERMS:
        add_term(term)

    # 2. First priority: Primary Hindi term / first synonym for every item
    for it in items:
        syns = [s.strip() for s in str(it.get("synonyms", "")).split(",") if s.strip()]
        hindi_syns = [s for s in syns if s.lower() not in NON_HINDI_DIALECT]
        if hindi_syns:
            add_term(hindi_syns[0])
        elif it.get("name"):
            add_term(it.get("name"))

    # 3. Second priority: Standard item name and second synonym
    for it in items:
        add_term(it.get("name", ""))
        syns = [s.strip() for s in str(it.get("synonyms", "")).split(",") if s.strip()]
        hindi_syns = [s for s in syns if s.lower() not in NON_HINDI_DIALECT]
        if len(hindi_syns) > 1:
            add_term(hindi_syns[1])

    # 4. Third priority: Remaining Hindi synonyms
    for it in items:
        syns = [s.strip() for s in str(it.get("synonyms", "")).split(",") if s.strip()]
        hindi_syns = [s for s in syns if s.lower() not in NON_HINDI_DIALECT]
        for s in hindi_syns[2:]:
            add_term(s)

    selected = []
    current_len = 0
    for term in ordered_terms:
        # Groq measures prompt length in UTF-8 bytes (reported as characters)
        term_len = max(len(term), len(term.encode("utf-8")))
        sep_len = 2 if selected else 0
        if current_len + sep_len + term_len <= max_length:
            selected.append(term)
            current_len += sep_len + term_len

    return ", ".join(selected)


def transcribe(audio_path, language, hint=""):
    """Default provider: OpenAI Whisper hosted API. Swap this body for another provider."""
    from openai import OpenAI

    # Works with OpenAI or any OpenAI-compatible provider (e.g. Groq):
    #   STT_BASE_URL=https://api.groq.com/openai/v1   STT_MODEL=whisper-large-v3
    client = OpenAI(
        api_key=os.environ["STT_API_KEY"],
        base_url=os.environ.get("STT_BASE_URL") or None,
    )
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model=os.environ.get("STT_MODEL", "whisper-1"),
            file=f,
            language=language,
            prompt=hint or None,
        )
    return result.text.strip()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    language = sys.argv[1]
    folder = Path(sys.argv[2] if len(sys.argv) > 2 else "tests/audio")
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in AUDIO_EXTS)
    if not files:
        print(f"No audio files found in {folder}")
        sys.exit(1)

    hint = load_hint()
    out_path = Path("tests/stt_probe_results.csv")
    rows = []

    for p in files:
        start = time.time()
        try:
            text = transcribe(str(p), language, hint)
            err = ""
        except Exception as e:  # keep going so one bad file does not stop the run
            text, err = "", str(e)
        secs = round(time.time() - start, 2)
        print(f"{p.name}  ({secs}s)  ->  {text or err}")
        rows.append([p.name, language, text, secs, err, "", ""])

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file", "language", "transcript", "seconds", "error", "expected", "correct_yes_no"])
        w.writerows(rows)

    print(f"\nWrote {out_path}. Fill the 'expected' and 'correct_yes_no' columns by hand.")


if __name__ == "__main__":
    main()