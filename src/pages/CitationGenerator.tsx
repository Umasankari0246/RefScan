import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Printer, Download, Copy, Check, Save, Plus, ArrowUp, ArrowDown,
  Layers, Search, FileText, Sparkles, CheckSquare, Square,
  BookOpen, Globe, Quote, Trash2, ArrowLeft, RefreshCw, BookmarkCheck,
  ZoomIn, ZoomOut
} from "lucide-react";
import { Button, Badge, Card, Input, Modal, Select } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import {
  generateCitationHTML,
  generateCitationPlainText,
  generateInTextCitation,
  generateBibTeX,
  generateRIS,
  generateBatchBibliography,
  downloadCitationFile
} from "../services/citationService";
import { exportElementAsPdf } from "../services/pdfExportService";
import { Reference, CitationStyle, CitationPaper, BookReference, PaperReference, WebsiteReference } from "../types";

const STYLES: { id: CitationStyle; label: string; tag: string }[] = [
  { id: "IEEE", label: "IEEE Style", tag: "Numbered [1]" },
  { id: "APA", label: "APA 7th Edition", tag: "Author-Date" },
  { id: "MLA", label: "MLA 9th Edition", tag: "Works Cited" },
  { id: "Harvard", label: "Harvard Style", tag: "Author-Year" },
];

export default function CitationGenerator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRefId = searchParams.get("ref");

  const { references, saveCitationPaper, addReference } = useRefScan();

  // Document metadata state
  const [docTitle, setDocTitle] = useState("References & Bibliography");
  const [docSubtitle, setDocSubtitle] = useState("Academic Research References");
  const [style, setStyle] = useState<CitationStyle>("IEEE");
  const [formatMode, setFormatMode] = useState<"standard" | "bibtex" | "ris">("standard");

  // Selection & Ordering
  const [selectedIds, setSelectedIds] = useState<string[]>(() => references.map((r) => r.id));
  const [orderedRefs, setOrderedRefs] = useState<Reference[]>(() => [...references]);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // A4 Canvas Interactive Zoom State (for responsive mobile inspection)
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | "100" | "custom">("fit");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const updateWidth = () => {
      if (canvasContainerRef.current) {
        setContainerWidth(canvasContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const calculatedScale = useMemo(() => {
    if (zoomMode === "100") return 1;
    if (zoomMode === "custom") return zoomLevel;
    // Standard A4 width is 794px at 96 DPI
    if (containerWidth < 810 && containerWidth > 0) {
      return Math.max(0.35, Math.min(1, (containerWidth - 24) / 794));
    }
    return 1;
  }, [zoomMode, zoomLevel, containerWidth]);

  // Sync references when library changes
  useEffect(() => {
    setOrderedRefs((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newRefs = references.filter((r) => !existingIds.has(r.id));
      const currentAvailable = prev.filter((r) => references.some((ref) => ref.id === r.id));
      return [...currentAvailable, ...newRefs];
    });

    if (preselectedRefId) {
      if (!selectedIds.includes(preselectedRefId)) {
        setSelectedIds((prev) => [preselectedRefId, ...prev]);
      }
    } else if (selectedIds.length === 0 && references.length > 0) {
      setSelectedIds(references.map((r) => r.id));
    }
  }, [references, preselectedRefId]);

  // Active selected references list
  const activeSelectedRefs = useMemo(() => {
    return orderedRefs.filter((r) => selectedIds.includes(r.id));
  }, [orderedRefs, selectedIds]);

  // Filtered references for the selector panel
  const filteredLibraryRefs = useMemo(() => {
    if (!searchTerm.trim()) return orderedRefs;
    const q = searchTerm.toLowerCase();
    return orderedRefs.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.authors?.some((a) => a.toLowerCase().includes(q)) ||
        r.type.toLowerCase().includes(q)
    );
  }, [orderedRefs, searchTerm]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(orderedRefs.map((r) => r.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Ordering helpers
  const moveRef = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= orderedRefs.length) return;
    const copy = [...orderedRefs];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    setOrderedRefs(copy);
  };

  // Copy helpers
  const handleCopyAll = () => {
    if (activeSelectedRefs.length === 0) return;
    let fullText = "";

    if (formatMode === "bibtex") {
      fullText = activeSelectedRefs.map((r) => generateBibTeX(r)).join("\n\n");
    } else if (formatMode === "ris") {
      fullText = activeSelectedRefs.map((r) => generateRIS(r)).join("\n\n");
    } else {
      fullText = activeSelectedRefs
        .map((r, i) => {
          const plain = generateCitationPlainText(r, style);
          return style === "IEEE" ? `[${i + 1}] ${plain}` : plain;
        })
        .join("\n\n");
    }

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (ref: Reference, index: number) => {
    const plain =
      formatMode === "bibtex"
        ? generateBibTeX(ref)
        : formatMode === "ris"
        ? generateRIS(ref)
        : style === "IEEE"
        ? `[${index + 1}] ${generateCitationPlainText(ref, style)}`
        : generateCitationPlainText(ref, style);

    navigator.clipboard.writeText(plain);
    setCopiedSingleId(ref.id);
    setTimeout(() => setCopiedSingleId(null), 2000);
  };

  // Print helper - prints ONLY the A4 citation paper sheet via @media print CSS
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Export helper - generates and downloads standard A4 PDF document
  const handleExportPdf = async () => {
    if (activeSelectedRefs.length === 0) return;
    const sheetEl = document.getElementById("citation-a4-sheet");
    if (!sheetEl) {
      window.print();
      return;
    }

    try {
      setIsExportingPdf(true);
      const safeTitle = docTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const filename = `refscan_${safeTitle || "citation_paper"}_${style.toLowerCase()}.pdf`;
      await exportElementAsPdf(sheetEl, { filename, title: docTitle });
    } catch (err) {
      console.error("Error exporting A4 citation paper to PDF:", err);
      // Fallback cleanly to print dialog
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export helper
  const handleExport = (format: "txt" | "bib" | "ris" | "csv" | "json") => {
    if (activeSelectedRefs.length === 0) return;
    const content = generateBatchBibliography(activeSelectedRefs, style, format);
    const ext = format === "bib" ? ".bib" : format === "ris" ? ".ris" : format === "csv" ? ".csv" : format === "json" ? ".json" : ".txt";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `refscan_${docTitle.toLowerCase().replace(/\s+/g, "_")}_${style.toLowerCase()}${ext}`, mime);
  };

  // Save Citation Paper
  const handleSaveCitationPaper = () => {
    if (activeSelectedRefs.length === 0) return;
    const now = new Date().toISOString();
    const newPaper: CitationPaper = {
      id: "cp_" + Date.now(),
      title: docTitle.trim() || "Untitled Citation Paper",
      citationStyle: style,
      createdAt: now,
      generatedAt: now,
      referenceCount: activeSelectedRefs.length,
      referenceIds: activeSelectedRefs.map((r) => r.id),
      references: activeSelectedRefs,
      formattedText: generateBatchBibliography(activeSelectedRefs, style, "txt"),
    };
    saveCitationPaper(newPaper);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Manual Reference form state
  const [manualType, setManualType] = useState<"BOOK" | "PAPER" | "WEBSITE">("BOOK");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthors, setManualAuthors] = useState("");
  const [manualYear, setManualYear] = useState(String(new Date().getFullYear()));
  const [manualVenue, setManualVenue] = useState("");
  const [manualIdNum, setManualIdNum] = useState("");

  const handleAddManualReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const authorList = manualAuthors.split(",").map((a) => a.trim()).filter(Boolean);
    const yr = Number(manualYear) || new Date().getFullYear();

    let newRef: Reference;
    if (manualType === "BOOK") {
      newRef = {
        id: "m_book_" + Date.now(),
        type: "BOOK",
        title: manualTitle.trim(),
        authors: authorList.length > 0 ? authorList : ["Anonymous"],
        publisher: manualVenue.trim() || "Academic Press",
        year: yr,
        isbn13: manualIdNum.trim() || undefined,
        language: "English",
        coverColor: "#5B4BDB",
        source: "Manual Entry",
        status: "verified",
        dateAdded: new Date().toISOString().split("T")[0],
      } as BookReference;
    } else if (manualType === "PAPER") {
      newRef = {
        id: "m_paper_" + Date.now(),
        type: "PAPER",
        title: manualTitle.trim(),
        authors: authorList.length > 0 ? authorList : ["Anonymous"],
        publicationYear: yr,
        journal: manualVenue.trim() || "Academic Journal",
        doi: manualIdNum.trim() || undefined,
        source: "Manual Entry",
        abstract: "Manual reference entry.",
        keywords: [],
        references: [],
        researchProblem: "Not available in manual entry.",
        researchObjective: "Not available in manual entry.",
        methodology: "Not available in manual entry.",
        existingMethod: "Not available in manual entry.",
        technologies: [],
        algorithms: [],
        keyFindings: [],
        limitations: [],
        researchGaps: [],
        futureScope: [],
        analysisStatus: "complete",
        dateAdded: new Date().toISOString().split("T")[0],
      } as PaperReference;
    } else {
      newRef = {
        id: "m_web_" + Date.now(),
        type: "WEBSITE",
        title: manualVenue.trim() || "Online Repository",
        pageTitle: manualTitle.trim(),
        author: authorList[0] || undefined,
        url: manualIdNum.trim() || "https://example.org",
        domain: "example.org",
        accessDate: new Date().toISOString().split("T")[0],
        dateAdded: new Date().toISOString().split("T")[0],
      } as WebsiteReference;
    }

    addReference(newRef);
    setSelectedIds((prev) => [newRef.id, ...prev]);
    setShowManualModal(false);
    setManualTitle("");
    setManualAuthors("");
    setManualVenue("");
    setManualIdNum("");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Top Header Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E6E9F8] no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B4BDB]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
              Citation Paper Studio
            </h1>
            <Badge variant="indigo" size="sm">A4 Standard</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Generate, customize, print, and export complete academic A4 citation papers with IEEE, APA, MLA, Harvard, BibTeX, and RIS standards.
          </p>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportPdf}
            disabled={activeSelectedRefs.length === 0 || isExportingPdf}
            variant="primary"
            size="sm"
            className="bg-[#5B4BDB] hover:bg-[#4938C5] text-white text-xs font-semibold shadow-xs"
            title="Download this citation paper directly as an A4 PDF"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw size={14} className="mr-1.5 animate-spin" /> Exporting PDF...
              </>
            ) : (
              <>
                <Download size={14} className="mr-1.5" /> Export PDF
              </>
            )}
          </Button>

          <Button
            onClick={handlePrint}
            disabled={activeSelectedRefs.length === 0}
            variant="outline"
            size="sm"
            className="text-xs font-semibold bg-white hover:bg-[#F8F7FF] text-[#172554] border-[#DDD8FE]"
            title="Print only this A4 citation paper sheet"
          >
            <Printer size={14} className="mr-1.5 text-[#5B4BDB]" /> Print
          </Button>

          <Button
            onClick={handleSaveCitationPaper}
            disabled={activeSelectedRefs.length === 0}
            variant="outline"
            size="sm"
            className="text-xs font-semibold bg-white hover:bg-[#F8F7FF] text-[#172554] border-[#E2E8F0]"
            title="Save this citation paper to your library"
          >
            {savedSuccess ? (
              <>
                <BookmarkCheck size={14} className="mr-1.5 text-emerald-600" /> Saved!
              </>
            ) : (
              <>
                <Save size={14} className="mr-1.5 text-[#64748B]" /> Save Paper
              </>
            )}
          </Button>

          <Button
            onClick={handleCopyAll}
            disabled={activeSelectedRefs.length === 0}
            variant="secondary"
            size="sm"
            className="text-xs font-semibold"
          >
            {copiedAll ? (
              <>
                <Check size={14} className="mr-1.5 text-emerald-600" /> All Copied
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1.5" /> Copy All
              </>
            )}
          </Button>

          <div className="flex items-center gap-1 border border-[#E6E9F8] rounded-xl p-1 bg-white">
            <Button
              onClick={handleExportPdf}
              disabled={activeSelectedRefs.length === 0 || isExportingPdf}
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 font-mono font-bold text-[#5B4BDB] hover:bg-[#EEF0FF]"
              title="Download as PDF (.pdf)"
            >
              .PDF
            </Button>
            <Button
              onClick={() => handleExport("bib")}
              disabled={activeSelectedRefs.length === 0}
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 font-mono"
              title="Export BibTeX (.bib)"
            >
              .BIB
            </Button>
            <Button
              onClick={() => handleExport("ris")}
              disabled={activeSelectedRefs.length === 0}
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 font-mono"
              title="Export RIS (.ris)"
            >
              .RIS
            </Button>
            <Button
              onClick={() => handleExport("txt")}
              disabled={activeSelectedRefs.length === 0}
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 font-mono"
              title="Export TXT (.txt)"
            >
              .TXT
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              disabled={activeSelectedRefs.length === 0}
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 font-mono"
              title="Export CSV (.csv)"
            >
              .CSV
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Studio Grid (Selector Panel + A4 Document Canvas) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Controls & Reference Selection Panel ────────────────────── */}
        <div className="lg:col-span-4 space-y-4 no-print">
          {/* Document Settings Card */}
          <Card className="p-4 space-y-4 bg-white border-[#E6E9F8]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Document Configuration</span>
              <span className="text-xs text-[#5B4BDB] font-semibold">{activeSelectedRefs.length} selected</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. References & Bibliography"
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Subtitle / Note (Optional)</label>
                <input
                  type="text"
                  value={docSubtitle}
                  onChange={(e) => setDocSubtitle(e.target.value)}
                  placeholder="e.g. Master Thesis Bibliography"
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>

              {/* Format Style Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1.5">Citation Format</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStyle(s.id);
                        setFormatMode("standard");
                      }}
                      className={`text-left p-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                        style === s.id && formatMode === "standard"
                          ? "bg-[#EEF0FF] text-[#5B4BDB] border-[#5B4BDB] font-bold shadow-2xs"
                          : "bg-[#F8F7FF] text-[#64748B] border-[#E6E9F8] hover:border-[#DDD8FE] hover:text-[#172554]"
                      }`}
                    >
                      <span className="block truncate">{s.label}</span>
                      <span className="text-[10px] opacity-75">{s.tag}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  <button
                    onClick={() => setFormatMode("bibtex")}
                    className={`text-left p-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                      formatMode === "bibtex"
                        ? "bg-[#EEF0FF] text-[#5B4BDB] border-[#5B4BDB] font-bold shadow-2xs"
                        : "bg-[#F8F7FF] text-[#64748B] border-[#E6E9F8] hover:border-[#DDD8FE] hover:text-[#172554]"
                    }`}
                  >
                    <span className="block font-mono font-bold">BibTeX</span>
                    <span className="text-[10px] opacity-75">Code block</span>
                  </button>
                  <button
                    onClick={() => setFormatMode("ris")}
                    className={`text-left p-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                      formatMode === "ris"
                        ? "bg-[#EEF0FF] text-[#5B4BDB] border-[#5B4BDB] font-bold shadow-2xs"
                        : "bg-[#F8F7FF] text-[#64748B] border-[#E6E9F8] hover:border-[#DDD8FE] hover:text-[#172554]"
                    }`}
                  >
                    <span className="block font-mono font-bold">RIS Format</span>
                    <span className="text-[10px] opacity-75">Tagged notation</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Reference Selection & Ordering Card */}
          <Card className="p-4 space-y-3 bg-white border-[#E6E9F8]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Select References ({activeSelectedRefs.length}/{references.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAll}
                  className="text-[11px] font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
                >
                  All
                </button>
                <span className="text-[#CBD5E1]">·</span>
                <button
                  onClick={deselectAll}
                  className="text-[11px] font-semibold text-[#64748B] hover:text-[#172554] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter references..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>
              <Button
                onClick={() => setShowManualModal(true)}
                variant="outline"
                size="sm"
                className="text-xs font-semibold whitespace-nowrap h-8"
              >
                <Plus size={13} className="mr-1" /> Add Manual
              </Button>
            </div>

            {/* References list */}
            {references.length === 0 ? (
              <div className="text-center py-6 px-3 bg-[#F8F7FF] rounded-2xl border border-dashed border-[#DDD8FE] space-y-2">
                <FileText size={28} className="mx-auto text-[#94A3B8]" />
                <p className="text-xs font-medium text-[#64748B]">No references saved in library yet.</p>
                <div className="flex justify-center gap-2 pt-1">
                  <Button onClick={() => navigate("/scan")} variant="outline" size="sm" className="text-[11px]">
                    Scan Book
                  </Button>
                  <Button onClick={() => navigate("/upload")} variant="primary" size="sm" className="text-[11px]">
                    Upload PDF
                  </Button>
                </div>
              </div>
            ) : filteredLibraryRefs.length === 0 ? (
              <p className="text-xs text-center text-[#94A3B8] py-4">No matching references found.</p>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#F1F5F9]">
                {filteredLibraryRefs.map((ref, idx) => {
                  const isSelected = selectedIds.includes(ref.id);
                  return (
                    <div
                      key={ref.id}
                      className={`pt-1.5 flex items-start gap-2 p-2 rounded-xl text-xs transition-colors ${
                        isSelected ? "bg-[#EEF0FF]/60 border border-[#DDD8FE]" : "bg-white hover:bg-[#F8F7FF]"
                      }`}
                    >
                      <button
                        onClick={() => toggleSelect(ref.id)}
                        className="mt-0.5 text-[#5B4BDB] cursor-pointer flex-shrink-0"
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-[#CBD5E1]" />}
                      </button>

                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelect(ref.id)}>
                        <p className="font-semibold text-[#172554] truncate">{ref.title}</p>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {ref.authors?.join(", ") || "Anonymous"} ·{" "}
                          {ref.type === "BOOK"
                            ? (ref as BookReference).year
                            : ref.type === "PAPER"
                            ? (ref as PaperReference).publicationYear
                            : "Web"}
                        </p>
                      </div>

                      {/* Reorder up / down buttons */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveRef(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-[#94A3B8] hover:text-[#172554] disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => moveRef(idx, "down")}
                          disabled={idx === filteredLibraryRefs.length - 1}
                          className="p-1 text-[#94A3B8] hover:text-[#172554] disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Physical A4 Paper Canvas ──────────────────────────────── */}
        <div ref={canvasContainerRef} className="lg:col-span-8 flex flex-col items-center w-full min-w-0">
          {/* Interactive Zoom Controls Bar (Hidden on Print) */}
          <div className="no-print flex items-center justify-between gap-2 w-full max-w-[210mm] mb-3 px-1">
            <div className="flex items-center gap-1.5 bg-white border border-[#E6E9F8] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomMode("fit")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[32px] touch-manipulation ${
                  zoomMode === "fit" ? "bg-[#5B4BDB] text-white" : "text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF]"
                }`}
                title="Fit sheet to screen width"
              >
                Fit Width
              </button>
              <button
                type="button"
                onClick={() => { setZoomMode("100"); setZoomLevel(1); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[32px] touch-manipulation ${
                  zoomMode === "100" ? "bg-[#5B4BDB] text-white" : "text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF]"
                }`}
                title="View physical 100% A4 size"
              >
                100% (A4)
              </button>
              <div className="h-4 w-[1px] bg-[#E2E8F0] mx-0.5" />
              <button
                type="button"
                onClick={() => { setZoomMode("custom"); setZoomLevel((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(1)))); }}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF] cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center touch-manipulation"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-[#5B4BDB]">
                {Math.round(calculatedScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => { setZoomMode("custom"); setZoomLevel((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1)))); }}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF] cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center touch-manipulation"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>
            <span className="text-[11px] text-[#94A3B8] hidden sm:inline">
              True 210mm × 297mm academic canvas
            </span>
          </div>

          {/* Isolated scroll wrapper */}
          <div className="w-full overflow-x-auto overflow-y-visible flex justify-center pb-4 custom-scrollbar">
            <div
              style={{
                width: calculatedScale < 1 && zoomMode === "fit" ? `${794 * calculatedScale}px` : undefined,
                height: calculatedScale < 1 && zoomMode === "fit" ? `${1123 * calculatedScale}px` : undefined,
                transition: "width 0.15s ease, height 0.15s ease",
              }}
            >
              <div
                id="citation-a4-sheet"
                style={{
                  transform: calculatedScale !== 1 ? `scale(${calculatedScale})` : undefined,
                  transformOrigin: "top left",
                  boxSizing: "border-box",
                }}
                className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-[#172554] shadow-md hover:shadow-lg transition-shadow border border-[#E2E8F0] p-8 sm:p-12 md:p-16 rounded-xs flex flex-col justify-between"
              >
                {/* Top Section */}
                <div className="space-y-6">
                  {/* Document Academic Header */}
                  <div className="border-b-2 border-[#172554] pb-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#172554] font-serif">
                        {docTitle || "References & Bibliography"}
                      </h1>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-[#5B4BDB] font-bold bg-[#EEF0FF] px-2.5 py-1 rounded-md border border-[#DDD8FE]">
                        {formatMode === "bibtex" ? "BibTeX" : formatMode === "ris" ? "RIS" : `${style} Standard`}
                      </span>
                    </div>

                    {docSubtitle && (
                      <p className="text-xs sm:text-sm text-[#475569] font-medium italic font-serif">
                        {docSubtitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-[#64748B] pt-1 font-sans">
                      <span>Generated on: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                      <span>Total Citations: {activeSelectedRefs.length}</span>
                    </div>
                  </div>

                  {/* Citations Listing */}
                  {activeSelectedRefs.length === 0 ? (
                    <div className="text-center py-20 space-y-3 font-sans">
                      <Quote size={36} className="mx-auto text-[#CBD5E1]" />
                      <h3 className="text-base font-bold text-[#172554]">No References Selected</h3>
                      <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                        Select references from the left panel or scan a book / upload a paper to format your A4 citation document.
                      </p>
                      <div className="flex justify-center gap-2 pt-2 no-print">
                        <Button onClick={() => navigate("/scan")} variant="outline" size="sm" className="text-xs">
                          Scan Book ISBN
                        </Button>
                        <Button onClick={() => navigate("/upload")} variant="primary" size="sm" className="text-xs">
                          Upload PDF
                        </Button>
                      </div>
                    </div>
                  ) : formatMode === "bibtex" ? (
                    /* BibTeX Code Block View */
                    <div className="space-y-4 font-mono text-xs text-[#1E293B]">
                      {activeSelectedRefs.map((ref, index) => {
                        const bib = generateBibTeX(ref);
                        return (
                          <div key={ref.id} className="relative group bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                            <div className="flex items-center justify-between no-print border-b border-[#E2E8F0] pb-1.5 mb-1.5">
                              <span className="text-[10px] font-bold text-[#5B4BDB]">Entry #{index + 1}</span>
                              <button
                                onClick={() => handleCopySingle(ref, index)}
                                className="text-[11px] text-[#64748B] hover:text-[#5B4BDB] font-sans inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedSingleId === ref.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                {copiedSingleId === ref.id ? "Copied" : "Copy Entry"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap leading-relaxed">{bib}</pre>
                          </div>
                        );
                      })}
                    </div>
                  ) : formatMode === "ris" ? (
                    /* RIS Tagged Format View */
                    <div className="space-y-4 font-mono text-xs text-[#1E293B]">
                      {activeSelectedRefs.map((ref, index) => {
                        const ris = generateRIS(ref);
                        return (
                          <div key={ref.id} className="relative group bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                            <div className="flex items-center justify-between no-print border-b border-[#E2E8F0] pb-1.5 mb-1.5">
                              <span className="text-[10px] font-bold text-[#5B4BDB]">RIS Record #{index + 1}</span>
                              <button
                                onClick={() => handleCopySingle(ref, index)}
                                className="text-[11px] text-[#64748B] hover:text-[#5B4BDB] font-sans inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedSingleId === ref.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                {copiedSingleId === ref.id ? "Copied" : "Copy RIS"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap leading-relaxed">{ris}</pre>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Standard Formatted Citations (IEEE, APA, MLA, Harvard) */
                    <div className="space-y-4 font-serif text-sm leading-relaxed text-[#172554]">
                      {activeSelectedRefs.map((ref, index) => {
                        const html = generateCitationHTML(ref, style);
                        const inText = generateInTextCitation(ref, style, index + 1);

                        return (
                          <div
                            key={ref.id}
                            className="group relative flex items-start gap-3 transition-colors rounded-lg p-1.5 -ml-1.5 hover:bg-[#F8F7FF] no-print:hover:border no-print:hover:border-[#DDD8FE]"
                          >
                            {/* Number badge for IEEE */}
                            {style === "IEEE" && (
                              <span className="font-mono font-bold text-xs text-[#172554] w-7 flex-shrink-0 pt-0.5">
                                [{index + 1}]
                              </span>
                            )}

                            <div className={`flex-1 ${style !== "IEEE" ? "pl-6 -indent-6" : ""}`}>
                              <div
                                className="text-[#172554] font-serif leading-relaxed text-[13.5px]"
                                dangerouslySetInnerHTML={{ __html: html }}
                              />

                              {/* Interactive In-Text chip and single copy on hover */}
                              <div className="no-print mt-1.5 flex items-center gap-3 text-[11px] font-sans text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-[#F1F5F9] px-2 py-0.5 rounded text-[10px] font-mono">
                                  In-text: <strong className="text-[#172554]">{inText}</strong>
                                </span>
                                <button
                                  onClick={() => handleCopySingle(ref, index)}
                                  className="text-[#5B4BDB] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedSingleId === ref.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                  {copiedSingleId === ref.id ? "Copied" : "Copy Citation"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Academic Document Footer */}
                <div className="border-t border-[#E2E8F0] pt-4 mt-12 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#94A3B8] font-sans">
                  <span>RefScan Academic Citation Engine</span>
                  <span>ISO 690 & Standard Bibliographic Formatting</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Manual Reference Addition Modal ─────────────────────────────────── */}
      {showManualModal && (
        <Modal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          title="Add Manual Reference Entry"
        >
          <form onSubmit={handleAddManualReference} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Source Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["BOOK", "PAPER", "WEBSITE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setManualType(t)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      manualType === t
                        ? "bg-[#EEF0FF] text-[#5B4BDB] border-[#5B4BDB]"
                        : "bg-[#F8F7FF] text-[#64748B] border-[#E6E9F8]"
                    }`}
                  >
                    {t === "BOOK" ? "Book" : t === "PAPER" ? "Journal / Paper" : "Website"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">
                {manualType === "WEBSITE" ? "Web Page Title *" : "Title *"}
              </label>
              <input
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Attention Is All You Need"
                className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">
                  {manualType === "WEBSITE" ? "Author / Org" : "Authors (comma separated)"}
                </label>
                <input
                  type="text"
                  value={manualAuthors}
                  onChange={(e) => setManualAuthors(e.target.value)}
                  placeholder="e.g. A. Vaswani, N. Shazeer"
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Publication Year</label>
                <input
                  type="number"
                  value={manualYear}
                  onChange={(e) => setManualYear(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">
                  {manualType === "BOOK"
                    ? "Publisher"
                    : manualType === "PAPER"
                    ? "Journal / Conference"
                    : "Website / Organization Name"}
                </label>
                <input
                  type="text"
                  value={manualVenue}
                  onChange={(e) => setManualVenue(e.target.value)}
                  placeholder={manualType === "BOOK" ? "MIT Press" : manualType === "PAPER" ? "NeurIPS" : "W3C"}
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">
                  {manualType === "BOOK"
                    ? "ISBN (10 or 13)"
                    : manualType === "PAPER"
                    ? "DOI / URL"
                    : "URL (https://...)"}
                </label>
                <input
                  type="text"
                  value={manualIdNum}
                  onChange={(e) => setManualIdNum(e.target.value)}
                  placeholder={manualType === "BOOK" ? "978-0262033848" : "10.1145/..."}
                  className="w-full text-xs font-medium px-3 py-2 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-[#172554] focus:outline-hidden focus:border-[#5B4BDB]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E9F8]">
              <Button type="button" onClick={() => setShowManualModal(false)} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Add & Include in A4 Paper
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
