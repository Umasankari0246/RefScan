/**
 * RefScan - Storage Service Layer
 * Robust, type-safe abstraction over browser storage (localStorage) with automatic
 * JSON serialization/parsing, error boundary fallbacks, and quota protection.
 * Starts with zero mock data.
 */

import { Reference, Notification, CitationStyle, CitationPaper } from "../types";

export interface UserProfile {
  name: string;
  email: string;
  title: string;
  institution?: string;
  avatar?: string;
}

export const STORAGE_KEYS = {
  REFERENCES: "refscan_references",
  NOTIFICATIONS: "refscan_notifications",
  CITATION_PAPERS: "refscan_citation_papers",
  PROFILE: "refscan_profile",
  DEFAULT_STYLE: "refscan_default_style",
  THEME: "refscan_theme",
  AUTH_TOKEN: "refscan_auth_token",
} as const;

export class StorageService {
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
      console.warn(`[StorageService] Failed to read or parse key "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Safe setter with JSON stringification and quota safety
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

  // ── References ────────────────────────────────────────────────────────────

  static getReferences(): Reference[] {
    return this.safeGet<Reference[]>(STORAGE_KEYS.REFERENCES, []);
  }

  static setReferences(refs: Reference[]): boolean {
    return this.safeSet(STORAGE_KEYS.REFERENCES, refs);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  static getNotifications(): Notification[] {
    return this.safeGet<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  static setNotifications(notifs: Notification[]): boolean {
    return this.safeSet(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  // ── Saved Citation Papers ──────────────────────────────────────────────────

  static getCitationPapers(): CitationPaper[] {
    return this.safeGet<CitationPaper[]>(STORAGE_KEYS.CITATION_PAPERS, []);
  }

  static setCitationPapers(papers: CitationPaper[]): boolean {
    return this.safeSet(STORAGE_KEYS.CITATION_PAPERS, papers);
  }

  static saveCitationPaper(paper: CitationPaper): boolean {
    const existing = this.getCitationPapers();
    const idx = existing.findIndex((p) => p.id === paper.id);
    if (idx >= 0) {
      existing[idx] = paper;
    } else {
      existing.unshift(paper);
    }
    return this.setCitationPapers(existing);
  }

  static deleteCitationPaper(id: string): boolean {
    const existing = this.getCitationPapers();
    const filtered = existing.filter((p) => p.id !== id);
    return this.setCitationPapers(filtered);
  }

  // ── Profile & Preferences ──────────────────────────────────────────────────

  static getProfile(): UserProfile {
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

  static clearAll(): void {
    this.safeSet(STORAGE_KEYS.REFERENCES, []);
    this.safeSet(STORAGE_KEYS.NOTIFICATIONS, []);
    this.safeSet(STORAGE_KEYS.CITATION_PAPERS, []);
  }
}
