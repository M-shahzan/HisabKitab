"""LLM-based natural language parser for Hisab Kitab (Role A).

Parses voice transcripts in Hindi/Hinglish/English into structured billing JSON
matching Section 4.2 of the build guide.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv
from openai import OpenAI

# Reliably load .env from the project root regardless of working directory
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = _PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

DEFAULT_MODEL = "openai/gpt-oss-20b"

# Unit-specific maximum reasonable quantities per single line for retail shop sales
UNIT_QUANTITY_LIMITS: Dict[str, float] = {
    "kg": 100.0,       # Bulk weight items (grains, sugar, potatoes, flour)
    "litre": 50.0,      # Liquids (cooking oils, milk)
    "packet": 50.0,     # Retail packaged goods (spices, biscuits, tea)
    "piece": 50.0,      # Piece items (soaps, dishwash bars, toothpaste)
}
DEFAULT_MAX_QTY = 50.0


def _get_max_reasonable_qty(unit: str) -> float:
    """Return max reasonable single-line quantity based on the item's catalog unit."""
    normalized_unit = str(unit).lower().strip()
    return UNIT_QUANTITY_LIMITS.get(normalized_unit, DEFAULT_MAX_QTY)


VALID_INTENTS = {
    "new_sale",
    "edit_bill",
    "confirm",
    "cancel",
    "query_summary",
    "query_stock",
    "stock_in",
    "stock_out",
    "unclear",
}

VALID_EDIT_ACTIONS = {
    "set_qty",
    "set_price",
    "remove",
}


def validate_parser_response(data: Any) -> Dict[str, Any]:
    """Validate that the parsed output adheres strictly to Section 4.2 contract."""
    if not isinstance(data, dict):
        raise ValueError(f"Parser output must be a dictionary, got {type(data).__name__}")

    intent = data.get("intent")
    if intent not in VALID_INTENTS:
        raise ValueError(f"Invalid intent '{intent}'. Must be one of {VALID_INTENTS}")

    if intent in ("new_sale", "stock_in", "stock_out"):
        items = data.get("items")
        if not isinstance(items, list):
            raise ValueError(f"Parser output for '{intent}' must include an 'items' list.")

    elif intent == "edit_bill":
        edit = data.get("edit")
        if not isinstance(edit, dict):
            raise ValueError("Parser output for 'edit_bill' must include an 'edit' dictionary.")
        if edit.get("action") not in ("set_qty", "set_price", "remove"):
            raise ValueError(f"Invalid edit action '{edit.get('action')}'.")
        if "item_id" not in edit:
            raise ValueError("Edit dictionary missing 'item_id'.")

    return data


SYSTEM_PROMPT = """You are the specialized billing parser for "Hisab Kitab", an Indian voice-first billing web app for local shopkeepers.
You parse spoken transcripts in Indian regional languages (Hindi, Kannada, Tamil, Telugu, Marathi, Gujarati, Bengali, Malayalam, Punjabi, Urdu, and English, or regional code-mixing with English) into structured billing JSON matching Section 4.2 of the build guide.

OUTPUT FORMAT:
Return ONLY a valid JSON object with EXACTLY these fields:
{
  "intent": "new_sale" | "edit_bill" | "confirm" | "cancel" | "query_summary" | "query_stock" | "stock_in" | "stock_out" | "unclear",
  "items": [
    {
      "item_id": <int>,
      "qty": <float or int>,
      "unit": "<string>",
      "price": <float or null>
    }
  ],
  "edit": {
    "action": "set_qty" | "set_price" | "remove",
    "item_id": <int>,
    "value": <float or int or null>
  } | null,
  "query_item_id": <int or null>,
  "unknown_words": [<string>, ...],
  "needs_clarification": "<string or null>"
}

RULES & CONTRACTS:
1. INTENT DETERMINATION:
   - "stock_in": Adding or increasing inventory/stock across any language:
     - Hindi: "Add 10 kg rice to stock", "Stock mein 20 kilo chawal add karo", "10 kilo chini stock mein daalo"
     - Kannada: "Stock ge 10 kg akki serisi", "Stock nalli 10 kg akki haaku"
     - Tamil: "Stock-il 10 kg arisi serka", "Stock-il 5 kilo chini podunga"
     - Telugu: "Stock lo 10 kg biyyam kalapandi", "Stock lo 5 kg chekkera veyandi"
     - Marathi: "Stock madhe 10 kilo tandul taka"
     - Gujarati: "Stock ma 10 kilo chokha umelo"
     - Bengali: "Stock-e 10 kg chal jog koro"
     - English: "Add 15 packets of salt to stock", "Increase sugar stock by 5 kg"
     Put items with item_id, qty, unit in `items`.

   - "stock_out": Removing or decreasing inventory/stock across any language:
     - Hindi: "Remove 2 kg sugar from stock", "Cheeni ka stock 5 kilo kam karo", "Stock se 2 packet namak nikalo"
     - Kannada: "Stock ninda 2 kg sakkare thegiri", "Sakkare stock 2 kg kammi maadi"
     - Tamil: "Stock-ilirundhu 2 kg chini edu", "Chini stock 2 kg kuraikka"
     - Telugu: "Stock nunchi 2 kg chekkera theeyandi", "Chekkera stock 2 kg thagginchandi"
     - Marathi: "Stock madhun 2 kilo sakhar kami kara"
     - Gujarati: "Stock mathi 2 kilo khand ghadado"
     - Bengali: "Stock theke 2 kg chini komao"
     - English: "Reduce 5 kg rice from stock", "Remove 2 kg sugar from stock"
     Put items with item_id, qty, unit in `items`.

   - "query_stock": Inquiries about remaining stock:
     - Hindi: "chawal kitna bacha hai", "kitna stock hai", "how much rice is left"
     - Kannada: "akki stock eshtu ide?", "sakkare kitna ide?"
     - Tamil: "arisi stock evvalavu irukku?", "chini evvalavu irukku?"
     - Telugu: "biyyam stock entha undi?", "chekkera entha undi?"
     - Marathi: "tandul stock kiti ahe?"
     - Bengali: "chal koto ache?"
     - English: "How much rice is in stock?"
     Set `query_item_id` to the matching item_id.

   - "new_sale": Shopkeeper speaks items to sell to a customer:
     - Hindi: "2 kilo chawal dena", "2 kilo chawal, ek kilo cheeni"
     - Kannada: "eradu kilo akki, ondhu kilo sakkare kodi", "2 kg akki beku"
     - Tamil: "irandu kilo arisi, oru kilo chini kudu", "2 kg arisi venum"
     - Telugu: "rendu kilo biyyam, oka kilo chekkera ivvandi"
     - Marathi: "don kilo tandul, ek kilo sakhar dya"
     - Gujarati: "be kilo chokha, ek kilo khand aapo"
     - Bengali: "dui kilo chal, ek kilo chini dao"
     - English: "Give 2 kg rice and 1 kg sugar"

   - "edit_bill": Modifying an active draft bill line ("make rice 3 kg", "chawal teen kilo kar do", "arisi 3 kilo aaku", "sugar hata do", "rate 50 kar do").
   - "confirm": Agreement or confirmation words ("yes", "haan", "ha", "theek hai", "save", "done", "confirm", "sariyaagide", "haudu", "sare", "barobar", "thik ache").
   - "cancel": Cancellation words ("no", "cancel", "nahi", "rehne do", "hatao", "mat karo", "beda", "vendaam", "vaddu", "nako", "dorkar nei").
   - "query_summary": Inquiries about daily sales or totals ("aaj ka hisab", "today total", "ivattina hisab", "inraiya hisab", "ee roju total", "aajchi vikri", "ajker hisab").
   - "unclear": If utterance is unintelligible, ambiguous, or items not found in catalog. Set `unknown_words` and `needs_clarification`.

2. ITEM MAPPING & CATALOG MATCHING:
   - Match items to their exact catalog `id` using names and synonyms in all supported regional languages:
     - Rice: akki, arisi, biyyam, tandul, chal, chokha, chawal, rice, basmati
     - Sugar: sakkare, chini, cheeni, sakkar, panchadara, chekkera, sakhar, khand
     - Toor Dal: arhar dal, tuvar dal, sambar dal, tuvaram paruppu, togari bele, kandi pappu, tur dal
     - Moong Dal: mung dal, yellow dal, payatham paruppu, hesaru bele, pesara pappu, mug dal
     - Wheat Flour: atta, gehun atta, wheat flour, godhumai maavu, godhi hittu, godhuma pindi, gahu pith
     - Mustard Oil: sarson tel, sarson oil, kadugu ennai, sasive enne, aava nune, mohari tel, shorsher tel, rai nu tel
     - Sunflower Oil: cooking oil, refined oil, sunflower tel, surajmukhi tel, suryakanti enne, surya kanthi nune
     - Milk: doodh, paal, haalu, paalu, dudh
     - Curd: dahi, thayir, mosaru, perugu, doi
     - Tea: chai, tea, chaapathi, chaha, cha
     - Coffee: coffee, kaapi, nescafe, bru
     - Salt: namak, uppu, tata salt, iodized salt, mith, noon, mithu, lobon
     - Turmeric Powder: haldi, manjal, arishina, pasupu, halad, holud, haldar
     - Red Chilli Powder: mirchi powder, lal mirch, milagai thool, khara pudi, karam, mensinakayi pudi
     - Coriander Powder: dhaniya powder, dhania powder, kothamalli thool, kothambari pudi, dhaniyala podi, dhane powder
     - Cumin Seeds: jeera, jira, jeeragam, jeerige, jeelakarra, jire
     - Black Pepper: kali mirch, milagu, black pepper, pepper, kari menasu, miriyalu, mire, gol morich
     - Onion: pyaz, kanda, vengayam, onion, eerulli, ullipaya, peyaj, dungli
     - Potato: aloo, alu, batata, urulaikizhangu, potato, alugadde, bangaladumpa, bataka
     - Tomato: tamatar, thakkali, tomato, tamata, tometa, tameta
     - Bath Soap: soap, sabun, lifebuoy, lux, bath soap, sabuna, sabbu
     - Washing Powder: detergent, surf, surf excel, washing powder, kapde dhone ka powder
     - Dishwash Bar: vim bar, bartan sabun, dish soap, dishwash soap
     - Toothpaste: toothpaste, colgate, pepsodent, dant kanti, brush paste
     - Biscuits: biscuit, parle-g, parle g, marie gold, biskut
   - The supplied CATALOG is the sole authority for item IDs. Do NOT assume IDs from examples.
   - If a generic word like 'tel', 'oil', 'enne', or 'nune' is spoken without a specific variety, map to the general cooking/sunflower oil in the catalog.
   - Never invent item IDs. If words refer to items not in the catalog (e.g., 'dragon fruit'), put them in `unknown_words` and ask in `needs_clarification`.

3. NUMBER & UNIT HANDLING:
   - Handle numbers and fractions across regional languages:
     - Digits (1-10):
       - Hindi: ek=1, do=2, teen=3, char=4, panch=5, chhah=6, saat=7, aath=8, nau=9, das=10
       - Kannada: ondu=1, eradu=2, mooru=3, naalku=4, aidu=5, aaru=6, eelu=7, entu=8, ombattu=9, hattu=10
       - Tamil: ondru/oru=1, irandu/rendu=2, moondru=3, naangu=4, ainthu=5, aaru=6, eazhu=7, ettu=8, onpathu=9, pathu=10
       - Telugu: okati=1, rendu=2, moodu=3, naalugu=4, aidu=5, aaru=6, eedu=7, enimidi=8, tommidi=9, padi=10
       - Marathi: ek=1, don=2, teen=3, char=4, paach=5, saha=6, saat=7, aath=8, nau=9, daha=10
       - Gujarati: ek=1, be=2, tran=3, chaar=4, paanch=5, chha=6, saat=7, aath=8, nav=9, das=10
       - Bengali: ek=1, dui=2, tin=3, char=4, paach=5, choy=6, saat=7, aat=8, noy=9, dos=10
     - Fractions:
       - 0.5: adha, ardha, arai, sagam, adhadho, adh, half
       - 0.25: pav, kaalu, kaal, paavu, paa, poya, quarter
       - 0.75: paun, mukkaalu, mukkaal, muppaavu, pono
       - 1.5: derh, dedh, ondhuvare, ondrai, ded, dodh
       - 2.5: dhai, eraduvare, rendarai, adeech, adhi, aadhai
   - Unit conversions:
     - grams to kg: 500g -> 0.5 kg, 250g -> 0.25 kg, 100g -> 0.1 kg
     - half kilo / ardha kilo / arai kilo / sagam kilo -> 0.5 kg
     - Always return the unit corresponding to the catalog item's unit.

4. PRICING CONTRACT (CRITICAL):
   - `price` in `items` ALWAYS means SPOKEN PRICE PER UNIT (e.g., "45 rupaye kilo" -> price: 45.0).
   - If no price is spoken, set `price: null` (backend will use catalog price).
   - For stock adjustments ("stock_in" / "stock_out"), set `price: null`.
   - NEVER return total line amount as price. If a spoken price overrides the catalog, it is the price per unit.

5. EDITS:
   - If modifying an existing bill:
     - The item must be in the CURRENT DRAFT BILL lines.
     - Quantity change: edit: {"action": "set_qty", "item_id": <id>, "value": <new_qty>}
     - Price change: edit: {"action": "set_price", "item_id": <id>, "value": <new_price>}
     - Item removal: edit: {"action": "remove", "item_id": <id>, "value": null}

CRITICAL: The IDs shown below in the examples are for demonstration only. Always use the actual `id` from the runtime CATALOG for the matched item.

EXAMPLES:
Transcript: "Add 10 kg rice to stock"
{"intent": "stock_in", "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock ge 10 kg akki serisi"
{"intent": "stock_in", "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock-il 10 kg arisi serka"
{"intent": "stock_in", "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock lo 10 kg biyyam kalapandi"
{"intent": "stock_in", "items": [{"item_id": 1, "qty": 10.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock ninda 2 kg sakkare thegiri"
{"intent": "stock_out", "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock theke 2 kg chini komao"
{"intent": "stock_out", "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "eradu kilo akki kodi"
{"intent": "new_sale", "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "irandu kilo arisi, oru kilo chini kudu"
{"intent": "new_sale", "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": null}, {"item_id": 2, "qty": 1.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "rendu kilo biyyam, oka kilo chekkera ivvandi"
{"intent": "new_sale", "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": null}, {"item_id": 2, "qty": 1.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Stock mein 20 kilo chawal add karo"
{"intent": "stock_in", "items": [{"item_id": 1, "qty": 20.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Remove 2 kg sugar from stock"
{"intent": "stock_out", "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Cheeni ka stock 5 kilo kam karo"
{"intent": "stock_out", "items": [{"item_id": 2, "qty": 5.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "Add 15 packets of salt"
{"intent": "stock_in", "items": [{"item_id": 12, "qty": 15.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "How much rice is in stock?"
{"intent": "query_stock", "items": [], "edit": null, "query_item_id": 1, "unknown_words": [], "needs_clarification": null}

Transcript: "Give 2 kg rice"
{"intent": "new_sale", "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "2 kilo chawal"
{"intent": "new_sale", "items": [{"item_id": 1, "qty": 2.0, "unit": "kg", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "ek kilo aloo, adha kilo pyaz, ek litre tel"
{"intent": "new_sale", "items": [{"item_id": 19, "qty": 1.0, "unit": "kg", "price": null}, {"item_id": 18, "qty": 0.5, "unit": "kg", "price": null}, {"item_id": 7, "qty": 1.0, "unit": "litre", "price": null}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "chini 2 kilo price hai 45 rupaye kilo"
{"intent": "new_sale", "items": [{"item_id": 2, "qty": 2.0, "unit": "kg", "price": 45.0}], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "chawal teen kilo kar do" (with Rice in current bill)
{"intent": "edit_bill", "items": [], "edit": {"action": "set_qty", "item_id": 1, "value": 3.0}, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "sugar hata do" (with Sugar in current bill)
{"intent": "edit_bill", "items": [], "edit": {"action": "remove", "item_id": 2, "value": null}, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "haan save kar do"
{"intent": "confirm", "items": [], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "nahi cancel"
{"intent": "cancel", "items": [], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "chawal kitna bacha hai"
{"intent": "query_stock", "items": [], "edit": null, "query_item_id": 1, "unknown_words": [], "needs_clarification": null}

Transcript: "aaj ki bikri kitni hui"
{"intent": "query_summary", "items": [], "edit": null, "query_item_id": null, "unknown_words": [], "needs_clarification": null}

Transcript: "do kilo dragon fruit de do"
{"intent": "unclear", "items": [], "edit": null, "query_item_id": null, "unknown_words": ["dragon fruit"], "needs_clarification": "Dragon fruit catalog mein nahi hai."}
"""


def _build_compact_catalog(catalog: Any) -> List[Dict[str, Any]]:
    """Format catalog into a concise list of items with id, name, synonyms, and unit."""
    if not isinstance(catalog, list):
        return []
    compact = []
    for item in catalog:
        if not isinstance(item, dict):
            continue
        raw_id = item.get("id") if item.get("id") is not None else item.get("item_id")
        try:
            item_id = int(raw_id)
        except (ValueError, TypeError):
            continue

        compact.append({
            "id": item_id,
            "name": str(item.get("name", "")).strip(),
            "synonyms": str(item.get("synonyms", "")).strip(),
            "unit": str(item.get("unit", "")).strip() or "kg",
        })
    return compact


def _extract_unknown_words(raw: Dict[str, Any]) -> List[str]:
    """Safely extract unknown_words handling strings and lists without splitting characters."""
    raw_unknown = raw.get("unknown_words")
    words: List[str] = []
    if isinstance(raw_unknown, list):
        for w in raw_unknown:
            if isinstance(w, str) and w.strip():
                words.append(w.strip())
            elif w is not None:
                words.append(str(w).strip())
    elif isinstance(raw_unknown, str) and raw_unknown.strip():
        if "," in raw_unknown:
            words = [part.strip() for part in raw_unknown.split(",") if part.strip()]
        else:
            words = [raw_unknown.strip()]

    # Deduplicate while preserving order
    deduped: List[str] = []
    seen = set()
    for w in words:
        low = w.lower()
        if low not in seen:
            seen.add(low)
            deduped.append(w)
    return deduped


def _detect_stock_intent_from_text(text: Optional[str]) -> Optional[str]:
    """Deterministically detect stock operations from spoken text to prevent misrouting."""
    if not text:
        return None
    t = text.lower().strip()

    # 1. Stock inquiry
    has_stock_word = any(w in t for w in ["stock", "stok", "स्टॉक", "ಸ್ಟಾಕ್", "ஸ்டாக்", "స్టాక్", "સ્ટોક", "স্টক", "اسٹاک"])
    has_query_word = any(w in t for w in ["how much", "kitna", "eshtu", "evvalavu", "entha", "kiti", "ketlu", "koto", "check", "left", "bacha", "ide", "irukku", "undi", "ahe", "ache"])
    if has_stock_word and has_query_word:
        return "query_stock"

    # 2. Stock removal / out
    has_out_verb = any(w in t for w in ["remove", "reduce", "decrease", "kam karo", "kammi", "kuraikka", "thagginchandi", "kami kara", "ghadado", "komao", "kadime", "thegiri", "nikalo", "hatao", "edu", "theeyandi", "kadha"])
    has_from_stock = any(w in t for w in ["from stock", "stock se", "stock ninda", "stock-ilirundhu", "stockil irundhu", "stock nunchi", "stock madhun", "stock mathi", "stock theke", "ka stock", "da stock"])
    if (has_stock_word and has_out_verb) or has_from_stock:
        return "stock_out"

    # 3. Stock addition / in
    has_in_verb = any(w in t for w in ["add", "increase", "serisi", "haaku", "serka", "podunga", "kalapandi", "veyandi", "taka", "umelo", "jog", "badhao", "daalo", "hecchisi", "penchandi", "vadva", "vadharo", "barao"])
    has_to_stock = any(w in t for w in ["to stock", "in stock", "into stock", "stock mein", "stock me", "stock ge", "stock nalli", "stock-il", "stockil", "stock lo", "stock madhe", "stock ma", "stock-e", "stocke"])
    is_add_packets_pattern = ("add" in t and ("packet" in t or "packets" in t))
    if (has_stock_word and has_in_verb) or has_to_stock or is_add_packets_pattern:
        return "stock_in"

    return None


def _validate_and_sanitize(
    raw: Any,
    catalog_map: Dict[int, Dict[str, Any]],
    current_bill: Optional[Dict[str, Any]] = None,
    transcript: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate and enforce the Section 4.2 contract on raw parsed LLM output."""
    if not isinstance(raw, dict):
        return {
            "intent": "unclear",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": "Invalid parser response format.",
        }

    # 1. Intent validation with deterministic stock routing enforcement
    intent = str(raw.get("intent", "unclear")).strip().lower()
    stock_intent = _detect_stock_intent_from_text(transcript)
    if stock_intent:
        intent = stock_intent

    if intent not in VALID_INTENTS:
        intent = "unclear"

    unknown_words = _extract_unknown_words(raw)
    needs_clarification = raw.get("needs_clarification")
    if needs_clarification is not None:
        needs_clarification = str(needs_clarification).strip() or None

    # Extract items present in current draft bill
    bill_lines = current_bill.get("lines", []) if isinstance(current_bill, dict) else []
    bill_item_ids = {
        int(l["item_id"])
        for l in bill_lines
        if isinstance(l, dict) and l.get("item_id") is not None and str(l["item_id"]).isdigit()
    }

    # 2. Items validation
    raw_items = raw.get("items")
    valid_items: List[Dict[str, Any]] = []

    if isinstance(raw_items, list):
        for entry in raw_items:
            if not isinstance(entry, dict):
                continue
            item_id_val = entry.get("item_id")
            try:
                item_id = int(item_id_val)
            except (ValueError, TypeError):
                continue

            if item_id not in catalog_map:
                # Do not guess or keep unrecognized IDs
                item_name = entry.get("name") or str(item_id)
                if item_name not in unknown_words:
                    unknown_words.append(item_name)
                continue

            # Ensure unit strictly matches catalog unit
            unit = catalog_map[item_id].get("unit", "kg")
            item_name = catalog_map[item_id]["name"]
            max_qty = 1000.0 if intent in ("stock_in", "stock_out") else _get_max_reasonable_qty(unit)

            # Validate quantity: must be positive float/int, reject non-positive or unreasonable
            raw_qty = entry.get("qty")
            try:
                if raw_qty is None:
                    raise ValueError("Missing quantity")
                qty = float(raw_qty)
                if qty <= 0:
                    needs_clarification = f"{item_name} ki quantity batayein (kitne {unit} chahiye?)."
                    continue
                # Reject unreasonable quantities based on catalog unit
                if qty > max_qty:
                    qty_disp = int(qty) if qty.is_integer() else round(qty, 2)
                    needs_clarification = (
                        f"{item_name} ki quantity ({qty_disp} {unit}) bahut zyada lag rahi hai. Kripya confirm karein."
                    )
                    continue

                # Format to int if whole number, else keep fractional (0.25, 0.5, 1.25, etc.)
                qty = int(qty) if qty.is_integer() else round(qty, 2)
            except (ValueError, TypeError):
                needs_clarification = f"{item_name} ki quantity clear nahi hai. Kripya batayein kitne {unit} chahiye."
                continue

            # Validate price: non-negative spoken price per unit, or None
            price_val = entry.get("price")
            price: Optional[Union[int, float]] = None
            if price_val is not None:
                try:
                    p = float(price_val)
                    if p >= 0:
                        price = int(p) if p.is_integer() else round(p, 2)
                except (ValueError, TypeError):
                    price = None

            valid_items.append({
                "item_id": item_id,
                "qty": qty,
                "unit": unit,
                "price": price,
            })

    # 3. Edit validation
    edit: Optional[Dict[str, Any]] = None
    if intent == "edit_bill":
        raw_edit = raw.get("edit")
        if not isinstance(raw_edit, dict):
            intent = "unclear"
            if not needs_clarification:
                needs_clarification = "Edit command samajh nahi aayi."
        else:
            action = str(raw_edit.get("action", "")).strip().lower()
            if action not in VALID_EDIT_ACTIONS:
                intent = "unclear"
                if not needs_clarification:
                    needs_clarification = f"Unknown edit action '{action}'."
            else:
                try:
                    edit_item_id = int(raw_edit.get("item_id", 0))
                except (ValueError, TypeError):
                    edit_item_id = 0

                if edit_item_id not in catalog_map:
                    intent = "unclear"
                    if not needs_clarification:
                        needs_clarification = "Item catalog mein nahi mila."
                elif not bill_item_ids:
                    intent = "unclear"
                    if not needs_clarification:
                        needs_clarification = "Active draft bill nahi mila jise edit kiya ja sake."
                elif edit_item_id not in bill_item_ids:
                    # Item is not in the active bill -> return safe unclear with question
                    intent = "unclear"
                    item_name = catalog_map[edit_item_id]["name"]
                    if not needs_clarification:
                        needs_clarification = f"{item_name} current bill mein nahi hai."
                else:
                    # Item is valid and in bill, validate value
                    if action == "set_qty":
                        item_name = catalog_map[edit_item_id]["name"]
                        unit = catalog_map[edit_item_id].get("unit", "kg")
                        max_qty = _get_max_reasonable_qty(unit)
                        try:
                            val_raw = raw_edit.get("value")
                            if val_raw is None:
                                raise ValueError("Missing value")
                            f_val = float(val_raw)
                        except (ValueError, TypeError):
                            f_val = 0.0

                        if f_val <= 0:
                            intent = "unclear"
                            needs_clarification = f"{item_name} ki quantity batayein (kitne {unit} chahiye?)."
                        elif f_val > max_qty:
                            intent = "unclear"
                            f_val_disp = int(f_val) if f_val.is_integer() else round(f_val, 2)
                            needs_clarification = (
                                f"{item_name} ki quantity ({f_val_disp} {unit}) bahut zyada lag rahi hai. Kripya confirm karein."
                            )
                        else:
                            val = int(f_val) if f_val.is_integer() else round(f_val, 2)
                            edit = {"action": "set_qty", "item_id": edit_item_id, "value": val}

                    elif action == "set_price":
                        try:
                            f_val = float(raw_edit.get("value", -1))
                        except (ValueError, TypeError):
                            f_val = -1.0

                        if f_val < 0:
                            intent = "unclear"
                            if not needs_clarification:
                                needs_clarification = "Price zero ya positive number hona chahiye."
                        else:
                            val = int(f_val) if f_val.is_integer() else round(f_val, 2)
                            edit = {"action": "set_price", "item_id": edit_item_id, "value": val}

                    elif action == "remove":
                        edit = {"action": "remove", "item_id": edit_item_id, "value": None}

    # 4. Query item id validation
    query_item_id: Optional[int] = None
    if intent == "query_stock":
        raw_qid = raw.get("query_item_id")
        if raw_qid is not None:
            try:
                qid = int(raw_qid)
                if qid in catalog_map:
                    query_item_id = qid
            except (ValueError, TypeError):
                query_item_id = None

        if query_item_id is None:
            intent = "unclear"
            if not needs_clarification:
                needs_clarification = "Aap kis product ka stock dekhna chahte hain?"

    # 5. Intent and clarification reconciliation
    if intent in ("stock_in", "stock_out"):
        for item in valid_items:
            item["price"] = None
        edit = None
        query_item_id = None

    if intent in ("new_sale", "stock_in", "stock_out"):
        if not valid_items:
            # No valid items recognized
            intent = "unclear"
            if not needs_clarification:
                if unknown_words:
                    needs_clarification = f"{', '.join(unknown_words)} catalog mein nahi mila."
                else:
                    needs_clarification = "Could not identify any valid items from speech."
        elif unknown_words and not needs_clarification:
            # Mixed request: recognized items preserved, unknown items flagged for clarification
            needs_clarification = f"{', '.join(unknown_words)} catalog mein nahi mila."

    return {
        "intent": intent,
        "items": valid_items,
        "edit": edit,
        "query_item_id": query_item_id,
        "unknown_words": unknown_words,
        "needs_clarification": needs_clarification,
    }


def parse(
    transcript: str,
    catalog: List[Dict[str, Any]],
    current_bill: Optional[Dict[str, Any]] = None,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """Parse a voice transcript into structured billing JSON matching Section 4.2.

    Args:
        transcript: The text transcript of shopkeeper speech.
        catalog: List of catalog items (each with id/item_id, name, synonyms, unit).
        current_bill: Optional active draft bill dict.
        language: Optional language code or name (e.g. 'hi', 'kn', 'ta', 'te', 'mr', 'gu', 'bn', 'en').

    Returns:
        JSON-compatible dictionary with exact Section 4.2 keys:
        - intent: 'new_sale' | 'edit_bill' | 'confirm' | 'cancel' | 'query_summary' | 'query_stock' | 'stock_in' | 'stock_out' | 'unclear'
        - items: list of {item_id, qty, unit, price}
        - edit: {action, item_id, value} or None
        - query_item_id: int or None
        - unknown_words: list of str
        - needs_clarification: str or None

    Raises:
        ValueError: If LLM_API_KEY is not configured or transcript is empty.
        RuntimeError: If LLM API request or JSON parsing fails after retry.
    """
    if not transcript or not str(transcript).strip():
        return {
            "intent": "unclear",
            "items": [],
            "edit": None,
            "query_item_id": None,
            "unknown_words": [],
            "needs_clarification": "No speech transcript provided.",
        }

    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        raise ValueError("Missing LLM_API_KEY environment variable. Please configure it in .env.")

    base_url = os.getenv("LLM_BASE_URL") or None
    model = os.getenv("LLM_MODEL") or DEFAULT_MODEL

    compact_catalog = _build_compact_catalog(catalog)
    catalog_map = {item["id"]: item for item in compact_catalog}

    bill_summary: Optional[Dict[str, Any]] = None
    if current_bill and isinstance(current_bill, dict):
        lines = [
            {"item_id": l.get("item_id"), "name": l.get("name"), "qty": l.get("qty")}
            for l in current_bill.get("lines", [])
            if isinstance(l, dict)
        ]
        bill_summary = {
            "bill_id": current_bill.get("bill_id"),
            "lines": lines,
            "total": current_bill.get("total"),
        }

    lang_line = f"\nSPOKEN LANGUAGE: {language}" if language else ""
    user_payload = (
        f"CATALOG:\n{json.dumps(compact_catalog, ensure_ascii=False)}\n\n"
        f"CURRENT DRAFT BILL:\n{json.dumps(bill_summary, ensure_ascii=False) if bill_summary else 'None'}\n\n"
        f"TRANSCRIPT:\n\"{transcript.strip()}\"{lang_line}"
    )

    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=30.0,
    )

    last_error: Optional[Exception] = None

    # Call LLM with one retry on invalid JSON
    for attempt in range(2):
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_payload},
            ]
            if attempt > 0:
                messages.append({
                    "role": "user",
                    "content": "Your previous response was invalid. Return ONLY a valid JSON object matching the exact Section 4.2 schema.",
                })

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM returned an empty response.")

            parsed_data = json.loads(content)
            if not isinstance(parsed_data, dict):
                raise ValueError(f"Expected JSON object, got {type(parsed_data).__name__}")

            return _validate_and_sanitize(parsed_data, catalog_map, current_bill, transcript=transcript)

        except Exception as exc:
            last_error = exc

    # Sanitize exception message to avoid exposing secrets
    err_msg = str(last_error)
    if api_key in err_msg:
        err_msg = err_msg.replace(api_key, "[REDACTED]")
    raise RuntimeError(f"LLM parser request failed: {err_msg}") from None
