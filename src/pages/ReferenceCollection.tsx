import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  FileText, CheckSquare, Square, Save, Download, Plus, 
  Trash2, Edit3, ExternalLink, RefreshCw, Filter, Search,
  BookOpen, Layers, CheckCircle2, AlertCircle, ArrowLeft,
  Share2, ShieldCheck, Sparkles, ScanLine, Upload
} from "lucide-react";
import { Card, Button, Badge, Modal, Input, Textarea, Select } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { ExtractedReferenceItem, ReferenceTypeCategory, CitationStyle } from "../types";
import { convertExtractedItemToReference } from "../services/referenceExtractionService";
import { generateBatchBibliography, downloadCitationFile } from "../services/citationService";

const CATEGORIES: Array<"All" | ReferenceTypeCategory> = [
  "All",
  "Journal Article",
  "Conference Paper",
  "Book",
  "Book Chapter",
  "Website",
  "Thesis",
  "Report"
];

export default function ReferenceCollection() {
  const navigate = useNavigate();
  const {
    references,
    stagedReferences,
    stagedSessionName,
    stagedSourceType,
    toggleStagedReferenceSelection,
    selectAllStagedReferences,
    updateStagedReference,
    removeStagedReference,
    clearStagedReferences,
    batchSaveSelectedReferences,
    setStagedReferences,
    addStagedReference
  } = useRefScan();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ReferenceTypeCategory>("All");
  const [filterSavedOnly, setFilterSavedOnly] = useState<"all" | "new" | "saved">("all");
  const [expandedRawId, setExpandedRawId] = useState<string | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ExtractedReferenceItem | null>(null);
  
  // Add New Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<{
    title: string;
    authors: string;
    year: string;
    venueOrPublisher: string;
    volume: string;
    issue: string;
    pages: string;
    doi: string;
    url: string;
    referenceType: ReferenceTypeCategory;
  }>({
    title: "",
    authors: "",
    year: String(new Date().getFullYear()),
    venueOrPublisher: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    url: "",
    referenceType: "Journal Article"
  });

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStyle, setExportStyle] = useState<CitationStyle>("IEEE");
  const [exportFormat, setExportFormat] = useState<"bib" | "txt" | "ris" | "json">("bib");

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Filtered references
  const filteredReferences = useMemo(() => {
    return stagedReferences.filter((item) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.authors.some((a) => a.toLowerCase().includes(q)) ||
        item.venueOrPublisher?.toLowerCase().includes(q) ||
        item.doi?.toLowerCase().includes(q);

      // Category
      const matchCategory =
        selectedCategory === "All" || item.referenceType === selectedCategory;

      // Saved filter
      let matchSaved = true;
      if (filterSavedOnly === "new") matchSaved = item.status === "new" || item.status === "incomplete";
      if (filterSavedOnly === "saved") matchSaved = item.status === "already_saved";

      return matchSearch && matchCategory && matchSaved;
    });
  }, [stagedReferences, searchQuery, selectedCategory, filterSavedOnly]);

  const selectedCount = stagedReferences.filter((r) => r.selected).length;
  const alreadySavedCount = stagedReferences.filter((r) => r.status === "already_saved").length;
  const totalCount = stagedReferences.length;

  const handleBatchSave = async () => {
    if (selectedCount === 0) {
      showToast("Please select at least one reference to save.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await batchSaveSelectedReferences();
      showToast(`🎉 Successfully saved ${result.savedCount} references to your library!`);
    } catch (err: any) {
      showToast(err.message || "Failed to batch save references.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSingle = (item: ExtractedReferenceItem) => {
    const singleRef = convertExtractedItemToReference(item);
    updateStagedReference({
      ...item,
      status: "already_saved",
      existingReferenceId: singleRef.id,
      selected: false
    });
    batchSaveSelectedReferences();
    showToast(`Saved "${item.title.slice(0, 35)}..." to your library!`);
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    updateStagedReference(editingItem);
    setEditingItem(null);
    showToast("Reference details updated.");
  };

  const handleAddNewReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    const authorList = newItem.authors
      .split(/[,;&]/)
      .map((a) => a.trim())
      .filter(Boolean);

    const created: ExtractedReferenceItem = {
      id: `ref_manual_${Date.now()}`,
      title: newItem.title.trim(),
      authors: authorList.length > 0 ? authorList : ["Author Unknown"],
      year: parseInt(newItem.year, 10) || new Date().getFullYear(),
      venueOrPublisher: newItem.venueOrPublisher.trim() || undefined,
      volume: newItem.volume.trim() || undefined,
      issue: newItem.issue.trim() || undefined,
      pages: newItem.pages.trim() || undefined,
      doi: newItem.doi.trim() || undefined,
      url: newItem.url.trim() || undefined,
      referenceType: newItem.referenceType,
      originalText: `Manual entry: ${newItem.title} by ${newItem.authors} (${newItem.year})`,
      sourceDocumentName: stagedSessionName || "Manual Collection Batch",
      extractionMethod: "Manual Workspace Entry",
      extractedAt: new Date().toISOString().split("T")[0],
      status: "new",
      selected: true
    };

    addStagedReference(created);
    setIsAddModalOpen(false);
    setNewItem({
      title: "",
      authors: "",
      year: String(new Date().getFullYear()),
      venueOrPublisher: "",
      volume: "",
      issue: "",
      pages: "",
      doi: "",
      url: "",
      referenceType: "Journal Article"
    });
    showToast(`Added "${created.title}" to collection.`);
  };

  const handleExportCollection = () => {
    const refsToExport = stagedReferences.map((item) => convertExtractedItemToReference(item, exportStyle));
    if (refsToExport.length === 0) return;

    const content = generateBatchBibliography(refsToExport, exportStyle, exportFormat);
    const ext = exportFormat === "bib" ? ".bib" : exportFormat === "ris" ? ".ris" : exportFormat === "json" ? ".json" : ".txt";
    const mime = exportFormat === "json" ? "application/json" : "text/plain";
    downloadCitationFile(content, `refscan_collection_${Date.now()}${ext}`, mime);
    setIsExportModalOpen(false);
    showToast("Collection file exported.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-[#172554]">
      {/* ── Page Header & Navigation ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E9F8]">
        <div className="space-y-1">
          <button
            onClick={() => navigate("/papers")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#5B4BDB] mb-1 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} /> Back to Research Workspace
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
              Reference Collection Workspace
            </h1>
            <Badge variant="indigo" className="text-xs px-2.5 py-0.5 font-bold">
              <Layers size={13} className="mr-1 inline" /> A4 Academic Canvas
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Collect, inspect, edit, and batch-save extracted bibliographic citations from your papers and book scans.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 && (
            <>
              <Button
                onClick={() => setIsExportModalOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
              >
                <Download size={14} className="mr-1.5" /> Export Collection
              </Button>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="secondary"
                size="sm"
                className="text-xs font-semibold"
              >
                <Plus size={14} className="mr-1.5" /> Add Citation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Toast Alert ──────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="p-3.5 bg-indigo-50 border border-[#DDD8FE] rounded-xl text-xs sm:text-sm text-[#5B4BDB] font-semibold flex items-center justify-between animate-in fade-in duration-200 shadow-xs">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage("")} className="text-[#64748B] hover:text-[#172554] text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {totalCount === 0 ? (
        <Card className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 bg-white border border-[#E6E9F8] shadow-sm rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE] flex items-center justify-center mx-auto shadow-xs">
            <FileText size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#172554]">No References in Active Collection</h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
              Upload a research PDF to automatically extract its bibliography, scan multiple physical books, or load seminal research papers to test batch saving.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button onClick={() => navigate("/papers")} variant="primary" size="md" className="text-xs font-semibold">
              <Upload size={15} className="mr-1.5" /> Upload Research PDF
            </Button>
            <Button onClick={() => navigate("/scan")} variant="outline" size="md" className="text-xs font-semibold">
              <ScanLine size={15} className="mr-1.5" /> Scan Book ISBN
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} variant="secondary" size="md" className="text-xs font-semibold">
              <Plus size={15} className="mr-1.5 text-[#5B4BDB]" /> Add Reference Manually
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Action & Control Toolbar ──────────────────────────────── */}
          <div className="static sm:sticky sm:top-20 z-10 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#E6E9F8] shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Source metadata info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Batch Session:</span>
                  <span className="text-xs sm:text-sm font-bold text-[#172554] truncate max-w-md">
                    {stagedSessionName}
                  </span>
                  <Badge variant="info" className="text-[10px] uppercase font-bold py-0.5">
                    {stagedSourceType === "pdf" ? "PDF Ingestion" : stagedSourceType === "book_scan" ? "Book Scan Batch" : "Manual Collection"}
                  </Badge>
                </div>
                <p className="text-xs text-[#64748B]">
                  <strong className="text-[#5B4BDB] font-bold">{selectedCount}</strong> of <strong>{totalCount}</strong> selected for saving
                  {alreadySavedCount > 0 && ` · ${alreadySavedCount} already in your library`}
                </p>
              </div>

              {/* Right: Primary Batch Save & Selection Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  onClick={() => selectAllStagedReferences(selectedCount < totalCount)}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial text-xs font-semibold min-h-[44px] touch-manipulation active:scale-95"
                >
                  {selectedCount === totalCount ? (
                    <><Square size={14} className="mr-1.5" /> Deselect All</>
                  ) : (
                    <><CheckSquare size={14} className="mr-1.5 text-[#5B4BDB]" /> Select All ({totalCount})</>
                  )}
                </Button>

                <Button
                  onClick={handleBatchSave}
                  variant="primary"
                  size="sm"
                  disabled={selectedCount === 0 || isSaving}
                  className="flex-1 sm:flex-initial text-xs font-semibold shadow-xs min-h-[44px] touch-manipulation active:scale-95"
                >
                  <Save size={14} className="mr-1.5" />
                  {isSaving ? "Saving..." : `Save (${selectedCount})`}
                </Button>

                <Button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear this collection session?")) {
                      clearStagedReferences();
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-rose-600 hover:bg-rose-50 min-h-[44px] touch-manipulation"
                  title="Clear Session"
                >
                  <Trash2 size={14} className="mr-1" /> Clear
                </Button>
              </div>
            </div>

            {/* Sub-toolbar: Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#F1F3FB] items-center justify-between">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#5B4BDB] text-white shadow-2xs"
                        : "bg-[#F8F7FF] text-[#64748B] hover:text-[#172554] border border-[#E6E9F8]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* In-Collection Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter references..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8F7FF] border border-[#E6E9F8] rounded-xl text-xs text-[#172554] focus:outline-hidden focus:ring-2 focus:ring-[#5B4BDB]/20 focus:border-[#5B4BDB] transition-all"
                />
              </div>
            </div>
          </div>

          {/* ── Centered White A4 Paper Sheet Canvas ───────────────────────── */}
          <div className="relative mx-auto w-full max-w-4xl bg-white border border-[#E6E9F8] rounded-2xl shadow-md p-4 sm:p-10 lg:p-14 min-h-[950px] space-y-6">
            {/* Sheet Watermark Header */}
            <div className="flex items-center justify-between pb-5 border-b-2 border-[#172554]/10 text-xs font-mono text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5B4BDB]" />
                <span className="font-bold tracking-wider text-[#172554] uppercase">RefScan Academic Document</span>
                <span>· Bibliographic Collection</span>
              </div>
              <div>Page 1 of 1 · {new Date().toLocaleDateString()}</div>
            </div>

            {/* Sheet Title */}
            <div className="space-y-1.5 pt-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172554] tracking-tight">
                {stagedSessionName}
              </h2>
              <p className="text-xs text-[#64748B]">
                Bibliography list containing {filteredReferences.length} parsed academic references.
              </p>
            </div>

            {/* References Entries List */}
            {filteredReferences.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-semibold text-[#64748B]">No references match the current filter.</p>
                <Button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} variant="outline" size="sm">
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#E6E9F8] space-y-1">
                {filteredReferences.map((item, index) => {
                  const isSaved = item.status === "already_saved";
                  const isRawExpanded = expandedRawId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`pt-5 pb-5 first:pt-2 transition-all rounded-xl px-2 sm:px-3 -mx-2 sm:-mx-3 ${
                        item.selected ? "bg-[#F8F7FF]/60" : "hover:bg-[#F8F7FF]/30"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3.5">
                        {/* Checkbox with touch-friendly 44px tap target */}
                        <button
                          onClick={() => toggleStagedReferenceSelection(item.id)}
                          className="mt-0.5 flex-shrink-0 text-[#5B4BDB] hover:opacity-80 transition-opacity cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -mt-2 p-2 touch-manipulation"
                          title={item.selected ? "Deselect" : "Select to save"}
                        >
                          {item.selected ? (
                            <CheckSquare size={19} className="text-[#5B4BDB]" />
                          ) : (
                            <Square size={19} className="text-[#CBD5E1] hover:text-[#94A3B8]" />
                          )}
                        </button>

                        {/* Citation Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Index & Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-[#5B4BDB]">
                              [{index + 1}]
                            </span>

                            {/* Reference Type Badge */}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs ${
                                item.referenceType === "Journal Article"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : item.referenceType === "Conference Paper"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : item.referenceType === "Book" || item.referenceType === "Book Chapter"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : item.referenceType === "Website"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.referenceType}
                            </span>

                            {/* Duplicate Status */}
                            {isSaved ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> In Library
                              </span>
                            ) : item.status === "incomplete" ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertCircle size={11} /> Incomplete Info
                              </span>
                            ) : null}
                          </div>

                          {/* Formatted Bibliographic Entry */}
                          <div className="text-xs sm:text-sm leading-relaxed text-[#334155] font-sans">
                            <span className="font-semibold text-[#172554]">
                              {item.authors.join(", ")}
                            </span>{" "}
                            ({item.year}).{" "}
                            <strong className="text-[#172554] font-bold">
                              "{item.title}"
                            </strong>
                            {item.venueOrPublisher && (
                              <span className="italic text-[#475569]">
                                , {item.venueOrPublisher}
                              </span>
                            )}
                            {item.volume && <span>, vol. {item.volume}</span>}
                            {item.issue && <span>, no. {item.issue}</span>}
                            {item.pages && <span>, pp. {item.pages}</span>}
                            .
                          </div>

                          {/* DOI / External URL */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                            {item.doi && (
                              <a
                                href={`https://doi.org/${item.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono text-[#5B4BDB] hover:underline inline-flex items-center gap-1"
                              >
                                doi:{item.doi} <ExternalLink size={11} />
                              </a>
                            )}
                            {item.url && !item.doi && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono text-[#5B4BDB] hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                              >
                                {item.url} <ExternalLink size={11} />
                              </a>
                            )}
                          </div>

                          {/* Collapsible Raw Text Drawer */}
                          {isRawExpanded && (
                            <div className="p-3 bg-[#F8F7FF] rounded-xl border border-[#E6E9F8] text-[11px] font-mono text-[#475569] space-y-1 animate-in fade-in duration-150">
                              <p className="font-bold text-[#172554] uppercase text-[10px] tracking-wider">
                                Original Extracted Citation:
                              </p>
                              <p className="leading-relaxed select-all">{item.originalText}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Quick Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                          <button
                            onClick={() => setExpandedRawId(isRawExpanded ? null : item.id)}
                            className="p-2 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-white transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center touch-manipulation"
                            title={isRawExpanded ? "Hide original text" : "Show original text"}
                          >
                            <FileText size={15} />
                          </button>

                          <button
                            onClick={() => setEditingItem({ ...item })}
                            className="p-2 rounded-lg text-[#64748B] hover:text-[#5B4BDB] hover:bg-white transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center touch-manipulation"
                            title="Edit details"
                          >
                            <Edit3 size={15} />
                          </button>

                          {!isSaved ? (
                            <button
                              onClick={() => handleSaveSingle(item)}
                              className="p-2 rounded-lg text-[#5B4BDB] hover:bg-[#EEF0FF] transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center touch-manipulation"
                              title="Save to Library"
                            >
                              <Save size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/references/${item.existingReferenceId}`)}
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center touch-manipulation"
                              title="View in Library"
                            >
                              <BookOpen size={15} />
                            </button>
                          )}

                          <button
                            onClick={() => removeStagedReference(item.id)}
                            className="p-2 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center touch-manipulation"
                            title="Remove from batch"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sheet Footer */}
            <div className="pt-8 border-t border-[#E6E9F8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-emerald-600" />
                Bibliographic metadata verified with RefScan Academic Parser
              </span>
              <span>RefScan Research Workspace PRO</span>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Metadata Modal ─────────────────────────────────────────────── */}
      {editingItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title="Edit Reference Details"
        >
          <div className="space-y-4 pt-2 text-[#172554]">
            <Input
              label="Article / Book Title"
              value={editingItem.title}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              placeholder="e.g. Attention Is All You Need"
              required
            />

            <Input
              label="Authors (comma-separated)"
              value={editingItem.authors.join(", ")}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  authors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                })
              }
              placeholder="e.g. Ashish Vaswani, Noam Shazeer"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Publication Year"
                type="number"
                value={String(editingItem.year)}
                onChange={(e) => setEditingItem({ ...editingItem, year: parseInt(e.target.value, 10) || 2024 })}
              />

              <Select
                label="Reference Type"
                value={editingItem.referenceType}
                onChange={(val) => setEditingItem({ ...editingItem, referenceType: val as ReferenceTypeCategory })}
                options={CATEGORIES.filter((c) => c !== "All").map((c) => ({ label: c, value: c }))}
              />
            </div>

            <Input
              label="Journal / Conference / Publisher Venue"
              value={editingItem.venueOrPublisher || ""}
              onChange={(e) => setEditingItem({ ...editingItem, venueOrPublisher: e.target.value })}
              placeholder="e.g. NeurIPS 2017 or IEEE Transactions on Pattern Analysis"
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Volume"
                value={editingItem.volume || ""}
                onChange={(e) => setEditingItem({ ...editingItem, volume: e.target.value })}
                placeholder="vol. 33"
              />
              <Input
                label="Issue"
                value={editingItem.issue || ""}
                onChange={(e) => setEditingItem({ ...editingItem, issue: e.target.value })}
                placeholder="no. 4"
              />
              <Input
                label="Pages"
                value={editingItem.pages || ""}
                onChange={(e) => setEditingItem({ ...editingItem, pages: e.target.value })}
                placeholder="pp. 1-12"
              />
            </div>

            <Input
              label="DOI (Digital Object Identifier)"
              value={editingItem.doi || ""}
              onChange={(e) => setEditingItem({ ...editingItem, doi: e.target.value })}
              placeholder="10.1109/..."
            />

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E6E9F8]">
              <Button onClick={() => setEditingItem(null)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button onClick={handleEditSave} variant="primary" size="sm">
                Save Adjustments
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add New Citation Modal ──────────────────────────────────────────── */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Reference to Collection Sheet"
        >
          <form onSubmit={handleAddNewReference} className="space-y-4 pt-2 text-[#172554]">
            <Input
              label="Reference Title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="e.g. Deep Residual Learning for Image Recognition"
              required
            />

            <Input
              label="Authors (comma-separated)"
              value={newItem.authors}
              onChange={(e) => setNewItem({ ...newItem, authors: e.target.value })}
              placeholder="e.g. Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Publication Year"
                type="number"
                value={newItem.year}
                onChange={(e) => setNewItem({ ...newItem, year: e.target.value })}
                required
              />

              <Select
                label="Reference Type"
                value={newItem.referenceType}
                onChange={(val) => setNewItem({ ...newItem, referenceType: val as ReferenceTypeCategory })}
                options={CATEGORIES.filter((c) => c !== "All").map((c) => ({ label: c, value: c }))}
              />
            </div>

            <Input
              label="Journal / Conference / Publisher"
              value={newItem.venueOrPublisher}
              onChange={(e) => setNewItem({ ...newItem, venueOrPublisher: e.target.value })}
              placeholder="e.g. IEEE CVPR 2016"
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Volume"
                value={newItem.volume}
                onChange={(e) => setNewItem({ ...newItem, volume: e.target.value })}
                placeholder="e.g. 12"
              />
              <Input
                label="Issue"
                value={newItem.issue}
                onChange={(e) => setNewItem({ ...newItem, issue: e.target.value })}
                placeholder="e.g. 4"
              />
              <Input
                label="Pages"
                value={newItem.pages}
                onChange={(e) => setNewItem({ ...newItem, pages: e.target.value })}
                placeholder="e.g. 770-778"
              />
            </div>

            <Input
              label="DOI"
              value={newItem.doi}
              onChange={(e) => setNewItem({ ...newItem, doi: e.target.value })}
              placeholder="10.1109/CVPR.2016.90"
            />

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E6E9F8]">
              <Button onClick={() => setIsAddModalOpen(false)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Add to Collection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Export Collection Modal ─────────────────────────────────────────── */}
      {isExportModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsExportModalOpen(false)}
          title="Export Reference Collection"
        >
          <div className="space-y-4 pt-2 text-[#172554]">
            <p className="text-xs text-[#64748B]">
              Export all {stagedReferences.length} references in this session to standard academic citation formats.
            </p>

            <Select
              label="Export File Format"
              value={exportFormat}
              onChange={(val) => setExportFormat(val as any)}
              options={[
                { label: "BibTeX (.bib) — LaTeX / Overleaf compatible", value: "bib" },
                { label: "RIS (.ris) — Zotero, Mendeley & EndNote", value: "ris" },
                { label: "Plain Text (.txt) — Formatted Bibliography", value: "txt" },
                { label: "JSON Data (.json) — Machine readable", value: "json" }
              ]}
            />

            {exportFormat === "txt" && (
              <Select
                label="Citation Style"
                value={exportStyle}
                onChange={(val) => setExportStyle(val as any)}
                options={[
                  { label: "IEEE Style", value: "IEEE" },
                  { label: "APA Style (7th Edition)", value: "APA" },
                  { label: "MLA Style (9th Edition)", value: "MLA" },
                  { label: "Harvard Style", value: "Harvard" }
                ]}
              />
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E6E9F8]">
              <Button onClick={() => setIsExportModalOpen(false)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button onClick={handleExportCollection} variant="primary" size="sm">
                <Download size={14} className="mr-1.5" /> Download Export File
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

