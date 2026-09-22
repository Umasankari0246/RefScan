/**
 * RefScan - Authentication & User Profile Service Layer
 * Manages user credentials, authentication sessions, profile persistence, and logout workflows.
 */

import { StorageService, UserProfile, STORAGE_KEYS } from "./storageService";

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

export class AuthService {
  /**
   * Get current authenticated user profile
   */
  static getCurrentUser(): UserProfile {
    return StorageService.getProfile();
  }

  /**
   * Check if a valid session exists
   */
  static isAuthenticated(): boolean {
    const token = StorageService.safeGet<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
    return Boolean(token);
  }

  /**
   * Login user with email and password
   */
  static async login(
    email: string,
    password?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; profile: UserProfile; token: string }> {
    // Basic verification
    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    if (password && password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const currentProfile = StorageService.getProfile();
    const updatedProfile: UserProfile = {
      ...currentProfile,
      email: email.trim(),
      name: currentProfile.name || email.split("@")[0],
    };

    const token = `refscan_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    StorageService.setProfile(updatedProfile);
    if (rememberMe) {
      StorageService.safeSet(STORAGE_KEYS.AUTH_TOKEN, token);
    }

    return {
      success: true,
      profile: updatedProfile,
      token,
    };
  }

  /**
   * Register a new user
   */
  static async register(
    name: string,
    email: string,
    password?: string,
    title: string = "Academic Researcher"
  ): Promise<{ success: boolean; profile: UserProfile; token: string }> {
    if (!name.trim()) throw new Error("Full name is required.");
    if (!email || !email.includes("@")) throw new Error("A valid email address is required.");
    if (password && password.length < 6) throw new Error("Password must be at least 6 characters.");

    const newProfile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      institution: "Academic Research Institution",
    };

    const token = `refscan_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    StorageService.setProfile(newProfile);
    StorageService.safeSet(STORAGE_KEYS.AUTH_TOKEN, token);

    return {
      success: true,
      profile: newProfile,
      token,
    };
  }

  /**
   * Update user profile
   */
  static updateProfile(partial: Partial<UserProfile>): UserProfile {
    const current = StorageService.getProfile();
    const updated = { ...current, ...partial };
    StorageService.setProfile(updated);
    return updated;
  }

  /**
   * Sign out current session
   */
  static logout(): void {
    StorageService.safeRemove(STORAGE_KEYS.AUTH_TOKEN);
  }
}

