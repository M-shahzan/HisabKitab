/**
 * Centralized API Client for Hisab Kitab
 * Configurable through NEXT_PUBLIC_API_BASE_URL environment variable.
 * Handles JSON and multipart/form-data requests, timeout limits, and safe error parsing.
 */

export function getApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location?.hostname && window.location.hostname !== "localhost") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number = 0, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${cleanEndpoint}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  // Voice transcription and LLM inference pipeline can take 20s+ during cloud API latency spikes
  const timeoutMs = options.timeoutMs ?? (cleanEndpoint.includes("/voice") ? 60000 : 30000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    // Try parsing JSON or return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === "AbortError") {
      throw new ApiError(
        "Voice processing took longer than expected. Please check your internet connection and try speaking again.",
        408
      );
    }

    // Network connection failure or CORS error
    const friendlyMessage =
      "Cannot connect to the Hisab Kitab backend server. Please verify that the backend is running on " +
      (baseUrl || "the configured port") +
      ".";
    throw new ApiError(friendlyMessage, 0);
  }
}

/**
 * Quick health check for backend availability
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
