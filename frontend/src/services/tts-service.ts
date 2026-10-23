/**
 * Browser Text-to-Speech Playback Service
 * Uses window.speechSynthesis to play backend messages
 * Supports replay, cancel/stop, language voice selection, and graceful error handling
 */

export interface TTSHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export class TTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private lastSpokenText: string = "";
  private lastSpokenLang: string = "en-IN";

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /**
   * Speak a given message aloud using browser speech synthesis
   */
  public speak(
    text: string,
    lang: string = "en-IN",
    handlers: TTSHandlers = {}
  ): boolean {
    if (!this.isSupported()) {
      handlers.onError?.("Speech synthesis not supported in this browser.");
      return false;
    }

    if (!text || !text.trim()) {
      return false;
    }

    // Stop previous utterance if running
    this.stop();

    this.lastSpokenText = text;
    this.lastSpokenLang = lang;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try selecting regional voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) => v.lang.toLowerCase() === lang.toLowerCase() || v.lang.startsWith(lang.split("-")[0])
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        handlers.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        handlers.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        // Don't report error if cancelled intentionally
        if (e.error !== "canceled" && e.error !== "interrupted") {
          handlers.onError?.(`Speech playback error: ${e.error}`);
        } else {
          handlers.onEnd?.();
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err: any) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      handlers.onError?.(err?.message || "Speech playback failed");
      return false;
    }
  }

  /**
   * Replay the last spoken message
   */
  public replay(handlers: TTSHandlers = {}): boolean {
    if (!this.lastSpokenText) return false;
    return this.speak(this.lastSpokenText, this.lastSpokenLang, handlers);
  }

  /**
   * Stop any current speech playback
   */
  public stop(): void {
    if (this.isSupported() && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getLastMessage(): string {
    return this.lastSpokenText;
  }
}

export const ttsService = new TTSService();
