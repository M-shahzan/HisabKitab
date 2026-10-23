/**
 * Centralized API Client for Hisab Kitab
 * Configurable through NEXT_PUBLIC_API_BASE_URL environment variable.
 * Handles JSON and multipart/form-data requests, timeout limits, and safe error parsing.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "http://localhost:8000";

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

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
      throw new ApiError("Request timed out. Please check your backend connection.", 408);
    }

    // Network connection failure or CORS error
    const friendlyMessage =
      "Cannot connect to the Hisab Kitab backend server. Please verify that the backend is running on " +
      (API_BASE_URL || "the configured port") +
      ".";
    throw new ApiError(friendlyMessage, 0);
  }
}

/**
 * Quick health check for backend availability
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
