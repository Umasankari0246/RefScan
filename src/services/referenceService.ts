/**
 * RefScan - Reference Service Layer
 * Centralized business logic for bibliographic reference data manipulation,
 * combining local caching, backend REST synchronization, and export/import operations.
 */

import { Reference, CitationStyle } from "../types";
import { StorageService } from "./storageService";
import { apiClient } from "./apiClient";
import { generateBatchBibliography, downloadCitationFile } from "./citationService";

export interface ReferenceFilterOptions {
  type?: string;
  query?: string;
  category?: string;
  savedOnly?: boolean;
}

export class ReferenceService {
  /**
   * Retrieve references from local cache or backend
   */
  static getLocalReferences(filter?: ReferenceFilterOptions): Reference[] {
    let refs = StorageService.getReferences();

    if (!refs || !Array.isArray(refs)) {
      return [];
    }

    if (filter?.type && filter.type !== "ALL") {
      refs = refs.filter((r) => r.type === filter.type);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      refs = refs.filter((r) => {
        const titleMatch = r.title.toLowerCase().includes(q);
        const authorsMatch = (r as any).authors?.some((a: string) => a.toLowerCase().includes(q));
        const isbnMatch = (r as any).isbn10?.includes(q) || (r as any).isbn13?.replace(/-/g, "").includes(q.replace(/-/g, ""));
        const doiMatch = (r as any).doi?.toLowerCase().includes(q);
        const categoryMatch = (r as any).category?.toLowerCase().includes(q);
        return titleMatch || authorsMatch || isbnMatch || doiMatch || categoryMatch;
      });
    }

    if (filter?.savedOnly) {
      refs = refs.filter((r) => r.saved);
    }

    return refs;
  }

  /**
   * Find single reference by ID (local first)
   */
  static getReferenceById(id: string): Reference | undefined {
    const refs = StorageService.getReferences();
    return refs.find((r) => r.id === id);
  }

  /**
   * Save / Create a new reference
   */
  static async createReference(ref: Reference): Promise<Reference> {
    const refWithId: Reference = {
      ...ref,
      id: ref.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      saved: true,
      dateAdded: ref.dateAdded || new Date().toISOString().split("T")[0],
    };

    // Update local cache
    const currentRefs = StorageService.getReferences();
    const existingIndex = currentRefs.findIndex((r) => r.id === refWithId.id);
    let updated: Reference[];
    if (existingIndex >= 0) {
      updated = [...currentRefs];
      updated[existingIndex] = refWithId;
    } else {
      updated = [refWithId, ...currentRefs];
    }
    StorageService.setReferences(updated);

    // Sync with backend asynchronously
    try {
      await apiClient.saveReference(refWithId);
    } catch (err) {
      console.warn("[ReferenceService] Backend create sync deferred (stored locally):", err);
    }

    return refWithId;
  }

  /**
   * Update an existing reference
   */
  static async updateReference(ref: Reference): Promise<Reference> {
    const currentRefs = StorageService.getReferences();
    const updated = currentRefs.map((r) => (r.id === ref.id ? ref : r));
    StorageService.setReferences(updated);

    // Sync with backend
    try {
      await apiClient.updateReference(ref);
    } catch (err) {
      console.warn("[ReferenceService] Backend update sync deferred (stored locally):", err);
    }

    return ref;
  }

  /**
   * Delete a reference by ID
   */
  static async deleteReference(id: string): Promise<boolean> {
    const currentRefs = StorageService.getReferences();
    const updated = currentRefs.filter((r) => r.id !== id);
    StorageService.setReferences(updated);

    // Sync with backend
    try {
      await apiClient.deleteReference(id);
    } catch (err) {
      console.warn("[ReferenceService] Backend delete sync deferred (removed locally):", err);
    }

    return true;
  }

  /**
   * Import multiple references into workspace and backend
   */
  static async importReferences(newRefs: Reference[]): Promise<number> {
    if (!newRefs || !Array.isArray(newRefs) || newRefs.length === 0) {
      return 0;
    }

    const currentRefs = StorageService.getReferences();
    let addedCount = 0;
    const combined = [...currentRefs];

    for (const ref of newRefs) {
      if (!ref.title || !ref.type) continue;
      const cleanRef: Reference = {
        ...ref,
        id: ref.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        saved: true,
        dateAdded: ref.dateAdded || new Date().toISOString().split("T")[0],
      };

      const existingIdx = combined.findIndex((r) => r.id === cleanRef.id);
      if (existingIdx >= 0) {
        combined[existingIdx] = cleanRef;
      } else {
        combined.unshift(cleanRef);
      }
      addedCount++;

      // Background sync to backend
      apiClient.saveReference(cleanRef).catch(() => {});
    }

    StorageService.setReferences(combined);
    return addedCount;
  }

  /**
   * Export references as a formatted file (BibTeX, JSON, CSV, RIS)
   */
  static exportLibrary(
    refs: Reference[],
    format: "bib" | "json" | "csv" | "ris",
    style: CitationStyle = "IEEE"
  ): boolean {
    if (!refs || refs.length === 0) {
      return false;
    }
    const content = generateBatchBibliography(refs, style, format);
    const ext = format === "bib" ? ".bib" : format === "json" ? ".json" : format === "csv" ? ".csv" : ".ris";
    const mime =
      format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `refscan_library_${Date.now()}${ext}`, mime);
    return true;
  }

  /**
   * Fetch from backend and synchronize with local storage
   */
  static async syncWithBackend(): Promise<{ synced: boolean; count: number }> {
    try {
      const serverRefs = await apiClient.getReferences();
      if (serverRefs && serverRefs.length > 0) {
        StorageService.setReferences(serverRefs);
        return { synced: true, count: serverRefs.length };
      }
    } catch (err) {
      console.warn("[ReferenceService] Backend sync failed, using local cache:", err);
    }
    return { synced: false, count: StorageService.getReferences().length };
  }
}

