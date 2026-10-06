/**
 * RefScan - Authentication & User Profile Service Layer
 * Connects frontend components to the live MongoDB authentication endpoints (/api/auth/*).
 * Token-based session authentication with Bearer JWT tokens.
 */

import { SafeUser, AuthResponse } from "../types";
import { StorageService, STORAGE_KEYS } from "./storageService";

/**
 * Normalizes API endpoint URL so duplicate `/api` prefix is never produced,
 * regardless of whether VITE_API_BASE_URL is '', '/api', or 'https://domain.com/api'.
 */
function getApiUrl(path: string): string {
  const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || "";
  const cleanBase = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export class AuthService {
  /**
   * Retrieve cached JWT session token
   */
  static getToken(): string | null {
    return StorageService.safeGet<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
  }

  /**
   * Save session token
   */
  static setToken(token: string | null): void {
    if (token) {
      StorageService.safeSet(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      StorageService.safeRemove(STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  /**
   * Retrieve cached user profile
   */
  static getCachedUser(): SafeUser | null {
    return StorageService.safeGet<SafeUser | null>("refscan_user_session", null);
  }

  /**
   * Check if user is authenticated (token exists)
   */
  static isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  /**
   * Verify session with backend: GET /api/auth/me
   */
  static async verifySession(): Promise<SafeUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(getApiUrl("/api/auth/me"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          StorageService.safeSet("refscan_user_session", json.user);
          return json.user as SafeUser;
        }
      }

      // If token is invalid or expired (401), clear invalid token
      if (res.status === 401) {
        this.logout();
      }
      return null;
    } catch (err) {
      console.warn("[AuthService] Could not reach backend to verify session:", err);
      return this.getCachedUser();
    }
  }

  /**
   * Login user with email and password via POST /api/auth/login
   */
  static async login(email: string, password?: string): Promise<AuthResponse> {
    if (!email || !email.includes("@")) {
      throw new Error("A valid academic email address is required.");
    }
    if (!password) {
      throw new Error("Password is required.");
    }

    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Authentication failed.");
    }

    // Persist verified session token and safe user
    this.setToken(data.token);
    StorageService.safeSet("refscan_user_session", data.user);

    return data as AuthResponse;
  }

  /**
   * Register a new user in MongoDB via POST /api/auth/register
   */
  static async register(data: {
    name: string;
    email: string;
    password: string;
    title?: string;
    institution?: string;
  }): Promise<AuthResponse> {
    if (!data.name?.trim()) throw new Error("Full name is required.");
    if (!data.email || !data.email.includes("@")) throw new Error("A valid email address is required.");
    if (!data.password || data.password.length < 6) throw new Error("Password must be at least 6 characters.");

    const res = await fetch(getApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        title: data.title?.trim() || "Academic Researcher",
        institution: data.institution?.trim() || "Academic Research Institution",
      }),
    });

    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.message || resData.error || "Registration failed.");
    }

    // Persist token and safe user
    this.setToken(resData.token);
    StorageService.safeSet("refscan_user_session", resData.user);

    return resData as AuthResponse;
  }

  /**
   * Terminate current session: POST /api/auth/logout
   */
  static async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(getApiUrl("/api/auth/logout"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Non-fatal
      }
    }

    this.setToken(null);
    StorageService.safeRemove("refscan_user_session");
  }
}
