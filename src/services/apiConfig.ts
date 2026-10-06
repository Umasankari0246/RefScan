/**
 * RefScan - API Configuration & Network Layer
 * Environment-aware endpoint resolution and robust JSON response parser.
 *
 * Targets:
 * - Local Development: Relative `/api/*` or localhost:8443 (connects to local backend & local MongoDB).
 * - Production / Capacitor Android: Strictly `https://refscan.onrender.com/api/*` (connects to Render production API & Atlas).
 * - Web on Render: `https://refscan.onrender.com/api/*` or relative.
 */

import { Capacitor } from "@capacitor/core";

export const PRODUCTION_API_URL = "https://refscan.onrender.com";

/**
 * Checks if the application is running as a native Android or iOS mobile container.
 */
export function isCapacitorNative(): boolean {
  try {
    if (typeof Capacitor !== "undefined" && typeof Capacitor.isNativePlatform === "function") {
      if (Capacitor.isNativePlatform()) return true;
    }
    if (typeof window !== "undefined") {
      if ((window as any).Capacitor?.isNativePlatform?.()) return true;
      if (window.location.protocol === "capacitor:") return true;
      // Android WebView origin is https://localhost or http://localhost without a custom dev port
      if (
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
        !window.location.port &&
        !import.meta.env.DEV
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Resolves the root API host based on environment and runtime platform:
 * 1. Native Capacitor (Android APK / iOS): strictly "https://refscan.onrender.com"
 * 2. Explicit environment variables (VITE_API_URL or VITE_API_BASE_URL if absolute)
 * 3. Local Development in browser: "" (relative to current dev server port)
 * 4. Production Web build: "https://refscan.onrender.com" or relative if already on render
 */
export function getApiBaseUrl(): string {
  // 1. Environment variable if provided
  const envUrl = (
    (import.meta.env.VITE_API_URL as string) ||
    (import.meta.env.VITE_API_BASE_URL as string) ||
    ""
  ).trim();

  // 2. Native Capacitor Android/iOS Application
  if (isCapacitorNative()) {
    // Relative paths like "/api" will NEVER work inside native mobile WebView because
    // there is no backend server running on Android localhost.
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      return envUrl.replace(/\/+$/, "").replace(/\/api$/, "");
    }
    return PRODUCTION_API_URL;
  }

  // 3. Browser environment
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";

    // Local development in browser (e.g. localhost:8443)
    if (import.meta.env.DEV || (isLocalhost && window.location.port !== "")) {
      // Return empty base for relative requests handled by Vite's local dev API middleware & local MongoDB
      return "";
    }

    // Production build in browser
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      return envUrl.replace(/\/+$/, "").replace(/\/api$/, "");
    }
    if (hostname.includes("onrender.com")) {
      return "";
    }
    return PRODUCTION_API_URL;
  }

  // Fallback
  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
    return envUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  }
  return import.meta.env.PROD ? PRODUCTION_API_URL : "";
}

/**
 * Normalizes full API endpoint URL so duplicate `/api` prefix is never created,
 * regardless of whether base is '', '/api', or 'https://refscan.onrender.com'.
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const cleanBase = base.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${cleanBase}${cleanPath}`;
}

/**
 * Safely parses response as JSON, preventing SyntaxError: Unexpected token '<'
 * when a server returns an HTML error page (e.g. 404, 502, 503, or Capacitor fallback).
 */
export async function safeParseJsonResponse<T = any>(
  res: Response,
  endpointContext = "API endpoint"
): Promise<T> {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const rawText = await res.text();

  // Check if response is HTML or starts with an HTML doctype / opening tag
  const isHtml =
    contentType.includes("text/html") ||
    rawText.trim().startsWith("<!doctype") ||
    rawText.trim().startsWith("<html");

  if (isHtml) {
    if (res.status === 404) {
      throw new Error(
        `API endpoint not found (404) at ${res.url}. The server returned an HTML page instead of JSON. ` +
        `Please verify that the backend API is deployed and reachable.`
      );
    }
    if (res.status >= 500) {
      throw new Error(
        `Backend server error (${res.status} ${res.statusText}) at ${res.url}. ` +
        `The server returned HTML instead of JSON.`
      );
    }
    throw new Error(
      `Unexpected HTML response (${res.status} ${res.statusText}) from ${endpointContext} at ${res.url}. ` +
      `Expected a valid JSON API response.`
    );
  }

  if (!rawText.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (err: any) {
    throw new Error(
      `Malformed JSON response from ${endpointContext} (${res.status}): ${rawText.slice(0, 150)}`
    );
  }
}
