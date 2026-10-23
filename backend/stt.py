import os
from pathlib import Path
from typing import BinaryIO
import httpx


def transcribe(
    audio: str | Path | BinaryIO | bytes,
    language: str = "hi",
    hint_prompt: str | None = None,
) -> str:
    """Transcribe speech audio to text using configured speech-to-text provider (Section 6 A2).

    Parameters:
    - audio: Path to audio file, binary stream, or bytes.
    - language: Explicit language code (e.g. 'hi', 'en', 'kn', 'ta').
    - hint_prompt: Optional catalog keywords hint for Whisper models.

    Raises:
    - RuntimeError: if STT_API_KEY is not configured in the environment.
    - ValueError: if audio content is missing or empty.
    """
    api_key = os.getenv("STT_API_KEY")
    if not api_key:
        raise RuntimeError("STT_API_KEY is not configured in environment.")

    # Extract audio bytes and validate
    if isinstance(audio, (str, Path)):
        p = Path(audio)
        if not p.is_file() or p.stat().st_size == 0:
            raise ValueError("Audio file is empty or does not exist.")
        audio_bytes = p.read_bytes()
    elif isinstance(audio, bytes):
        if len(audio) == 0:
            raise ValueError("Audio bytes are empty.")
        audio_bytes = audio
    elif hasattr(audio, "read"):
        audio_bytes = audio.read()
        if len(audio_bytes) == 0:
            raise ValueError("Audio stream is empty.")
    else:
        raise ValueError("Invalid audio input type.")

    endpoint_url = os.getenv("STT_API_URL", "https://api.openai.com/v1/audio/transcriptions")
    files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
    data = {
        "model": os.getenv("STT_MODEL", "whisper-1"),
        "language": language,
    }
    if hint_prompt:
        data["prompt"] = hint_prompt

    headers = {"Authorization": f"Bearer {api_key}"}

    response = httpx.post(endpoint_url, files=files, data=data, headers=headers, timeout=30.0)
    if response.status_code != 200:
        raise RuntimeError(f"STT provider returned error HTTP {response.status_code}: {response.text}")

    result = response.json()
    return result.get("text", "")
