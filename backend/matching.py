import difflib
from typing import Any

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


def normalize_text(text: str) -> str:
    """Normalize text by lowercasing and stripping whitespace and punctuation."""
    if not text:
        return ""
    return text.lower().strip(" \t\n\r.,!?;:\"'()[]{}")


def extract_item_synonyms(item: dict[str, Any]) -> list[str]:
    """Extract a list of normalized synonyms from a catalogue item dict."""
    synonyms = item.get("synonyms", "")
    if isinstance(synonyms, str):
        syn_list = [normalize_text(s) for s in synonyms.split(",") if normalize_text(s)]
    elif isinstance(synonyms, list):
        syn_list = [normalize_text(str(s)) for s in synonyms if normalize_text(str(s))]
    else:
        syn_list = []
    return syn_list


def compute_similarity(str1: str, str2: str) -> float:
    """Compute similarity ratio between 0.0 and 100.0 using RapidFuzz or difflib fallback."""
    if not str1 or not str2:
        return 0.0
    if str1 == str2:
        return 100.0
    if HAS_RAPIDFUZZ:
        return float(fuzz.ratio(str1, str2))
    return float(difflib.SequenceMatcher(None, str1, str2).ratio() * 100.0)


def find_best_match(
    query: str,
    catalog: list[dict[str, Any]],
    threshold: float = 80.0,
    ambiguity_margin: float = 5.0,
) -> dict[str, Any]:
    """Find the best matching catalogue item using fuzzy string matching (Section 7 B7).

    Matches the query against catalogue item names and synonyms.
    Resolves the best candidate only when score >= threshold and sufficiently unambiguous.

    Returns:
      {
        "query": str,
        "match": dict | None,
        "score": float,
        "confidence": float,
        "ambiguous": bool,
        "candidates": list[dict],
        "message": str,
        "status": "matched" | "ambiguous" | "no_match"
      }
    """
    clean_query = normalize_text(query)
    if not clean_query or not catalog:
        return {
            "query": query,
            "match": None,
            "score": 0.0,
            "confidence": 0.0,
            "ambiguous": False,
            "candidates": [],
            "message": f"Could not find '{query}'. Would you like to add it as a new product?" if query else "No product specified.",
            "status": "no_match",
        }

    scored_candidates = []
    for item in catalog:
        norm_name = normalize_text(item.get("name", ""))
        synonyms = extract_item_synonyms(item)

        # Exact match on product name
        if clean_query == norm_name:
            item_score = 100.0
        # Exact match on synonym
        elif clean_query in synonyms:
            item_score = 100.0
        else:
            name_score = compute_similarity(clean_query, norm_name)
            syn_scores = [compute_similarity(clean_query, s) for s in synonyms]
            item_score = max([name_score] + syn_scores)

        scored_candidates.append({
            "item": item,
            "score": item_score,
            "name": item.get("name", ""),
            "id": item.get("id"),
        })

    # Sort candidates by score descending, then by id ascending for determinism
    scored_candidates.sort(key=lambda x: (-x["score"], x.get("id") or 0))

    top = scored_candidates[0]
    top_score = top["score"]

    if top_score < threshold:
        return {
            "query": query,
            "match": None,
            "score": round(top_score, 2),
            "confidence": round(top_score / 100.0, 4),
            "ambiguous": False,
            "candidates": scored_candidates,
            "message": f"Could not find '{query}'. Would you like to add it as a new product?",
            "status": "no_match",
        }

    # Check for ambiguity among candidates meeting the threshold
    competing = [
        c for c in scored_candidates
        if c["score"] >= threshold and (top_score - c["score"]) < ambiguity_margin
    ]

    if len(competing) > 1:
        cand_names = f"{competing[0]['name']} or {competing[1]['name']}"
        return {
            "query": query,
            "match": None,
            "score": round(top_score, 2),
            "confidence": round(top_score / 100.0, 4),
            "ambiguous": True,
            "candidates": competing,
            "message": f"Did you mean {cand_names}?",
            "status": "ambiguous",
        }

    matched_item = top["item"]
    return {
        "query": query,
        "match": matched_item,
        "score": round(top_score, 2),
        "confidence": round(top_score / 100.0, 4),
        "ambiguous": False,
        "candidates": [top],
        "message": f"Did you mean {matched_item['name']}?",
        "status": "matched",
    }


def match_unknown_word(
    word: str,
    catalog: list[dict[str, Any]],
    threshold: float = 80.0,
) -> dict[str, Any] | None:
    """Find the closest catalogue item for an unrecognized word (Section 7 B7).

    Returns the catalogue item dict if a confident, unambiguous match is found;
    otherwise returns None.
    """
    res = find_best_match(word, catalog, threshold=threshold)
    return res.get("match")

