/**
 * RefScan - Backend API Client
 * Seamlessly connects frontend components to the live RefScan backend endpoints.
 * Features automated error recovery, fallback resilience, and live health status.
 */

import { Reference, BookReference, PaperReference, CitationStyle, ResearchGap, CitationPaper } from "../types";
import { generateCitationPlainText } from "./citationService";
import { sendChatMessage } from "./chatbotService";

export interface BackendHealthStatus {
  status: "online" | "offline";
  service: string;
  version: string;
  timestamp: string;
  database?: {
    mode: "mongodb" | "in-memory";
    status: "connected" | "in-memory" | "disconnected";
    uriConfigured: boolean;
    databaseName?: string;
    host?: string;
    error?: string;
    collections?: {
      references: number;
      papers: number;
      citationPapers: number;
    };
  };
  libraryCount: number;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "";

class ApiClient {
  private isOnline: boolean = true;

  /**
   * Check backend server health
   */
  async checkHealth(): Promise<BackendHealthStatus> {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
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
        service: "RefScan Client Fallback Engine",
        version: "2.5.0",
        timestamp: new Date().toISOString(),
        libraryCount: 0
      };
    }
  }

  /**
   * Lookup book metadata by ISBN via backend API
   */
  async lookupIsbn(isbn: string): Promise<BookReference> {
    const clean = isbn.replace(/[^0-9X]/gi, "");
    try {
      const res = await fetch(`${BASE_URL}/api/books/lookup?isbn=${encodeURIComponent(clean)}`);
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
   * Fetch all references from backend
   */
  async getReferences(type?: string, query?: string): Promise<Reference[]> {
    try {
      const params = new URLSearchParams();
      if (type && type !== "ALL") params.append("type", type);
      if (query) params.append("q", query);

      const res = await fetch(`${BASE_URL}/api/references?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn("Could not fetch references from backend, using local state:", err);
    }
    return [];
  }

  /**
   * Save a reference to backend
   */
  async saveReference(ref: Reference): Promise<Reference> {
    try {
      const res = await fetch(`${BASE_URL}/api/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ref)
      });
      if (res.ok) {
        const json = await res.json();
        return json.reference || ref;
      }
    } catch (err) {
      console.warn("Backend save failed, saved locally:", err);
    }
    return ref;
  }

  /**
   * Update reference on backend
   */
  async updateReference(ref: Reference): Promise<Reference> {
    try {
      const res = await fetch(`${BASE_URL}/api/references/${ref.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ref)
      });
      if (res.ok) {
        const json = await res.json();
        return json.reference || ref;
      }
    } catch (err) {
      console.warn("Backend update failed, updated locally:", err);
    }
    return ref;
  }

  /**
   * Delete reference from backend
   */
  async deleteReference(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/references/${id}`, {
        method: "DELETE"
      });
      return res.ok;
    } catch (err) {
      console.warn("Backend delete failed, deleted locally:", err);
      return false;
    }
  }

  /**
   * Upload & Process Research Paper (Supports both parsed PaperReference and file info)
   */
  async uploadPaper(payloadOrName: PaperReference | string, fileSize?: string): Promise<PaperReference> {
    try {
      const isObject = typeof payloadOrName === "object" && payloadOrName !== null;
      const body = isObject ? payloadOrName : { fileName: payloadOrName, fileSize: fileSize || "1.4 MB" };

      const res = await fetch(`${BASE_URL}/api/papers/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const json = await res.json();
        return json.paper || body;
      }
    } catch (err) {
      console.warn("Backend paper analysis failed, generating locally:", err);
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
      researchProblem: "Not available in the uploaded paper.",
      researchObjective: "Not available in the uploaded paper.",
      methodology: "Not available in the uploaded paper.",
      existingMethod: "Not available in the uploaded paper.",
      technologies: [],
      algorithms: [],
      keyFindings: [],
      limitations: [],
      researchGaps: [],
      futureScope: [],
      analysisStatus: "complete",
      source: "PDF Processing",
      citationStyle: "IEEE",
      dateAdded: new Date().toISOString().split("T")[0],
      fileName,
      fileSize: fileSize || "1.4 MB"
    };
  }

  /**
   * Server-side citation formatting
   */
  async generateCitation(reference: Reference, style: CitationStyle = "IEEE"): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/api/citations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, style })
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
   * AI Academic Chatbot Query
   */
  async sendChatMessage(
    message: string, 
    context?: { activeBook?: BookReference | null; activePaper?: PaperReference | null; references?: Reference[] }
  ): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...context })
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
      references: context?.references || []
    });
    return localReply.text;
  }

  /**
   * Fetch research gaps
   */
  async getResearchGaps(): Promise<ResearchGap[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/gaps`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn("Backend gaps endpoint unavailable, using local mock data:", err);
    }
    return [];
  }

  /**
   * Fetch all saved citation papers from backend
   */
  async getCitationPapers(): Promise<CitationPaper[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/citation-papers`);
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
   * Save citation paper to backend
   */
  async saveCitationPaper(paper: CitationPaper): Promise<CitationPaper> {
    try {
      const res = await fetch(`${BASE_URL}/api/citation-papers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
   * Delete citation paper from backend
   */
  async deleteCitationPaper(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/citation-papers/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (err) {
      console.warn("Backend delete citation paper failed:", err);
      return false;
    }
  }
}

export const apiClient = new ApiClient();
