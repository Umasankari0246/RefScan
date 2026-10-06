/**
 * RefScan - Database Reference Models & Repositories
 * Strictly multi-user isolated repositories backed by MongoDB.
 * Every query, creation, update, and deletion is scoped strictly by userId.
 * In-memory fallback is disabled; offline database throws DatabaseUnavailableError.
 */

import { Reference, PaperReference, ResearchGap, Notification, CitationPaper } from "../../types/index.ts";
import { getCollection } from "../db.ts";

/**
 * Remove MongoDB internal _id from returned objects and normalize array fields
 * so both legacy and structured PDF extraction fields are always present.
 */
function cleanDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;

  if (rest.type === "PAPER") {
    const rawGaps = Array.isArray(rest.researchGaps) && rest.researchGaps.length > 0
      ? rest.researchGaps
      : Array.isArray(rest.researchGapsList)
        ? rest.researchGapsList
        : [];
    const normalizedGaps = rawGaps.map((g: any, idx: number) => ({
      ...g,
      id: g.id || `${rest.id || "paper"}_gap_${idx + 1}`,
      strength: (g.strength === "strong" || g.strength === "moderate" || g.strength === "emerging") ? g.strength : "moderate",
      type: (g.type === "limitation" || g.type === "unexplored" || g.type === "improvement" || g.type === "novelty") ? g.type : "unexplored",
    }));

    return {
      ...rest,
      authors: Array.isArray(rest.authors) && rest.authors.length > 0 ? rest.authors : ["Unknown Author"],
      keywords: Array.isArray(rest.keywords) ? rest.keywords : [],
      technologies: Array.isArray(rest.technologies) && rest.technologies.length > 0
        ? rest.technologies
        : Array.isArray(rest.toolsAndTechList)
          ? rest.toolsAndTechList.map((t: any) => (typeof t === "string" ? t : t.name))
          : [],
      algorithms: Array.isArray(rest.algorithms) && rest.algorithms.length > 0
        ? rest.algorithms
        : Array.isArray(rest.algorithmsList)
          ? rest.algorithmsList.map((a: any) => (typeof a === "string" ? a : a.name))
          : [],
      datasets: Array.isArray(rest.datasets) && rest.datasets.length > 0
        ? rest.datasets
        : Array.isArray(rest.datasetsUsedList) ? rest.datasetsUsedList : [],
      keyFindings: Array.isArray(rest.keyFindings) && rest.keyFindings.length > 0
        ? rest.keyFindings
        : Array.isArray(rest.resultsAndFindingsList)
          ? rest.resultsAndFindingsList.map((r: any) => (typeof r === "string" ? r : r.text))
          : [],
      limitations: Array.isArray(rest.limitations) && rest.limitations.length > 0
        ? rest.limitations
        : Array.isArray(rest.limitationsList)
          ? rest.limitationsList.map((l: any) => (typeof l === "string" ? l : l.text))
          : [],
      futureScope: Array.isArray(rest.futureScope) && rest.futureScope.length > 0
        ? rest.futureScope
        : Array.isArray(rest.futureScopeList)
          ? rest.futureScopeList.map((f: any) => (typeof f === "string" ? f : f.text))
          : [],
      researchGaps: normalizedGaps,
      researchGapsList: normalizedGaps,
      researchProblem: rest.researchProblem || rest.problemStatement || "",
      researchObjective: rest.researchObjective || rest.objectivesList?.[0] || "",
      methodology: rest.methodology || rest.proposedMethod || "",
      proposedMethod: rest.proposedMethod || rest.methodology || "",
      existingMethod: rest.existingMethod || rest.existingApproach || "",
      references: Array.isArray(rest.references) ? rest.references : Array.isArray(rest.extractedReferences) ? rest.extractedReferences : [],
      sections: Array.isArray(rest.sections) ? rest.sections : [],
      fullText: typeof rest.fullText === "string" ? rest.fullText : "",
      rawTextByPage: Array.isArray(rest.rawTextByPage) ? rest.rawTextByPage : [],
    } as T;
  }

  if (rest.type === "BOOK") {
    return {
      ...rest,
      authors: Array.isArray(rest.authors) && rest.authors.length > 0 ? rest.authors : ["Unknown Author"],
    } as T;
  }

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
 * Reference Repository (Books, Papers, Websites) - Scoped to Authenticated User
 */
export const referenceRepository = {
  async findAll(userId: string, options?: ReferenceQueryOptions): Promise<Reference[]> {
    if (!userId) throw new Error("Authenticated userId is required to query references.");
    const col = getCollection<Reference>("references");

    const filter: any = { userId };

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
  },

  async findById(id: string, userId: string): Promise<Reference | null> {
    if (!userId) throw new Error("Authenticated userId is required to query reference.");
    const col = getCollection<Reference>("references");
    const doc = await col.findOne({ id, userId });
    return doc ? cleanDoc<Reference>(doc) : null;
  },

  async create(data: Partial<Reference>, userId: string): Promise<Reference> {
    if (!userId) throw new Error("Authenticated userId is required to create a reference.");
    const col = getCollection<Reference>("references");

    const newRef: Reference = {
      ...(data as Reference),
      id: data.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId, // Strictly bind to authenticated user
      saved: true,
      dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
    };

    await col.updateOne({ id: newRef.id, userId }, { $set: newRef }, { upsert: true });

    // If it's a paper, also maintain record in the 'papers' collection
    if (newRef.type === "PAPER") {
      const papersCol = getCollection("papers");
      await papersCol.updateOne({ id: newRef.id, userId }, { $set: newRef }, { upsert: true });
    }

    return newRef;
  },

  async update(id: string, updateData: Partial<Reference>, userId: string): Promise<Reference | null> {
    if (!userId) throw new Error("Authenticated userId is required to update a reference.");
    const col = getCollection<Reference>("references");

    // Do not allow reassigning document ownership
    const { userId: _, id: __, ...safeData } = updateData;

    const res = await col.findOneAndUpdate(
      { id, userId },
      { $set: safeData },
      { returnDocument: "after" }
    );

    if (res) {
      // If paper, also update in papers collection
      if ((res as any).type === "PAPER") {
        const papersCol = getCollection("papers");
        await papersCol.updateOne({ id, userId }, { $set: safeData });
      }
      return cleanDoc<Reference>(res);
    }

    return null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (!userId) throw new Error("Authenticated userId is required to delete a reference.");
    const col = getCollection<Reference>("references");

    const res = await col.deleteOne({ id, userId });
    const deleted = res.deletedCount > 0;

    if (deleted) {
      const papersCol = getCollection("papers");
      await papersCol.deleteOne({ id, userId });
    }

    return deleted;
  },

  async count(userId: string, options?: { type?: string }): Promise<number> {
    if (!userId) return 0;
    const col = getCollection<Reference>("references");
    const filter: any = { userId };
    if (options?.type && options.type !== "ALL") {
      filter.type = options.type;
    }
    return await col.countDocuments(filter);
  },
};

/**
 * Paper Repository for Research Papers and Gaps - Scoped to Authenticated User
 */
export const paperRepository = {
  async findAll(userId: string): Promise<PaperReference[]> {
    if (!userId) throw new Error("Authenticated userId is required to query papers.");
    const papersCol = getCollection<PaperReference>("papers");

    const docs = await papersCol.find({ userId }).sort({ dateAdded: -1 }).toArray();
    if (docs.length > 0) {
      return docs.map(cleanDoc);
    }

    // Check references collection for type=PAPER
    const refCol = getCollection<Reference>("references");
    const refDocs = await refCol.find({ userId, type: "PAPER" }).sort({ dateAdded: -1 }).toArray();
    return refDocs.map(cleanDoc) as PaperReference[];
  },

  async findById(id: string, userId: string): Promise<PaperReference | null> {
    if (!userId) throw new Error("Authenticated userId is required to query paper.");
    const papersCol = getCollection<PaperReference>("papers");
    const doc = await papersCol.findOne({ id, userId });
    if (doc) return cleanDoc<PaperReference>(doc);

    const refCol = getCollection<Reference>("references");
    const refDoc = await refCol.findOne({ id, userId, type: "PAPER" });
    return refDoc ? (cleanDoc<PaperReference>(refDoc as any)) : null;
  },

  async getResearchGaps(userId: string): Promise<ResearchGap[]> {
    const papers = await this.findAll(userId);
    return papers.flatMap((p) => (p as any).researchGapsList || p.researchGaps || []);
  },
};

/**
 * Citation Paper Repository (Saved A4 Citation Documents) - Scoped to Authenticated User
 */
export const citationPaperRepository = {
  async findAll(userId: string): Promise<CitationPaper[]> {
    if (!userId) throw new Error("Authenticated userId is required to query citation papers.");
    const col = getCollection<CitationPaper>("citationPapers");
    const docs = await col.find({ userId }).sort({ generatedAt: -1, createdAt: -1 }).toArray();
    return docs.map(cleanDoc);
  },

  async findById(id: string, userId: string): Promise<CitationPaper | null> {
    if (!userId) throw new Error("Authenticated userId is required to query citation paper.");
    const col = getCollection<CitationPaper>("citationPapers");
    const doc = await col.findOne({ id, userId });
    return doc ? cleanDoc<CitationPaper>(doc) : null;
  },

  async create(data: Partial<CitationPaper>, userId: string): Promise<CitationPaper> {
    if (!userId) throw new Error("Authenticated userId is required to create a citation paper.");
    const col = getCollection<CitationPaper>("citationPapers");

    const newPaper: CitationPaper = {
      id: data.id || `cp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId, // Strictly bind to authenticated user
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

    await col.updateOne({ id: newPaper.id, userId }, { $set: newPaper }, { upsert: true });
    return newPaper;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (!userId) throw new Error("Authenticated userId is required to delete a citation paper.");
    const col = getCollection<CitationPaper>("citationPapers");
    const res = await col.deleteOne({ id, userId });
    return res.deletedCount > 0;
  },
};

/**
 * Notification Repository - Scoped to Authenticated User in MongoDB
 */
export const notificationRepository = {
  async findAll(userId: string): Promise<Notification[]> {
    if (!userId) return [];
    const col = getCollection<Notification>("notifications");
    const docs = await col.find({ userId }).sort({ time: -1 }).toArray();
    return docs.map(cleanDoc);
  },

  async create(notif: Partial<Notification>, userId: string): Promise<Notification> {
    if (!userId) throw new Error("Authenticated userId is required to create a notification.");
    const col = getCollection<Notification>("notifications");

    const newNotif: Notification = {
      id: notif.id || `n_${Date.now()}`,
      userId,
      title: notif.title || "Notification",
      message: notif.message || "",
      time: notif.time || "Just now",
      read: Boolean(notif.read),
      type: notif.type || "info",
    };

    await col.insertOne(newNotif);
    return newNotif;
  },

  async markAllRead(userId: string): Promise<void> {
    if (!userId) return;
    const col = getCollection<Notification>("notifications");
    await col.updateMany({ userId }, { $set: { read: true } });
  },
};
