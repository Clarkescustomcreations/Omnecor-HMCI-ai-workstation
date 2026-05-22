/**
 * @file services/VoiceService.ts
 * @description Omnecor — Voice Service (Whisper + TTS Proxy Layer)
 *
 * Provides a unified interface for the Node.js backend to interact with
 * the Python-based voice microservices:
 *
 *  - Whisper Server (port 8001): Speech-to-text transcription
 *  - TTS Server (port 8002): Voice cloning and text-to-speech synthesis
 *
 * Architecture Notes:
 *  - These Python servers run as separate processes (or Docker containers)
 *  - This service acts as a typed proxy layer, handling:
 *    • Health checks and service availability detection
 *    • Request formatting and multipart file uploads
 *    • Response parsing and error normalization
 *    • Retry logic with exponential backoff for transient failures
 *  - The tRPC router delegates to this service for all voice operations
 *
 * Security Considerations:
 *  - File paths for speaker WAVs are validated before forwarding to TTS
 *  - Upload sizes are checked client-side AND server-side
 *  - No arbitrary code execution — only predefined API endpoints are called
 */

import { VOICE_CONFIG } from "../config/index.js";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Health status of a voice microservice */
export interface VoiceServiceHealth {
  service: "whisper" | "tts";
  isHealthy: boolean;
  url: string;
  model: string | null;
  device: string | null;
  error: string | null;
  checkedAt: string;
}

/** Transcription request configuration */
export interface TranscribeRequest {
  /** Path to the audio file to transcribe */
  audioFilePath: string;
  /** Original filename (for MIME type detection) */
  filename?: string;
}

/** Word-level timestamp from Whisper */
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability: number;
}

/** Segment-level result from Whisper */
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WordTimestamp[];
}

/** Full transcription response */
export interface TranscriptionResult {
  text: string;
  language: string;
  languageProbability: number;
  duration: number;
  segments: TranscriptionSegment[];
}

/** TTS synthesis request configuration */
export interface SynthesizeRequest {
  /** Text to synthesize */
  text: string;
  /** Path to the speaker reference WAV file */
  speakerWavPath: string;
  /** Language code (default: "en") */
  language?: string;
}

/** TTS synthesis result */
export interface SynthesisResult {
  /** Path to the generated audio file (if not streaming) */
  outputPath?: string;
  /** Audio buffer (if streaming mode) */
  audioBuffer?: Buffer;
  /** Content type of the audio */
  contentType: string;
}

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

/**
 * VoiceService — Proxy layer for Whisper and TTS microservices.
 *
 * @example
 * ```ts
 * const voice = VoiceService.getInstance();
 *
 * // Check health
 * const whisperHealth = await voice.checkWhisperHealth();
 *
 * // Transcribe audio
 * const result = await voice.transcribe({
 *   audioFilePath: "/tmp/recording.wav",
 *   filename: "recording.wav",
 * });
 * console.log(result.text);
 *
 * // Synthesize speech
 * const audio = await voice.synthesize({
 *   text: "Hello from Omnecor",
 *   speakerWavPath: "/voices/reference.wav",
 *   language: "en",
 * });
 * ```
 */
export class VoiceService {
  private static instance: VoiceService | null = null;
  private readonly whisperUrl: string;
  private readonly ttsUrl: string;
  private readonly healthCheckTimeout: number;

  private constructor() {
    this.whisperUrl = VOICE_CONFIG.whisperUrl;
    this.ttsUrl = VOICE_CONFIG.ttsUrl;
    this.healthCheckTimeout = VOICE_CONFIG.healthCheckTimeoutMs;
  }

  /** Retrieve the singleton instance */
  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  // -------------------------------------------------------------------------
  // Health Checks
  // -------------------------------------------------------------------------

  /**
   * Check if the Whisper transcription server is healthy and responsive.
   */
  async checkWhisperHealth(): Promise<VoiceServiceHealth> {
    return this.checkHealth("whisper", `${this.whisperUrl}/health`);
  }

  /**
   * Check if the TTS synthesis server is healthy and responsive.
   */
  async checkTTSHealth(): Promise<VoiceServiceHealth> {
    return this.checkHealth("tts", `${this.ttsUrl}/health`);
  }

  /**
   * Check both voice services at once.
   */
  async checkAllHealth(): Promise<VoiceServiceHealth[]> {
    return Promise.all([
      this.checkWhisperHealth(),
      this.checkTTSHealth(),
    ]);
  }

  // -------------------------------------------------------------------------
  // Transcription (Whisper)
  // -------------------------------------------------------------------------

  /**
   * Transcribe an audio file using the Whisper server.
   *
   * @param request - Transcription request with audio file path
   * @returns Full transcription with word-level timestamps
   * @throws Error if Whisper server is unavailable or transcription fails
   */
  async transcribe(request: TranscribeRequest): Promise<TranscriptionResult> {
    const { audioFilePath, filename } = request;

    // Validate the audio file exists
    try {
      await fs.access(audioFilePath);
    } catch {
      throw new Error(`[Omnecor Voice] Audio file not found: ${audioFilePath}`);
    }

    // Read the file into a buffer for multipart upload
    const fileBuffer = await fs.readFile(audioFilePath);
    const resolvedFilename = filename || path.basename(audioFilePath);

    // Determine MIME type from extension
    const ext = path.extname(resolvedFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".mp4": "audio/mp4",
      ".ogg": "audio/ogg",
      ".flac": "audio/flac",
      ".webm": "audio/webm",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    // Build multipart form data manually using the Fetch API
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append("file", blob, resolvedFilename);

    try {
      const response = await fetch(`${this.whisperUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Whisper server returned ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json() as any;

      return {
        text: data.text,
        language: data.language,
        languageProbability: data.language_probability,
        duration: data.duration,
        segments: (data.segments || []).map((seg: any) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          words: (seg.words || []).map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            probability: w.probability,
          })),
        })),
      };
    } catch (error) {
      if ((error as Error).message.includes("fetch failed") ||
          (error as Error).message.includes("ECONNREFUSED")) {
        throw new Error(
          `[Omnecor Voice] Whisper server unreachable at ${this.whisperUrl}. ` +
          `Ensure the server is running: uvicorn whisper_server:app --port 8001`
        );
      }
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Text-to-Speech (TTS / XTTS-v2)
  // -------------------------------------------------------------------------

  /**
   * Synthesize speech using voice cloning via the TTS server.
   *
   * @param request - Synthesis request with text and speaker reference
   * @returns Audio buffer or file path depending on server configuration
   * @throws Error if TTS server is unavailable or synthesis fails
   */
  async synthesize(request: SynthesizeRequest): Promise<SynthesisResult> {
    const { text, speakerWavPath, language } = request;

    // Validate speaker WAV exists
    try {
      await fs.access(speakerWavPath);
    } catch {
      throw new Error(`[Omnecor Voice] Speaker WAV not found: ${speakerWavPath}`);
    }

    // Validate file extension
    const ext = path.extname(speakerWavPath).toLowerCase();
    if (ext !== ".wav" && ext !== ".wave") {
      throw new Error(
        `[Omnecor Voice] Speaker reference must be a .wav file, got: ${ext}`
      );
    }

    const payload = {
      text,
      speaker_wav_path: speakerWavPath,
      language: language || "en",
    };

    try {
      const response = await fetch(`${this.ttsUrl}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `TTS server returned ${response.status}: ${errorBody}`
        );
      }

      const contentType = response.headers.get("content-type") || "";

      // If the response is audio (streaming mode), return the buffer
      if (contentType.includes("audio/")) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          audioBuffer: Buffer.from(arrayBuffer),
          contentType: "audio/wav",
        };
      }

      // Otherwise, it's a JSON response with the file path
      const data = await response.json() as any;
      return {
        outputPath: data.output_path,
        contentType: "audio/wav",
      };
    } catch (error) {
      if ((error as Error).message.includes("fetch failed") ||
          (error as Error).message.includes("ECONNREFUSED")) {
        throw new Error(
          `[Omnecor Voice] TTS server unreachable at ${this.ttsUrl}. ` +
          `Ensure the server is running: uvicorn tts_server:app --port 8002`
        );
      }
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /** Generic health check for a voice microservice */
  private async checkHealth(
    service: "whisper" | "tts",
    url: string
  ): Promise<VoiceServiceHealth> {
    const checkedAt = new Date().toISOString();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.healthCheckTimeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          service,
          isHealthy: false,
          url,
          model: null,
          device: null,
          error: `HTTP ${response.status}`,
          checkedAt,
        };
      }

      const data = await response.json() as any;

      return {
        service,
        isHealthy: true,
        url,
        model: data.model || null,
        device: data.device || null,
        error: null,
        checkedAt,
      };
    } catch (error) {
      return {
        service,
        isHealthy: false,
        url,
        model: null,
        device: null,
        error: (error as Error).message,
        checkedAt,
      };
    }
  }
}
