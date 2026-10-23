/**
 * Browser Audio Recorder Service
 * Uses MediaRecorder and navigator.mediaDevices.getUserMedia()
 * Manages audio stream lifecycle, Web Audio API amplitude meter, and Blob generation
 */

export interface AudioRecorderHandlers {
  onAudioLevel?: (level: number) => void;
  onError?: (error: string) => void;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isRecording: boolean = false;
  private mimeType: string = "";

  /**
   * Check whether browser supports audio recording via getUserMedia and MediaRecorder
   */
  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof window.MediaRecorder !== "undefined"
    );
  }

  /**
   * Select a supported mime type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "";
    }
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
      "audio/wav",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  }

  /**
   * Start audio recording on demand (triggered by user gesture)
   */
  public async start(handlers: AudioRecorderHandlers = {}): Promise<void> {
    if (this.isRecording) return;

    if (!this.isSupported()) {
      const err = "Your browser does not support audio recording. Please use Chrome, Edge, or Firefox.";
      handlers.onError?.(err);
      throw new Error(err);
    }

    try {
      // 1. Request microphone permission on user interaction
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioChunks = [];
      this.mimeType = this.getSupportedMimeType();

      // 2. Instantiate MediaRecorder
      const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 3. AudioContext for live waveform amplitude
      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;

          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

          const updateLevels = () => {
            if (!this.isRecording || !this.analyser) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            handlers.onAudioLevel?.(Math.min(1, avg / 128));
            this.animFrameId = requestAnimationFrame(updateLevels);
          };

          this.animFrameId = requestAnimationFrame(updateLevels);
        }
      } catch (audioCtxErr) {
        console.warn("AudioContext visualizer not available:", audioCtxErr);
      }

      this.mediaRecorder.start(200); // 200ms timeslices for stream safety
      this.isRecording = true;
    } catch (err: any) {
      this.cleanup();
      let errorMsg = "Could not access microphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Microphone permission was denied. Please allow microphone access in your browser settings to use voice billing.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No microphone hardware found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Microphone is already in use by another application.";
      }
      handlers.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Stop recording and resolve with recorded audio Blob
   */
  public async stop(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      this.cleanup();
      throw new Error("No active recording session.");
    }

    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanup();
        reject(new Error("MediaRecorder instance missing."));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const finalType = this.mimeType || this.mediaRecorder?.mimeType || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: finalType });
        this.cleanup();

        if (audioBlob.size === 0) {
          reject(new Error("Empty audio recording. Please speak into the microphone and try again."));
        } else {
          resolve(audioBlob);
        }
      };

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Cancel ongoing recording and discard tracks
   */
  public cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
  }
}

export const audioRecorder = new AudioRecorder();
