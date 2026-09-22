/**
 * RefScan - Database Reference Models & Repositories
 * Provides dual-mode (MongoDB + In-Memory Fallback) repositories for Reference, Paper,
 * CitationPaper, and User documents.
 */

import { Reference, BookReference, PaperReference, WebsiteReference, ResearchGap, Notification, CitationPaper } from "../../types/index.ts";
import { getCollection } from "../db.ts";

// Fallback in-memory arrays when MongoDB is disconnected
let inMemoryReferences: Reference[] = [];
let inMemoryNotifications: Notification[] = [];
let inMemoryCitationPapers: CitationPaper[] = [];

/**
 * Remove MongoDB internal _id from returned objects to match TypeScript domain models
 */
function cleanDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest as T;
}

export interface ReferenceQueryOptions {
  type?: string;
  query?: string;
  limit?: number;
  skip?: number;
  sortBy?: "dateAdded" | "year" | "title";
  sortOrder?: "asc" | "desc";
}

/**
 * Reference Repository (Books, Papers, Websites)
 */
export const referenceRepository = {
  async findAll(options?: ReferenceQueryOptions): Promise<Reference[]> {
    const col = getCollection<Reference>("references");

    if (col) {
      try {
        const filter: any = {};

        if (options?.type && options.type !== "ALL") {
          filter.type = options.type;
        }

        if (options?.query && options.query.trim()) {
          const q = options.query.trim();
          filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { authors: { $regex: q, $options: "i" } },
            { isbn10: { $regex: q, $options: "i" } },
            { isbn13: { $regex: q, $options: "i" } },
            { doi: { $regex: q, $options: "i" } },
            { publisher: { $regex: q, $options: "i" } },
            { journal: { $regex: q, $options: "i" } },
          ];
        }

        let cursor = col.find(filter);

        if (options?.sortBy) {
          cursor = cursor.sort({ [options.sortBy]: options.sortOrder === "asc" ? 1 : -1 });
        } else {
          cursor = cursor.sort({ dateAdded: -1 });
        }

        if (options?.skip) {
          cursor = cursor.skip(options.skip);
        }

        if (options?.limit) {
          cursor = cursor.limit(options.limit);
        }

        const docs = await cursor.toArray();
        return docs.map(cleanDoc);
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB find error, falling back to in-memory:", err);
      }
    }

    // In-memory fallback
    let results = [...inMemoryReferences];

    if (options?.type && options.type !== "ALL") {
      results = results.filter((r) => r.type === options.type);
    }

    if (options?.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      results = results.filter((r) => {
        const titleMatch = r.title?.toLowerCase().includes(q);
        const authorsMatch = (r as any).authors?.some((a: string) => a.toLowerCase().includes(q));
        const isbnMatch = (r as any).isbn10?.includes(q) || (r as any).isbn13?.replace(/-/g, "").includes(q.replace(/-/g, ""));
        const doiMatch = (r as any).doi?.toLowerCase().includes(q);
        return titleMatch || authorsMatch || isbnMatch || doiMatch;
      });
    }

    if (options?.sortBy) {
      results.sort((a: any, b: any) => {
        const valA = a[options.sortBy!] || "";
        const valB = b[options.sortBy!] || "";
        if (options.sortOrder === "asc") return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
    }

    if (options?.skip) results = results.slice(options.skip);
    if (options?.limit) results = results.slice(0, options.limit);

    return results;
  },

  async findById(id: string): Promise<Reference | null> {
    const col = getCollection<Reference>("references");
    if (col) {
      try {
        const doc = await col.findOne({ id });
        if (doc) return cleanDoc<Reference>(doc);
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB findById error:", err);
      }
    }

    const found = inMemoryReferences.find((r) => r.id === id);
    return found || null;
  },

  async create(data: Partial<Reference>): Promise<Reference> {
    const newRef: Reference = {
      ...(data as Reference),
      id: data.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      saved: true,
      dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
    };

    const col = getCollection<Reference>("references");
    if (col) {
      try {
        await col.updateOne({ id: newRef.id }, { $set: newRef }, { upsert: true });

        // If it's a paper, also maintain record in the 'papers' collection
        if (newRef.type === "PAPER") {
          const papersCol = getCollection("papers");
          if (papersCol) {
            await papersCol.updateOne({ id: newRef.id }, { $set: newRef }, { upsert: true });
          }
        }
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB create/update error:", err);
      }
    }

    // Keep in-memory cache synchronized
    const existingIdx = inMemoryReferences.findIndex((r) => r.id === newRef.id);
    if (existingIdx >= 0) {
      inMemoryReferences[existingIdx] = newRef;
    } else {
      inMemoryReferences.unshift(newRef);
    }

    return newRef;
  },

  async update(id: string, updateData: Partial<Reference>): Promise<Reference | null> {
    const col = getCollection<Reference>("references");
    if (col) {
      try {
        const res = await col.findOneAndUpdate(
          { id },
          { $set: updateData },
          { returnDocument: "after" }
        );
        if (res) {
          // If paper, also update in papers collection
          const papersCol = getCollection("papers");
          if (papersCol) {
            await papersCol.updateOne({ id }, { $set: updateData });
          }
          return cleanDoc<Reference>(res);
        }
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB update error:", err);
      }
    }

    const idx = inMemoryReferences.findIndex((r) => r.id === id);
    if (idx < 0) return null;

    inMemoryReferences[idx] = {
      ...inMemoryReferences[idx],
      ...updateData,
      id,
    } as Reference;

    return inMemoryReferences[idx];
  },

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    const col = getCollection<Reference>("references");
    if (col) {
      try {
        const res = await col.deleteOne({ id });
        deleted = res.deletedCount > 0;

        const papersCol = getCollection("papers");
        if (papersCol) {
          await papersCol.deleteOne({ id });
        }
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB delete error:", err);
      }
    }

    const initialLen = inMemoryReferences.length;
    inMemoryReferences = inMemoryReferences.filter((r) => r.id !== id);
    if (inMemoryReferences.length < initialLen) deleted = true;

    return deleted;
  },

  async count(options?: { type?: string }): Promise<number> {
    const col = getCollection<Reference>("references");
    if (col) {
      try {
        const filter = options?.type && options.type !== "ALL" ? { type: options.type } : {};
        return await col.countDocuments(filter);
      } catch (err) {
        console.warn("[ReferenceRepository] MongoDB count error:", err);
      }
    }

    if (options?.type && options.type !== "ALL") {
      return inMemoryReferences.filter((r) => r.type === options.type).length;
    }
    return inMemoryReferences.length;
  },
};

/**
 * Paper Repository for Research Papers and Gaps
 */
export const paperRepository = {
  async findAll(): Promise<PaperReference[]> {
    const papersCol = getCollection<PaperReference>("papers");
    if (papersCol) {
      try {
        const docs = await papersCol.find({}).sort({ dateAdded: -1 }).toArray();
        if (docs.length > 0) {
          return docs.map(cleanDoc);
        }
      } catch (err) {
        console.warn("[PaperRepository] MongoDB findAll error:", err);
      }
    }

    // Check references collection for type=PAPER
    const refCol = getCollection<Reference>("references");
    if (refCol) {
      try {
        const docs = await refCol.find({ type: "PAPER" }).sort({ dateAdded: -1 }).toArray();
        if (docs.length > 0) {
          return docs.map(cleanDoc) as PaperReference[];
        }
      } catch (err) {
        console.warn("[PaperRepository] MongoDB refCol find error:", err);
      }
    }

    return inMemoryReferences.filter((r) => r.type === "PAPER") as PaperReference[];
  },

  async findById(id: string): Promise<PaperReference | null> {
    const papersCol = getCollection<PaperReference>("papers");
    if (papersCol) {
      try {
        const doc = await papersCol.findOne({ id });
        if (doc) return cleanDoc<PaperReference>(doc);
      } catch (err) {
        console.warn("[PaperRepository] MongoDB findById error:", err);
      }
    }

    const refCol = getCollection<Reference>("references");
    if (refCol) {
      try {
        const doc = await refCol.findOne({ id, type: "PAPER" });
        if (doc) return cleanDoc<PaperReference>(doc as any);
      } catch (err) {
        console.warn("[PaperRepository] MongoDB refCol findOne error:", err);
      }
    }

    const found = inMemoryReferences.find((r) => r.id === id && r.type === "PAPER");
    return (found as PaperReference) || null;
  },

  async getResearchGaps(): Promise<ResearchGap[]> {
    const papers = await this.findAll();
    return papers.flatMap((p) => (p as any).researchGapsList || p.researchGaps || []);
  },
};

/**
 * Citation Paper Repository (Saved A4 Citation Documents)
 */
export const citationPaperRepository = {
  async findAll(): Promise<CitationPaper[]> {
    const col = getCollection<CitationPaper>("citationPapers");
    if (col) {
      try {
        const docs = await col.find({}).sort({ generatedAt: -1, createdAt: -1 }).toArray();
        return docs.map(cleanDoc);
      } catch (err) {
        console.warn("[CitationPaperRepository] MongoDB findAll error:", err);
      }
    }
    return inMemoryCitationPapers;
  },

  async findById(id: string): Promise<CitationPaper | null> {
    const col = getCollection<CitationPaper>("citationPapers");
    if (col) {
      try {
        const doc = await col.findOne({ id });
        if (doc) return cleanDoc<CitationPaper>(doc);
      } catch (err) {
        console.warn("[CitationPaperRepository] MongoDB findById error:", err);
      }
    }

    const found = inMemoryCitationPapers.find((p) => p.id === id);
    return found || null;
  },

  async create(data: Partial<CitationPaper>): Promise<CitationPaper> {
    const newPaper: CitationPaper = {
      id: data.id || `cp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: data.title || "Untitled Citation Paper",
      citationStyle: data.citationStyle || "IEEE",
      generatedAt: data.generatedAt || new Date().toISOString(),
      referenceCount: data.referenceCount ?? (data.references?.length || 0),
      references: data.references || [],
      formattedText: data.formattedText || "",
      referenceIds: data.referenceIds || (data.references?.map((r) => r.id) || []),
      createdAt: data.createdAt || new Date().toISOString(),
      customNotes: data.customNotes,
    };

    const col = getCollection<CitationPaper>("citationPapers");
    if (col) {
      try {
        await col.updateOne({ id: newPaper.id }, { $set: newPaper }, { upsert: true });
      } catch (err) {
        console.warn("[CitationPaperRepository] MongoDB create error:", err);
      }
    }

    const idx = inMemoryCitationPapers.findIndex((p) => p.id === newPaper.id);
    if (idx >= 0) {
      inMemoryCitationPapers[idx] = newPaper;
    } else {
      inMemoryCitationPapers.unshift(newPaper);
    }
    return newPaper;
  },

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    const col = getCollection<CitationPaper>("citationPapers");
    if (col) {
      try {
        const res = await col.deleteOne({ id });
        deleted = res.deletedCount > 0;
      } catch (err) {
        console.warn("[CitationPaperRepository] MongoDB delete error:", err);
      }
    }

    const initialLen = inMemoryCitationPapers.length;
    inMemoryCitationPapers = inMemoryCitationPapers.filter((p) => p.id !== id);
    if (inMemoryCitationPapers.length < initialLen) deleted = true;

    return deleted;
  },
};

/**
 * Notification Repository
 */
export const notificationRepository = {
  async findAll(): Promise<Notification[]> {
    return inMemoryNotifications;
  },

  async create(notif: Partial<Notification>): Promise<Notification> {
    const newNotif: Notification = {
      id: notif.id || `n_${Date.now()}`,
      title: notif.title || "Notification",
      message: notif.message || "",
      time: notif.time || "Just now",
      read: Boolean(notif.read),
      type: notif.type || "info",
    };
    inMemoryNotifications.unshift(newNotif);
    return newNotif;
  },

  async markAllRead(): Promise<void> {
    inMemoryNotifications = inMemoryNotifications.map((n) => ({ ...n, read: true }));
  },
};

/**
 * User Repository
 */
export const userRepository = {
  async getProfile(email?: string): Promise<any> {
    const col = getCollection("users");
    if (col) {
      try {
        const query = email ? { email } : {};
        const user = await col.findOne(query);
        if (user) return cleanDoc(user);
      } catch (err) {
        console.warn("[UserRepository] MongoDB getProfile error:", err);
      }
    }
    return null;
  },

  async saveProfile(profile: any): Promise<any> {
    const col = getCollection("users");
    if (col) {
      try {
        const email = profile.email || "researcher@refscan.app";
        await col.updateOne({ email }, { $set: profile }, { upsert: true });
      } catch (err) {
        console.warn("[UserRepository] MongoDB saveProfile error:", err);
      }
    }
    return profile;
  },
};
