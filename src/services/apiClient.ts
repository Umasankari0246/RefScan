/**
 * RefScan - Backend API Client
 * Connects frontend components to the live RefScan backend endpoints with JWT Bearer authentication.
 * Strictly scopes data access to the authenticated user.
 */

import { Reference, BookReference, PaperReference, CitationStyle, ResearchGap, CitationPaper, SafeUser, UserDocument } from "../types";
import { generateCitationPlainText } from "./citationService";
import { sendChatMessage } from "./chatbotService";
import { AuthService } from "./authService";

export interface BackendHealthStatus {
  status: "online" | "offline" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  database?: {
    mode: "mongodb";
    status: "connected" | "disconnected";
    uriConfigured: boolean;
    databaseName?: string;
    host?: string;
    error?: string;
    registeredUsers?: number;
  };
  security?: {
    multiUserIsolation: boolean;
    passwordHashing: string;
    sessionAuth: string;
    inMemoryFallback: boolean;
  };
}

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

class ApiClient {
  private isOnline: boolean = true;

  /**
   * Helper to retrieve Authorization header with JWT Bearer token
   */
  private getAuthHeaders(): Record<string, string> {
    const token = AuthService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Check backend server health
   */
  async checkHealth(): Promise<BackendHealthStatus> {
    try {
      const res = await fetch(getApiUrl("/api/health"));
      if (res.ok) {
        const data = await res.json();
        this.isOnline = true;
        return data;
      }
      throw new Error(`Health check failed with HTTP ${res.status}`);
    } catch (err) {
      this.isOnline = false;
      return {
        status: "offline",
        service: "RefScan Client API",
        version: "3.0.0",
        timestamp: new Date().toISOString(),
        database: {
          mode: "mongodb",
          status: "disconnected",
          uriConfigured: false,
          error: "Backend is currently unreachable.",
        },
      };
    }
  }

  /**
   * Lookup book metadata by ISBN via backend API (Public)
   */
  async lookupIsbn(isbn: string): Promise<BookReference> {
    const clean = isbn.replace(/[^0-9X]/gi, "");
    try {
      const res = await fetch(getApiUrl(`/api/books/lookup?isbn=${encodeURIComponent(clean)}`));
      const data = await res.json();
      if (res.ok && data.success && data.book) {
        return data.book;
      }
      throw new Error(data.error || "We couldn't find an exact match for this ISBN.");
    } catch (err: any) {
      throw new Error(err.message || "We couldn't find an exact match for this ISBN.");
    }
  }

  /**
   * Fetch all references from backend for the authenticated user
   */
  async getReferences(type?: string, query?: string): Promise<Reference[]> {
    try {
      const params = new URLSearchParams();
      if (type && type !== "ALL") params.append("type", type);
      if (query) params.append("q", query);

      const res = await fetch(getApiUrl(`/api/references?${params.toString()}`), {
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      } else if (res.status === 401) {
        console.warn("[ApiClient] Unauthorized: session token expired or missing.");
      }
    } catch (err) {
      console.warn("Could not fetch references from backend:", err);
    }
    return [];
  }

  /**
   * Save a reference to backend under the authenticated user
   */
  async saveReference(ref: Reference): Promise<Reference> {
    try {
      const res = await fetch(getApiUrl("/api/references"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(ref),
      });

      if (res.ok) {
        const json = await res.json();
        return json.reference || ref;
      } else if (res.status === 503) {
        throw new Error("MongoDB database is currently offline. Reference cannot be saved.");
      }
    } catch (err: any) {
      console.warn("Backend save failed:", err.message);
      throw err;
    }
    return ref;
  }

  /**
   * Update reference on backend for the authenticated user
   */
  async updateReference(ref: Reference): Promise<Reference> {
    try {
      const res = await fetch(getApiUrl(`/api/references/${ref.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(ref),
      });

      if (res.ok) {
        const json = await res.json();
        return json.reference || ref;
      }
    } catch (err) {
      console.warn("Backend update failed:", err);
    }
    return ref;
  }

  /**
   * Delete reference from backend for the authenticated user
   */
  async deleteReference(id: string): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl(`/api/references/${id}`), {
        method: "DELETE",
        headers: {
          ...this.getAuthHeaders(),
        },
      });
      return res.ok;
    } catch (err) {
      console.warn("Backend delete failed:", err);
      return false;
    }
  }

  /**
   * Upload & Process Research Paper for the authenticated user
   */
  async uploadPaper(payloadOrName: PaperReference | string, fileSize?: string): Promise<PaperReference> {
    try {
      const isObject = typeof payloadOrName === "object" && payloadOrName !== null;
      const body = isObject ? payloadOrName : { fileName: payloadOrName, fileSize: fileSize || "1.0 MB" };

      const res = await fetch(getApiUrl("/api/papers/upload"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        return json.paper || body;
      }
    } catch (err) {
      console.warn("Backend paper upload failed:", err);
    }

    if (typeof payloadOrName === "object") {
      return payloadOrName as PaperReference;
    }

    const fileName = payloadOrName;
    return {
      id: "p_" + Date.now(),
      type: "PAPER",
      title: fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      authors: ["Unknown Author"],
      publicationYear: new Date().getFullYear(),
      journal: "Uploaded PDF Document",
      abstract: "Extracted from uploaded PDF document.",
      keywords: [],
      references: [],
      analysisStatus: "complete",
      source: "PDF Processing",
      citationStyle: "IEEE",
      dateAdded: new Date().toISOString().split("T")[0],
      fileName,
      fileSize: fileSize || "1.0 MB",
    };
  }

  /**
   * Server-side citation formatting (pure utility)
   */
  async generateCitation(reference: Reference, style: CitationStyle = "IEEE"): Promise<string> {
    try {
      const res = await fetch(getApiUrl("/api/citations/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, style }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.plainText || generateCitationPlainText(reference, style);
      }
    } catch (err) {
      // Fallback to local
    }
    return generateCitationPlainText(reference, style);
  }

  /**
   * AI Academic Chatbot Query scoped to authenticated user
   */
  async sendChatMessage(
    message: string,
    context?: { activeBook?: BookReference | null; activePaper?: PaperReference | null; references?: Reference[] }
  ): Promise<string> {
    try {
      const res = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ message, ...context }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.reply;
      }
    } catch (err) {
      console.warn("Backend chat unavailable, using local intelligence engine:", err);
    }

    const localReply = await sendChatMessage(message, {
      currentPath: "/chat",
      activeBook: context?.activeBook,
      activePaper: context?.activePaper,
      references: context?.references || [],
    });
    return localReply.text;
  }

  /**
   * Fetch research gaps for authenticated user
   */
  async getResearchGaps(): Promise<ResearchGap[]> {
    try {
      const res = await fetch(getApiUrl("/api/gaps"), {
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn("Backend gaps endpoint unavailable:", err);
    }
    return [];
  }

  /**
   * Fetch all saved citation papers for authenticated user
   */
  async getCitationPapers(): Promise<CitationPaper[]> {
    try {
      const res = await fetch(getApiUrl("/api/citation-papers"), {
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn("Could not fetch citation papers from backend:", err);
    }
    return [];
  }

  /**
   * Save citation paper to backend for authenticated user
   */
  async saveCitationPaper(paper: CitationPaper): Promise<CitationPaper> {
    try {
      const res = await fetch(getApiUrl("/api/citation-papers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(paper),
      });

      if (res.ok) {
        const json = await res.json();
        return json.citationPaper || paper;
      }
    } catch (err) {
      console.warn("Backend save citation paper failed:", err);
    }
    return paper;
  }

  /**
   * Delete citation paper from backend for authenticated user
   */
  async deleteCitationPaper(id: string): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl(`/api/citation-papers/${id}`), {
        method: "DELETE",
        headers: {
          ...this.getAuthHeaders(),
        },
      });
      return res.ok;
    } catch (err) {
      console.warn("Backend delete citation paper failed:", err);
      return false;
    }
  }

  /**
   * Fetch notifications for authenticated user
   */
  async getNotifications(): Promise<any[]> {
    try {
      const res = await fetch(getApiUrl("/api/notifications"), {
        headers: {
          ...this.getAuthHeaders(),
        },
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch {
      // Non-fatal
    }
    return [];
  }

  /**
   * Mark all notifications read for authenticated user
   */
  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl("/api/notifications/read-all"), {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT APIS (Admin Protected)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fetch all registered users from MongoDB (Admin only)
   */
  async getUsers(search?: string): Promise<{ success: boolean; users: SafeUser[]; count: number }> {
    const params = new URLSearchParams();
    if (search) params.append("q", search);

    const res = await fetch(getApiUrl(`/api/users?${params.toString()}`), {
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `Failed to fetch users (HTTP ${res.status})`);
    }

    return {
      success: true,
      users: data.users || [],
      count: data.count || (data.users?.length || 0),
    };
  }

  /**
   * Get single user by id
   */
  async getUserById(id: string): Promise<SafeUser> {
    const res = await fetch(getApiUrl(`/api/users/${id}`), {
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to fetch user.");
    }
    return data.user as SafeUser;
  }

  /**
   * Update user details (name, title, institution, role)
   */
  async updateUser(id: string, updateData: Partial<UserDocument>): Promise<SafeUser> {
    const res = await fetch(getApiUrl(`/api/users/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(updateData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to update user.");
    }
    return data.user as SafeUser;
  }

  /**
   * Delete a user account (Admin only)
   */
  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(getApiUrl(`/api/users/${id}`), {
      method: "DELETE",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to delete user.");
    }
    return true;
  }
}

export const apiClient = new ApiClient();
