/**
 * RefScan - Storage Service Layer
 * Abstraction over browser storage with user-scoped isolation.
 * Automatically scopes local caches by userId to ensure complete data isolation between accounts.
 */

import { Reference, Notification, CitationStyle, CitationPaper, SafeUser } from "../types";

export interface UserProfile {
  name: string;
  email: string;
  title: string;
  institution?: string;
  avatar?: string;
  role?: string;
}

export const STORAGE_KEYS = {
  REFERENCES: "references",
  NOTIFICATIONS: "notifications",
  CITATION_PAPERS: "citation_papers",
  PROFILE: "refscan_profile",
  DEFAULT_STYLE: "refscan_default_style",
  THEME: "refscan_theme",
  AUTH_TOKEN: "refscan_auth_token",
  USER_SESSION: "refscan_user_session",
} as const;

export class StorageService {
  /**
   * Generates a user-isolated storage key
   */
  private static getUserKey(baseKey: string, userId?: string): string {
    if (userId) {
      return `refscan_u_${userId}_${baseKey}`;
    }
    // Try to get current active user id
    const activeUser = this.safeGet<SafeUser | null>(STORAGE_KEYS.USER_SESSION, null);
    if (activeUser?.id) {
      return `refscan_u_${activeUser.id}_${baseKey}`;
    }
    return `refscan_anon_${baseKey}`;
  }

  /**
   * Safe getter with JSON parsing and fallback value
   */
  static safeGet<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return defaultValue;
      }
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[StorageService] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Safe setter with JSON stringification
   */
  static safeSet<T>(key: string, value: T): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to write key "${key}":`, err);
      return false;
    }
  }

  /**
   * Safe remover
   */
  static safeRemove(key: string): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to remove key "${key}":`, err);
      return false;
    }
  }

  // ── Scoped References ─────────────────────────────────────────────────────

  static getReferences(userId?: string): Reference[] {
    const key = this.getUserKey(STORAGE_KEYS.REFERENCES, userId);
    return this.safeGet<Reference[]>(key, []);
  }

  static setReferences(refs: Reference[], userId?: string): boolean {
    const key = this.getUserKey(STORAGE_KEYS.REFERENCES, userId);
    return this.safeSet(key, refs);
  }

  // ── Scoped Notifications ──────────────────────────────────────────────────

  static getNotifications(userId?: string): Notification[] {
    const key = this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId);
    return this.safeGet<Notification[]>(key, []);
  }

  static setNotifications(notifs: Notification[], userId?: string): boolean {
    const key = this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId);
    return this.safeSet(key, notifs);
  }

  // ── Scoped Saved Citation Papers ──────────────────────────────────────────

  static getCitationPapers(userId?: string): CitationPaper[] {
    const key = this.getUserKey(STORAGE_KEYS.CITATION_PAPERS, userId);
    return this.safeGet<CitationPaper[]>(key, []);
  }

  static setCitationPapers(papers: CitationPaper[], userId?: string): boolean {
    const key = this.getUserKey(STORAGE_KEYS.CITATION_PAPERS, userId);
    return this.safeSet(key, papers);
  }

  static saveCitationPaper(paper: CitationPaper, userId?: string): boolean {
    const existing = this.getCitationPapers(userId);
    const idx = existing.findIndex((p) => p.id === paper.id);
    if (idx >= 0) {
      existing[idx] = paper;
    } else {
      existing.unshift(paper);
    }
    return this.setCitationPapers(existing, userId);
  }

  static deleteCitationPaper(id: string, userId?: string): boolean {
    const existing = this.getCitationPapers(userId);
    const filtered = existing.filter((p) => p.id !== id);
    return this.setCitationPapers(filtered, userId);
  }

  // ── User Session & Profile ────────────────────────────────────────────────

  static getProfile(): UserProfile {
    const session = this.safeGet<SafeUser | null>(STORAGE_KEYS.USER_SESSION, null);
    if (session) {
      return {
        name: session.name,
        email: session.email,
        title: session.title,
        institution: session.institution,
        role: session.role,
      };
    }
    return this.safeGet<UserProfile>(STORAGE_KEYS.PROFILE, {
      name: "Researcher",
      email: "researcher@refscan.app",
      title: "Academic Researcher",
      institution: "Research Institute",
    });
  }

  static setProfile(profile: UserProfile): boolean {
    return this.safeSet(STORAGE_KEYS.PROFILE, profile);
  }

  static getDefaultStyle(): CitationStyle {
    return this.safeGet<CitationStyle>(STORAGE_KEYS.DEFAULT_STYLE, "IEEE");
  }

  static setDefaultStyle(style: CitationStyle): boolean {
    return this.safeSet(STORAGE_KEYS.DEFAULT_STYLE, style);
  }

  static getTheme(): string {
    return this.safeGet<string>(STORAGE_KEYS.THEME, "Light");
  }

  static setTheme(theme: string): boolean {
    return this.safeSet(STORAGE_KEYS.THEME, theme);
  }

  /**
   * Clear session and all active workspace caches
   */
  static clearSession(): void {
    const activeUser = this.safeGet<SafeUser | null>(STORAGE_KEYS.USER_SESSION, null);
    if (activeUser?.id) {
      this.safeRemove(`refscan_u_${activeUser.id}_${STORAGE_KEYS.REFERENCES}`);
      this.safeRemove(`refscan_u_${activeUser.id}_${STORAGE_KEYS.NOTIFICATIONS}`);
      this.safeRemove(`refscan_u_${activeUser.id}_${STORAGE_KEYS.CITATION_PAPERS}`);
    }
    this.safeRemove(STORAGE_KEYS.AUTH_TOKEN);
    this.safeRemove(STORAGE_KEYS.USER_SESSION);
    this.safeRemove("refscan_staged_references");
    this.safeRemove("refscan_staged_session_name");
    // Also remove any legacy un-scoped keys
    this.safeRemove("refscan_references");
    this.safeRemove("refscan_notifications");
    this.safeRemove("refscan_citation_papers");
  }
}
