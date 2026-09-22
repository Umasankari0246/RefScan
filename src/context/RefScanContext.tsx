import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Reference, Notification, BookReference, PaperReference, ExtractedReferenceItem, CitationStyle, CitationPaper } from "../types";
import { StorageService } from "../services/storageService";
import { ReferenceService } from "../services/referenceService";
import { apiClient, BackendHealthStatus } from "../services/apiClient";
import { fetchBookMetadata } from "../services/bookMetadataService";
import { extractTextFromFile, parsePaperMetadata } from "../services/paperExtractionService";
import { extractReferencesFromText, convertExtractedItemToReference } from "../services/referenceExtractionService";

interface RefScanContextType {
  references: Reference[];
  addReference: (ref: Reference) => void;
  updateReference: (ref: Reference) => void;
  deleteReference: (id: string) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Backend connection state
  backendStatus: "online" | "offline" | "checking";
  backendHealth: BackendHealthStatus | null;
  checkBackendHealth: () => Promise<void>;

  // Book scan states
  scanState: "idle" | "scanning" | "processing" | "success" | "error";
  setScanState: (s: "idle" | "scanning" | "processing" | "success" | "error") => void;
  activeBook: BookReference | null;
  setActiveBook: (b: BookReference | null) => void;
  scanBookIsbn: (isbn: string) => Promise<BookReference>;

  // Paper upload states
  uploadStage: number;
  setUploadStage: (stage: number) => void;
  uploadDone: boolean;
  setUploadDone: (done: boolean) => void;
  activePaper: PaperReference | null;
  setActivePaper: (p: PaperReference | null) => void;
  uploadAndProcessPaper: (fileOrName: File | string, fileSize?: string) => Promise<PaperReference>;

  // Staged Multiple Reference Collection
  stagedReferences: ExtractedReferenceItem[];
  stagedSessionName: string;
  stagedSourceType: "pdf" | "book_scan" | "manual";
  setStagedReferences: (items: ExtractedReferenceItem[], sessionName?: string, sourceType?: "pdf" | "book_scan" | "manual") => void;
  addStagedReference: (item: ExtractedReferenceItem) => void;
  toggleStagedReferenceSelection: (id: string) => void;
  selectAllStagedReferences: (selected: boolean) => void;
  updateStagedReference: (item: ExtractedReferenceItem) => void;
  removeStagedReference: (id: string) => void;
  clearStagedReferences: () => void;
  batchSaveSelectedReferences: (targetStyle?: CitationStyle) => Promise<{ savedCount: number; skippedCount: number }>;

  // Saved Citation Papers
  citationPapers: CitationPaper[];
  saveCitationPaper: (paper: CitationPaper) => void;
  deleteCitationPaper: (id: string) => void;
}

const RefScanContext = createContext<RefScanContextType | undefined>(undefined);

export const RefScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [references, setReferences] = useState<Reference[]>(() => StorageService.getReferences());
  const [notifications, setNotifications] = useState<Notification[]>(() => StorageService.getNotifications());
  const [citationPapers, setCitationPapers] = useState<CitationPaper[]>(() => StorageService.getCitationPapers());
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);

  // Scanner states
  const [scanState, setScanState] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [activeBook, setActiveBook] = useState<BookReference | null>(null);

  // Paper states
  const [uploadStage, setUploadStage] = useState<number>(0);
  const [uploadDone, setUploadDone] = useState<boolean>(false);
  const [activePaper, setActivePaper] = useState<PaperReference | null>(null);

  // Staged batch collection state
  const [stagedReferences, setStagedReferencesState] = useState<ExtractedReferenceItem[]>(() => {
    try {
      const stored = localStorage.getItem("refscan_staged_references");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [stagedSessionName, setStagedSessionName] = useState<string>(() => {
    return localStorage.getItem("refscan_staged_session_name") || "Research References";
  });

  const [stagedSourceType, setStagedSourceType] = useState<"pdf" | "book_scan" | "manual">(() => {
    return (localStorage.getItem("refscan_staged_source_type") as any) || "pdf";
  });

  // Sync staged references to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("refscan_staged_references", JSON.stringify(stagedReferences));
      localStorage.setItem("refscan_staged_session_name", stagedSessionName);
      localStorage.setItem("refscan_staged_source_type", stagedSourceType);
    } catch (err) {
      console.warn("Error storing staged references:", err);
    }
  }, [stagedReferences, stagedSessionName, stagedSourceType]);

  // Check backend health & sync references and citation papers
  const checkBackendHealth = useCallback(async () => {
    try {
      const health = await apiClient.checkHealth();
      setBackendHealth(health);
      if (health.status === "online") {
        setBackendStatus("online");

        // 1. Sync references
        const serverRefs = await apiClient.getReferences();
        if (serverRefs && serverRefs.length > 0) {
          setReferences(serverRefs);
          StorageService.setReferences(serverRefs);
        } else {
          // If server collection is empty but local storage has references, sync to MongoDB
          const localRefs = StorageService.getReferences();
          if (localRefs && localRefs.length > 0) {
            for (const r of localRefs) {
              await apiClient.saveReference(r).catch(() => {});
            }
          }
        }

        // 2. Sync citation papers
        const serverCitations = await apiClient.getCitationPapers();
        if (serverCitations && serverCitations.length > 0) {
          setCitationPapers(serverCitations);
          StorageService.setCitationPapers(serverCitations);
        } else {
          // If server collection is empty but local storage has citation papers, sync to MongoDB
          const localCitations = StorageService.getCitationPapers();
          if (localCitations && localCitations.length > 0) {
            for (const cp of localCitations) {
              await apiClient.saveCitationPaper(cp).catch(() => {});
            }
          }
        }
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  useEffect(() => {
    StorageService.setReferences(references);
  }, [references]);

  useEffect(() => {
    StorageService.setNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    StorageService.setCitationPapers(citationPapers);
  }, [citationPapers]);

  const addReference = (ref: Reference) => {
    const refWithId: Reference = {
      ...ref,
      id: ref.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      saved: true,
      dateAdded: ref.dateAdded || new Date().toISOString().split("T")[0],
    };

    setReferences((prev) => {
      const idx = prev.findIndex((r) => r.id === refWithId.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = refWithId;
        return copy;
      }
      return [refWithId, ...prev];
    });

    ReferenceService.createReference(refWithId).catch((err) => {
      console.warn("[RefScanContext] Create sync error:", err);
    });

    const newNotif: Notification = {
      id: "n_" + Date.now(),
      title: "Reference Saved",
      message: `"${refWithId.title}" is saved in your reference library.`,
      time: "Just now",
      read: false,
      type: "success",
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const updateReference = (ref: Reference) => {
    setReferences((prev) => prev.map((r) => (r.id === ref.id ? ref : r)));
    ReferenceService.updateReference(ref).catch((err) => {
      console.warn("[RefScanContext] Update sync error:", err);
    });
  };

  const deleteReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
    ReferenceService.deleteReference(id).catch((err) => {
      console.warn("[RefScanContext] Delete sync error:", err);
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Live ISBN lookup using backend API with client fallback
  const scanBookIsbn = async (isbn: string): Promise<BookReference> => {
    setScanState("processing");
    try {
      const book = await apiClient.lookupIsbn(isbn);
      setActiveBook(book);
      setScanState("success");
      return book;
    } catch {
      try {
        const fallbackBook = await fetchBookMetadata(isbn);
        setActiveBook(fallbackBook);
        setScanState("success");
        return fallbackBook;
      } catch (err: any) {
        setScanState("error");
        throw new Error(err.message || "We couldn't find an exact match for this ISBN.");
      }
    }
  };

  // Real multi-page PDF processing with pdfjs-dist
  const uploadAndProcessPaper = async (fileOrName: File | string, fileSize?: string): Promise<PaperReference> => {
    setUploadStage(0);
    setUploadDone(false);

    try {
      if (typeof fileOrName !== "string" && fileOrName instanceof File) {
        const payload = await extractTextFromFile(fileOrName);
        const parsedPaper = await parsePaperMetadata(fileOrName, payload);
        const savedPaper = await apiClient.uploadPaper(parsedPaper);
        const finalPaper = savedPaper || parsedPaper;

        // Extract real references from the PDF text if available
        if (payload.text.length > 50) {
          const extractedItems = extractReferencesFromText(
            payload.text,
            fileOrName.name,
            finalPaper.id,
            references
          );

          if (extractedItems.length > 0) {
            setStagedReferencesState(extractedItems);
            setStagedSessionName(`References from ${fileOrName.name}`);
            setStagedSourceType("pdf");
          }
        }

        // Ensure finalPaper is saved in references library
        finalPaper.saved = true;
        setReferences((prev) => {
          const exists = prev.some((r) => r.id === finalPaper.id);
          const next = exists ? prev.map((r) => (r.id === finalPaper.id ? finalPaper : r)) : [finalPaper, ...prev];
          StorageService.setReferences(next);
          return next;
        });

        setActivePaper(finalPaper);
        return finalPaper;
      } else {
        const fileName = fileOrName;
        const serverPaper = await apiClient.uploadPaper(fileName, fileSize);
        serverPaper.saved = true;
        setReferences((prev) => {
          const exists = prev.some((r) => r.id === serverPaper.id);
          const next = exists ? prev.map((r) => (r.id === serverPaper.id ? serverPaper : r)) : [serverPaper, ...prev];
          StorageService.setReferences(next);
          return next;
        });
        setActivePaper(serverPaper);
        return serverPaper;
      }
    } catch (err) {
      console.warn("[RefScanContext] Paper extraction failed:", err);
      const fileName = typeof fileOrName === "string" ? fileOrName : fileOrName.name;
      const failedPaper: PaperReference = {
        id: "p_" + Date.now(),
        type: "PAPER",
        title: fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " "),
        authors: ["Not available"],
        publicationYear: new Date().getFullYear(),
        abstract: "Paper extraction could not complete successfully.",
        keywords: ["Upload Error"],
        references: [],
        source: "PDF Ingestion",
        dateAdded: new Date().toISOString().split("T")[0],
        analysisStatus: "failed",
        citationStyle: "IEEE",
        saved: false,
      };

      setActivePaper(failedPaper);
      return failedPaper;
    }
  };

  // --- Staged Multiple Reference Collection Actions ---

  const setStagedReferences = (
    items: ExtractedReferenceItem[],
    sessionName?: string,
    sourceType?: "pdf" | "book_scan" | "manual"
  ) => {
    setStagedReferencesState(items);
    if (sessionName) setStagedSessionName(sessionName);
    if (sourceType) setStagedSourceType(sourceType);
  };

  const addStagedReference = (item: ExtractedReferenceItem) => {
    setStagedReferencesState((prev) => [item, ...prev]);
  };

  const toggleStagedReferenceSelection = (id: string) => {
    setStagedReferencesState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectAllStagedReferences = (selected: boolean) => {
    setStagedReferencesState((prev) =>
      prev.map((item) => ({ ...item, selected }))
    );
  };

  const updateStagedReference = (updated: ExtractedReferenceItem) => {
    setStagedReferencesState((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const removeStagedReference = (id: string) => {
    setStagedReferencesState((prev) => prev.filter((item) => item.id !== id));
  };

  const clearStagedReferences = () => {
    setStagedReferencesState([]);
  };

  const batchSaveSelectedReferences = async (
    targetStyle: CitationStyle = "IEEE"
  ): Promise<{ savedCount: number; skippedCount: number }> => {
    const selectedItems = stagedReferences.filter((item) => item.selected);
    if (selectedItems.length === 0) return { savedCount: 0, skippedCount: 0 };

    let savedCount = 0;
    const newReferencesToSave: Reference[] = [];

    for (const item of selectedItems) {
      const newRef = convertExtractedItemToReference(item, targetStyle);
      newReferencesToSave.push(newRef);
      savedCount++;
    }

    setReferences((prev) => [...newReferencesToSave, ...prev]);

    for (const ref of newReferencesToSave) {
      ReferenceService.createReference(ref).catch((err) => {
        console.warn("[RefScanContext] Batch item sync error:", err);
      });
    }

    setStagedReferencesState((prev) =>
      prev.map((item) => {
        if (item.selected) {
          const matchingNewRef = newReferencesToSave.find(
            (r) => r.originalReferenceText === item.originalText || r.title === item.title
          );
          return {
            ...item,
            status: "already_saved",
            existingReferenceId: matchingNewRef?.id,
            selected: false,
          };
        }
        return item;
      })
    );

    const newNotif: Notification = {
      id: "n_" + Date.now(),
      title: "Batch References Saved",
      message: `Successfully added ${savedCount} references to your research library.`,
      time: "Just now",
      read: false,
      type: "success",
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return { savedCount, skippedCount: stagedReferences.length - savedCount };
  };

  // --- Saved Citation Papers Actions ---

  const saveCitationPaper = (paper: CitationPaper) => {
    StorageService.saveCitationPaper(paper);
    apiClient.saveCitationPaper(paper).catch((err) => {
      console.warn("[RefScanContext] Citation paper backend sync deferred:", err);
    });

    setCitationPapers((prev) => {
      const idx = prev.findIndex((p) => p.id === paper.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = paper;
        return copy;
      }
      return [paper, ...prev];
    });

    const newNotif: Notification = {
      id: "n_" + Date.now(),
      title: "Citation Paper Saved",
      message: `"${paper.title}" is saved in your citation documents.`,
      time: "Just now",
      read: false,
      type: "success",
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const deleteCitationPaper = (id: string) => {
    StorageService.deleteCitationPaper(id);
    apiClient.deleteCitationPaper(id).catch((err) => {
      console.warn("[RefScanContext] Citation paper backend delete deferred:", err);
    });
    setCitationPapers((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <RefScanContext.Provider
      value={{
        references,
        addReference,
        updateReference,
        deleteReference,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,

        backendStatus,
        backendHealth,
        checkBackendHealth,

        scanState,
        setScanState,
        activeBook,
        setActiveBook,
        scanBookIsbn,

        uploadStage,
        setUploadStage,
        uploadDone,
        setUploadDone,
        activePaper,
        setActivePaper,
        uploadAndProcessPaper,

        stagedReferences,
        stagedSessionName,
        stagedSourceType,
        setStagedReferences,
        addStagedReference,
        toggleStagedReferenceSelection,
        selectAllStagedReferences,
        updateStagedReference,
        removeStagedReference,
        clearStagedReferences,
        batchSaveSelectedReferences,

        citationPapers,
        saveCitationPaper,
        deleteCitationPaper,
      }}
    >
      {children}
    </RefScanContext.Provider>
  );
};

export const useRefScan = () => {
  const context = useContext(RefScanContext);
  if (!context) throw new Error("useRefScan must be used within a RefScanProvider");
  return context;
};
