import os
from pathlib import Path
from typing import Any, Optional, Union

from dotenv import load_dotenv
from openai import OpenAI

# Reliably load .env from the project root regardless of working directory
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = _PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

DEFAULT_MODEL = "whisper-large-v3"
MAX_HINT_LENGTH = 840

SUPPORTED_LANGUAGES = {
    "hi": {"name": "Hindi", "native": "हिंदी", "code": "hi", "bcp47": "hi-IN"},
    "en": {"name": "English", "native": "English", "code": "en", "bcp47": "en-IN"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "code": "kn", "bcp47": "kn-IN"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "code": "ta", "bcp47": "ta-IN"},
    "te": {"name": "Telugu", "native": "తెలుగు", "code": "te", "bcp47": "te-IN"},
    "mr": {"name": "Marathi", "native": "मराठी", "code": "mr", "bcp47": "mr-IN"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "code": "gu", "bcp47": "gu-IN"},
    "bn": {"name": "Bengali", "native": "বাংলা", "code": "bn", "bcp47": "bn-IN"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "code": "ml", "bcp47": "ml-IN"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "code": "pa", "bcp47": "pa-IN"},
    "ur": {"name": "Urdu", "native": "اردو", "code": "ur", "bcp47": "ur-IN"},
}

# Alias lookup for language names and variants
_LANGUAGE_ALIASES = {
    "hindi": "hi", "hi": "hi", "hi-in": "hi", "hi_in": "hi", "hinglish": "hi",
    "english": "en", "en": "en", "en-in": "en", "en_in": "en", "en-us": "en", "en_us": "en",
    "kannada": "kn", "kn": "kn", "kn-in": "kn", "kn_in": "kn", "kanglish": "kn",
    "tamil": "ta", "ta": "ta", "ta-in": "ta", "ta_in": "ta", "tanglish": "ta",
    "telugu": "te", "te": "te", "te-in": "te", "te_in": "te", "tenglish": "te",
    "marathi": "mr", "mr": "mr", "mr-in": "mr", "mr_in": "mr",
    "gujarati": "gu", "gu": "gu", "gu-in": "gu", "gu_in": "gu",
    "bengali": "bn", "bangla": "bn", "bn": "bn", "bn-in": "bn", "bn_in": "bn",
    "malayalam": "ml", "ml": "ml", "ml-in": "ml", "ml_in": "ml",
    "punjabi": "pa", "pa": "pa", "pa-in": "pa", "pa_in": "pa",
    "urdu": "ur", "ur": "ur", "ur-in": "ur", "ur_in": "ur",
}

# Regional shop vocabulary hints to bias Whisper for higher recognition accuracy
LANGUAGE_HINTS = {
    "hi": "चावल, चीनी, दाल, तेल, दूध, नमक, आटा, प्याज, आलू, टमाटर, साबुन, बिस्कुट, किलो, लीटर, पैकेट, पाव, आधा, डेढ़, ढाई, सवा, स्टॉक, भाव",
    "kn": "ಅಕ್ಕಿ, ಸಕ್ಕರೆ, ಬೇಳೆ, ಹಾಲು, ಎಣ್ಣೆ, ಉಪ್ಪು, ಈರುಳ್ಳಿ, ಆಲೂಗಡ್ಡೆ, ಟೊಮೆಟೊ, ಸಾಬೂನು, ಬಿಸ್ಕತ್ತು, ಕೆಜಿ, ಕಿಲೋ, ಲೀಟರ್, ಪ್ಯಾಕೆಟ್, ಅರ್ಧ, ಕಾಲು, ಮುಕ್ಕಾಲು, ಸ್ಟಾಕ್",
    "ta": "அரிசி, சர்க்கரை, பருப்பு, பால், எண்ணெய், உப்பு, வெங்காயம், உருளைக்கிழங்கு, தக்காளி, சோப்பு, பிஸ்கட், கிலோ, லிட்டர், பாக்கெட், அரை, கால், முக்கால், ஸ்டாக்",
    "te": "బియ్యం, చక్కెర, పప్పు, పాలు, నూనె, ఉప్పు, ఉల్లిపాయ, బంగాళాదుంప, టమాట, సబ్బు, బిస్కెట్, కేజీ, కిలో, లీటర్, ప్యాకెట్, సగం, పావు, ముప్పావు, స్టాక్",
    "mr": "तांदूळ, साखर, डाळ, तेल, दूध, मीठ, कांदा, बटाटा, टोमॅटो, साबण, बिस्कीट, किलो, लिटर, पाकीट, अर्धा, पाव, पाऊण, दीड, अडीच, स्टॉक",
    "gu": "ચોખા, ખાંડ, દાળ, તેલ, દૂધ, મીઠું, ડુંગળી, બટાકા, ટામેટા, સાબુ, બિસ્કિટ, કિલો, લીટર, પેકેટ, અડધો, પા, પોણો, દોઢ, અઢી, સ્ટોક",
    "bn": "চাল, চিনি, ডাল, তেল, দুধ, নুন, পেঁয়াজ, আলু, টমেটো, সাবান, বিস্কুট, কেজি, কিলো, লিটার, প্যাকেট, আধ, পোয়া, দেড়, আড়াই, স্টক",
    "ml": "അരി, പഞ്ചസാര, പരിപ്പ്, എണ്ണ, പാൽ, ഉപ്പ്, ഉള്ളി, ഉരുളക്കിഴങ്ങ്, തക്കാളി, സോപ്പ്, ബിസ്ക്കറ്റ്, കിലോഗ്രാം, കിലോ, ലിറ്റർ, പാക്കറ്റ്, അര, കാൽ, മുക്കാൽ, സ്റ്റോക്ക്",
    "pa": "ਚਾਵਲ, ਖੰਡ, ਦਾਲ, ਤੇਲ, ਦੁੱਧ, ਲੂਣ, ਪਿਆਜ਼, ਆਲੂ, ਟਮਾਟਰ, ਸਾਬਣ, ਬਿਸਕੁਟ, ਕਿਲੋ, ਲੀਟਰ, ਪੈਕਟ, ਅੱਧਾ, ਪਾਓ, ਪੌਣਾ, ਡੇਢ, ਢਾਈ, ਸਟਾਕ",
    "ur": "چاول، چینی، دال، تیل، دودھ، نمک، پیاز، آلو، ٹماٹر، صابن، بسکٹ، کلو، لیٹر، پیکٹ، ادھا، پاؤ، ڈیڑھ، ڈھائی، اسٹاک",
    "en": "rice, sugar, dal, oil, milk, salt, onion, potato, tomato, soap, biscuits, kg, kilo, litre, packet, half, quarter, stock, rupees",
}


def normalize_language(language: Optional[str]) -> str:
    """Normalize any language string, name, or BCP-47 tag to a standard 2-letter ISO code."""
    if not language:
        return "hi"
    clean = str(language).strip().lower()
    if clean in _LANGUAGE_ALIASES:
        return _LANGUAGE_ALIASES[clean]
    # Check if prefix matches
    prefix = clean.split("-")[0].split("_")[0]
    if prefix in _LANGUAGE_ALIASES:
        return _LANGUAGE_ALIASES[prefix]
    # Return 2-character code if plausible, else fallback to 'hi'
    return clean[:2] if len(clean) >= 2 else "hi"


def get_language_hint(language: str) -> str:
    """Retrieve tailored grocery vocabulary hint for a language code."""
    norm = normalize_language(language)
    return LANGUAGE_HINTS.get(norm, LANGUAGE_HINTS["hi"])


def _truncate_hint(hint: str, max_length: int = MAX_HINT_LENGTH) -> str:
    """Trim hint string to stay within max_length in both character and UTF-8 byte count."""
    if not hint:
        return ""
    trimmed = hint.strip()
    if len(trimmed.encode("utf-8")) > max_length:
        trimmed = trimmed.encode("utf-8")[:max_length].decode("utf-8", errors="ignore")
    if len(trimmed) > max_length:
        trimmed = trimmed[:max_length]
    return trimmed


def transcribe(
    audio: Union[str, Path, bytes, Any],
    language: str = "hi",
    hint: str = "",
    hint_prompt: Optional[str] = None,
) -> str:
    """Transcribe audio using Groq-hosted Whisper or OpenAI-compatible STT.

    Args:
        audio: Path to the audio file (str or Path), bytes, or file-like object.
        language: Language code or name for transcription (e.g., 'hi', 'kn', 'ta', 'te', 'mr', 'gu', 'bn', 'en').
        hint: Optional vocabulary hint prompt to bias recognition.
        hint_prompt: Optional alias for hint parameter.

    Returns:
        Stripped transcript text as a string.

    Raises:
        ValueError: If STT_API_KEY is not set or language is empty.
        FileNotFoundError: If the audio file does not exist.
        RuntimeError: If the transcription API call fails.
    """
    api_key = os.getenv("STT_API_KEY")
    if not api_key:
        raise ValueError("Missing STT_API_KEY environment variable. Please configure it in .env.")

    if not language:
        raise ValueError("Language parameter is required (e.g., 'hi').")

    norm_lang = normalize_language(language)

    base_url = os.getenv("STT_BASE_URL") or None
    model = os.getenv("STT_MODEL") or DEFAULT_MODEL

    effective_hint = hint or hint_prompt or get_language_hint(norm_lang)
    sanitized_hint = _truncate_hint(effective_hint, max_length=MAX_HINT_LENGTH)

    file_to_send = None
    file_handle = None
    try:
        if isinstance(audio, (str, Path)):
            path_obj = Path(audio)
            if not path_obj.is_file():
                raise FileNotFoundError(f"Audio file not found: {audio}")
            file_handle = open(path_obj, "rb")
            file_to_send = file_handle
        elif isinstance(audio, (bytes, bytearray)):
            if len(audio) == 0:
                raise ValueError("Audio bytes are empty.")
            file_to_send = ("audio.webm", bytes(audio), "audio/webm")
        elif hasattr(audio, "read"):
            data = audio.read()
            if len(data) == 0:
                raise ValueError("Audio stream is empty.")
            file_to_send = ("audio.webm", data, "audio/webm")
        else:
            raise ValueError(f"Invalid audio input type: {type(audio).__name__}")

        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=30.0,
        )
        response = client.audio.transcriptions.create(
            model=model,
            file=file_to_send,
            language=norm_lang,
            prompt=sanitized_hint or None,
        )
        return response.text.strip()
    except (ValueError, FileNotFoundError):
        raise
    except Exception as exc:
        # Sanitize exception message to avoid exposing secrets
        err_msg = str(exc)
        if api_key in err_msg:
            err_msg = err_msg.replace(api_key, "[REDACTED]")
        raise RuntimeError(f"Speech-to-text transcription failed: {err_msg}") from None
    finally:
        if file_handle is not None:
            file_handle.close()
