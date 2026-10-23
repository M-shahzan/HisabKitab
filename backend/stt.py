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
        language: Language code for transcription (e.g., 'hi', 'en').
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

    base_url = os.getenv("STT_BASE_URL") or None
    model = os.getenv("STT_MODEL") or DEFAULT_MODEL

    effective_hint = hint or hint_prompt or ""
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
        )
        response = client.audio.transcriptions.create(
            model=model,
            file=file_to_send,
            language=language,
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
