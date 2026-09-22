import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { 
  List, LayoutGrid, Trash2, BookOpen, 
  Globe, FileText, Plus, Download, Upload, Check, Layers, ShieldCheck
} from "lucide-react";
import { Card, Badge, Button, SearchBar, Select, EmptyState, Modal, Input, Textarea } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { Reference, BookReference, PaperReference, WebsiteReference, CitationStyle } from "../types";
import { generateBatchBibliography, downloadCitationFile } from "../services/citationService";

export default function References() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { references, deleteReference, addReference, stagedReferences } = useRefScan();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "BOOK" | "PAPER" | "WEBSITE">("ALL");
  const [filterStyle, setFilterStyle] = useState("All");
  const [view, setView] = useState<"grid" | "list">("list");
  const [toastMsg, setToastMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual Reference Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manualType, setManualType] = useState<"BOOK" | "PAPER" | "WEBSITE">("BOOK");
  const [manualForm, setManualForm] = useState({
    title: "",
    authors: "",
    publisherOrVenue: "",
    year: String(new Date().getFullYear()),
    identifier: "", // ISBN, DOI, or URL
    pageTitle: "",
    description: "",
    citationStyle: "IEEE" as CitationStyle
  });

  // Open modal if query param is set
  useEffect(() => {
    if (searchParams.get("addWeb") === "true") {
      setManualType("WEBSITE");
      setAddModalOpen(true);
      searchParams.delete("addWeb");
      setSearchParams(searchParams);
    } else if (searchParams.get("addManual") === "true") {
      setAddModalOpen(true);
      searchParams.delete("addManual");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const filtered = references.filter((ref) => {
    const q = search.toLowerCase();
    
    // Search matching
    let matchSearch = false;
    if (ref.type === "BOOK") {
      const b = ref as BookReference;
      matchSearch = !q || b.title.toLowerCase().includes(q) || b.authors.some(a => a.toLowerCase().includes(q)) || b.isbn13?.includes(q) || b.isbn10?.includes(q);
    } else if (ref.type === "PAPER") {
      const p = ref as PaperReference;
      matchSearch = !q || p.title.toLowerCase().includes(q) || p.authors.some(a => a.toLowerCase().includes(q)) || p.doi?.includes(q);
    } else if (ref.type === "WEBSITE") {
      const w = ref as WebsiteReference;
      matchSearch = !q || w.pageTitle.toLowerCase().includes(q) || w.title.toLowerCase().includes(q) || w.url.toLowerCase().includes(q);
    }

    // Type matching
    const matchType = filterType === "ALL" || ref.type === filterType;

    // Style matching
    const matchStyle = filterStyle === "All" || ref.citationStyle === filterStyle;

    return matchSearch && matchType && matchStyle;
  });

  const handleAddManualReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    const authorList = manualForm.authors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const yr = Number(manualForm.year) || new Date().getFullYear();

    let newRef: Reference;

    if (manualType === "BOOK") {
      newRef = {
        id: "b_" + Date.now(),
        type: "BOOK",
        title: manualForm.title.trim(),
        authors: authorList.length > 0 ? authorList : ["Unknown Author"],
        publisher: manualForm.publisherOrVenue.trim() || "Academic Press",
        year: yr,
        isbn13: manualForm.identifier.trim() || undefined,
        language: "English",
        coverColor: "#5B4BDB",
        source: "Manual Entry",
        status: "verified",
        dateAdded: new Date().toISOString().split("T")[0],
        citationStyle: manualForm.citationStyle,
        saved: true
      } as BookReference;
    } else if (manualType === "PAPER") {
      newRef = {
        id: "p_" + Date.now(),
        type: "PAPER",
        title: manualForm.title.trim(),
        authors: authorList.length > 0 ? authorList : ["Unknown Author"],
        publicationYear: yr,
        journal: manualForm.publisherOrVenue.trim() || "Academic Journal / Conference",
        doi: manualForm.identifier.trim() || undefined,
        abstract: manualForm.description.trim() || "Manual paper reference entry.",
        source: "Manual Entry",
        dateAdded: new Date().toISOString().split("T")[0],
        citationStyle: manualForm.citationStyle,
        saved: true
      } as PaperReference;
    } else {
      let domain = "";
      try {
        domain = new URL(manualForm.identifier || "https://example.org").hostname;
      } catch {
        domain = manualForm.identifier || "example.org";
      }

      newRef = {
        id: "w_" + Date.now(),
        type: "WEBSITE",
        title: manualForm.publisherOrVenue.trim() || manualForm.title.trim(),
        pageTitle: manualForm.title.trim(),
        author: authorList[0] || undefined,
        url: manualForm.identifier.trim() || "https://example.org",
        domain,
        description: manualForm.description.trim() || undefined,
        accessDate: new Date().toISOString().split("T")[0],
        dateAdded: new Date().toISOString().split("T")[0],
        citationStyle: manualForm.citationStyle,
        saved: true
      } as WebsiteReference;
    }

    addReference(newRef);
    setAddModalOpen(false);
    setToastMsg(`"${newRef.title}" added to your workspace library!`);
    setTimeout(() => setToastMsg(""), 3500);

    setManualForm({
      title: "",
      authors: "",
      publisherOrVenue: "",
      year: String(new Date().getFullYear()),
      identifier: "",
      pageTitle: "",
      description: "",
      citationStyle: "IEEE"
    });
  };

  const handleExportLibrary = (format: "bib" | "txt" | "ris" | "json" | "csv") => {
    if (references.length === 0) return;
    const content = generateBatchBibliography(references, "IEEE", format);
    const ext = format === "bib" ? ".bib" : format === "ris" ? ".ris" : format === "json" ? ".json" : format === "csv" ? ".csv" : ".txt";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `refscan_workspace_library${ext}`, mime);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          let count = 0;
          parsed.forEach((item: any) => {
            if (item.title && item.type) {
              addReference(item);
              count++;
            }
          });
          setToastMsg(`Successfully restored ${count} references to your library!`);
          setTimeout(() => setToastMsg(""), 4000);
        }
      } catch (err) {
        alert("Failed to parse JSON backup file. Please ensure valid format.");
      }
    };
    reader.readAsText(file);
  };

  const handleTabChange = (tabLabel: string) => {
    if (tabLabel === "All Sources") setFilterType("ALL");
    else if (tabLabel === "Books") setFilterType("BOOK");
    else if (tabLabel === "Papers") setFilterType("PAPER");
    else if (tabLabel === "Websites") setFilterType("WEBSITE");
  };

  const activeTabLabel = filterType === "ALL" ? "All Sources" : filterType === "BOOK" ? "Books" : filterType === "PAPER" ? "Papers" : "Websites";

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Header section with clean buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            Reference Library
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            {references.length} bibliographic references cataloged in your workspace
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJsonFile}
            accept=".json"
            className="hidden"
          />

          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            size="md"
            className="font-semibold text-xs"
            title="Restore from JSON Backup"
          >
            <Upload size={14} className="mr-1.5" /> Import JSON
          </Button>

          <Button 
            onClick={() => handleExportLibrary("bib")} 
            variant="outline" 
            size="md"
            className="font-semibold text-xs"
            title="Export all as BibTeX"
          >
            <Download size={14} className="mr-1.5" /> Export BibTeX
          </Button>

          <Button 
            onClick={() => navigate("/collection")} 
            variant="outline" 
            size="md" 
            className="font-semibold text-xs text-[#5B4BDB] border-[#DDD8FE] bg-[#F8F7FF] hover:bg-[#EEF0FF]"
            title="Open Multiple Reference Collection Workspace"
          >
            <Layers size={14} className="mr-1.5 text-[#5B4BDB]" /> Reference Collection {stagedReferences.length > 0 ? `(${stagedReferences.length})` : ""}
          </Button>

          <Button 
            onClick={() => { setManualType("BOOK"); setAddModalOpen(true); }} 
            variant="outline" 
            size="md" 
            className="font-semibold text-xs text-[var(--primary)] border-[var(--primary-subtle)] hover:bg-[var(--surface-soft)]"
            title="Add a manual reference (Book, Paper, or Website)"
          >
            <Plus size={14} className="mr-1.5 text-[var(--primary)]" /> Add Manual Reference
          </Button>
          <Button onClick={() => navigate("/scan")} variant="primary" size="md" className="font-semibold text-xs">
            <Plus size={14} className="mr-1.5" /> Scan Book
          </Button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 sm:gap-6 border-b border-[var(--border)] w-full overflow-x-auto select-none">
          {["All Sources", "Books", "Papers", "Websites"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer whitespace-nowrap ${
                activeTabLabel === tab
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "Books" ? "Books 📚" : tab === "Papers" ? "Papers 📄" : tab === "Websites" ? "Websites 🌐" : "All Sources"}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between w-full">
          <div className="w-full sm:flex-1 sm:max-w-md">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              placeholder="Search title, author, ISBN, DOI..." 
            />
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex-1 sm:w-48">
              <Select
                options={[
                  { label: "All Citation Styles", value: "All" }, 
                  { label: "IEEE Style", value: "IEEE" }, 
                  { label: "APA Style", value: "APA" }, 
                  { label: "MLA Style", value: "MLA" }, 
                  { label: "Harvard Style", value: "Harvard" }
                ]}
                value={filterStyle}
                onChange={setFilterStyle}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-1 border border-[var(--border)] p-1 rounded-xl bg-[var(--surface-soft)] flex-shrink-0">
              <button 
                onClick={() => setView("list")} 
                className={`p-2.5 rounded-lg transition-colors cursor-pointer touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center ${view === "list" ? "bg-[var(--surface)] text-[var(--primary)] font-semibold shadow-xs border border-[var(--border)]" : "text-[var(--text-muted)] hover:bg-[var(--surface)]"}`}
                title="List view"
                aria-label="List view"
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setView("grid")} 
                className={`p-2.5 rounded-lg transition-colors cursor-pointer touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center ${view === "grid" ? "bg-[var(--surface)] text-[var(--primary)] font-semibold shadow-xs border border-[var(--border)]" : "text-[var(--text-muted)] hover:bg-[var(--surface)]"}`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content items */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={<BookOpen size={28} />} 
          title="No references found" 
          description="Try adjusting your filters, searching other terms, or adding a new manual reference." 
          action={
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={() => navigate("/scan")} variant="primary" size="md">Scan Book</Button>
              <Button onClick={() => { setManualType("BOOK"); setAddModalOpen(true); }} variant="outline" size="md">Add Manual Reference</Button>
            </div>
          } 
        />
      ) : view === "list" ? (
        <div className="space-y-3">
          {filtered.map((ref) => (
            <ReferenceRowCard 
              key={ref.id} 
              refData={ref} 
              onView={() => {
                if (ref.type === "BOOK" || ref.type === "PAPER") navigate(`/references/${ref.id}`);
                else navigate(`/citations?ref=${ref.id}`);
              }} 
              onCite={() => navigate(`/citations?ref=${ref.id}`)} 
              onDelete={() => deleteReference(ref.id)} 
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((ref) => (
            <ReferenceGridCard 
              key={ref.id} 
              refData={ref} 
              onView={() => {
                if (ref.type === "BOOK" || ref.type === "PAPER") navigate(`/references/${ref.id}`);
                else navigate(`/citations?ref=${ref.id}`);
              }} 
              onCite={() => navigate(`/citations?ref=${ref.id}`)} 
              onDelete={() => deleteReference(ref.id)} 
            />
          ))}
        </div>
      )}

      {/* Add Manual Reference Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Reference Manually">
        <form onSubmit={handleAddManualReference} className="space-y-4">
          {/* Reference Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Reference Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setManualType("BOOK")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  manualType === "BOOK"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <BookOpen size={14} /> Book
              </button>
              <button
                type="button"
                onClick={() => setManualType("PAPER")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  manualType === "PAPER"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <FileText size={14} /> Research Paper
              </button>
              <button
                type="button"
                onClick={() => setManualType("WEBSITE")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  manualType === "WEBSITE"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Globe size={14} /> Website / Digital
              </button>
            </div>
          </div>

          {/* Conditional Fields based on Reference Type */}
          {manualType === "BOOK" && (
            <>
              <Input 
                label="Book Title*" 
                placeholder="E.g., Artificial Intelligence: A Modern Approach" 
                value={manualForm.title} 
                onChange={(v) => setManualForm({ ...manualForm, title: v })} 
                required
              />
              <Input 
                label="Authors (comma-separated)" 
                placeholder="E.g., Stuart Russell, Peter Norvig" 
                value={manualForm.authors} 
                onChange={(v) => setManualForm({ ...manualForm, authors: v })} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Publisher" 
                  placeholder="E.g., Pearson, MIT Press" 
                  value={manualForm.publisherOrVenue} 
                  onChange={(v) => setManualForm({ ...manualForm, publisherOrVenue: v })} 
                />
                <Input 
                  label="Publication Year" 
                  type="number"
                  placeholder="E.g., 2020" 
                  value={manualForm.year} 
                  onChange={(v) => setManualForm({ ...manualForm, year: v })} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="ISBN-10 / ISBN-13 (optional)" 
                  placeholder="E.g., 9780134610993" 
                  value={manualForm.identifier} 
                  onChange={(v) => setManualForm({ ...manualForm, identifier: v })} 
                />
                <Select 
                  label="Citation Style"
                  options={[
                    { label: "IEEE Style", value: "IEEE" }, 
                    { label: "APA Style", value: "APA" }, 
                    { label: "MLA Style", value: "MLA" }, 
                    { label: "Harvard Style", value: "Harvard" }
                  ]}
                  value={manualForm.citationStyle}
                  onChange={(v) => setManualForm({ ...manualForm, citationStyle: v as CitationStyle })}
                />
              </div>
              <Textarea 
                label="Notes / Overview (optional)" 
                placeholder="Add edition, chapters, or research notes..." 
                value={manualForm.description} 
                onChange={(v) => setManualForm({ ...manualForm, description: v })} 
                rows={2}
              />
            </>
          )}

          {manualType === "PAPER" && (
            <>
              <Input 
                label="Paper Title*" 
                placeholder="E.g., Attention Is All You Need" 
                value={manualForm.title} 
                onChange={(v) => setManualForm({ ...manualForm, title: v })} 
                required
              />
              <Input 
                label="Authors (comma-separated)" 
                placeholder="E.g., Ashish Vaswani, Noam Shazeer, Niki Parmar" 
                value={manualForm.authors} 
                onChange={(v) => setManualForm({ ...manualForm, authors: v })} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Journal / Conference Venue" 
                  placeholder="E.g., Advances in Neural Information Processing Systems (NeurIPS)" 
                  value={manualForm.publisherOrVenue} 
                  onChange={(v) => setManualForm({ ...manualForm, publisherOrVenue: v })} 
                />
                <Input 
                  label="Publication Year" 
                  type="number"
                  placeholder="E.g., 2017" 
                  value={manualForm.year} 
                  onChange={(v) => setManualForm({ ...manualForm, year: v })} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="DOI / ArXiv ID (optional)" 
                  placeholder="E.g., 10.48550/arXiv.1706.03762" 
                  value={manualForm.identifier} 
                  onChange={(v) => setManualForm({ ...manualForm, identifier: v })} 
                />
                <Select 
                  label="Citation Style"
                  options={[
                    { label: "IEEE Style", value: "IEEE" }, 
                    { label: "APA Style", value: "APA" }, 
                    { label: "MLA Style", value: "MLA" }, 
                    { label: "Harvard Style", value: "Harvard" }
                  ]}
                  value={manualForm.citationStyle}
                  onChange={(v) => setManualForm({ ...manualForm, citationStyle: v as CitationStyle })}
                />
              </div>
              <Textarea 
                label="Abstract / Notes (optional)" 
                placeholder="Brief summary of paper findings or research significance..." 
                value={manualForm.description} 
                onChange={(v) => setManualForm({ ...manualForm, description: v })} 
                rows={2}
              />
            </>
          )}

          {manualType === "WEBSITE" && (
            <>
              <Input 
                label="URL (Digital Source)*" 
                placeholder="https://example.com/research-doc" 
                value={manualForm.identifier} 
                onChange={(v) => setManualForm({ ...manualForm, identifier: v })} 
                type="url"
                required
              />
              <Input 
                label="Page Title (Article/Document Title)*" 
                placeholder="E.g., The Future of Edge AI" 
                value={manualForm.title} 
                onChange={(v) => setManualForm({ ...manualForm, title: v })} 
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Website / Publisher" 
                  placeholder="E.g., TechCrunch, WHO Portal, Nature" 
                  value={manualForm.publisherOrVenue} 
                  onChange={(v) => setManualForm({ ...manualForm, publisherOrVenue: v })} 
                />
                <Input 
                  label="Author / Organization (optional)" 
                  placeholder="E.g., John Doe or World Health Org" 
                  value={manualForm.authors} 
                  onChange={(v) => setManualForm({ ...manualForm, authors: v })} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Publication Year (optional)" 
                  type="number"
                  placeholder="E.g., 2024" 
                  value={manualForm.year} 
                  onChange={(v) => setManualForm({ ...manualForm, year: v })} 
                />
                <Select 
                  label="Citation Style"
                  options={[
                    { label: "IEEE Style", value: "IEEE" }, 
                    { label: "APA Style", value: "APA" }, 
                    { label: "MLA Style", value: "MLA" }, 
                    { label: "Harvard Style", value: "Harvard" }
                  ]}
                  value={manualForm.citationStyle}
                  onChange={(v) => setManualForm({ ...manualForm, citationStyle: v as CitationStyle })}
                />
              </div>
              <Textarea 
                label="Description (optional)" 
                placeholder="Add quick notes or summaries of this webpage source..." 
                value={manualForm.description} 
                onChange={(v) => setManualForm({ ...manualForm, description: v })} 
                rows={2}
              />
            </>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="md" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="md" 
              disabled={!manualForm.title.trim() || (manualType === "WEBSITE" && !manualForm.identifier.trim())}
            >
              Save Reference
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Subcomponent: Reference Row Card
function ReferenceRowCard({ refData, onView, onCite, onDelete }: { refData: Reference; onView: () => void; onCite: () => void; onDelete: () => void }) {
  const getIcon = () => {
    if (refData.type === "BOOK") return <BookOpen size={16} className="text-[var(--text-secondary)]" />;
    if (refData.type === "PAPER") return <FileText size={16} className="text-[var(--text-secondary)]" />;
    return <Globe size={16} className="text-[var(--text-secondary)]" />;
  };

  const getSubLabel = () => {
    if (refData.type === "BOOK") {
      const b = refData as BookReference;
      return `${b.authors.join(", ")} · ${b.publisher} · ${b.year}`;
    }
    if (refData.type === "PAPER") {
      const p = refData as PaperReference;
      return `${p.authors.join(", ")} · ${p.journal || p.conference || "Research"} · ${p.publicationYear}`;
    }
    const w = refData as WebsiteReference;
    return `${w.author || w.organization || "No author"} · ${w.domain} · Accessed ${w.accessDate}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3.5 sm:p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--border-strong)] transition-all">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
          {getIcon()}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate leading-snug hover:text-[var(--primary)] cursor-pointer" onClick={onView}>{refData.title}</p>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">{getSubLabel()}</p>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
            {refData.type === "BOOK" && `ISBN: ${(refData as BookReference).isbn13 || (refData as BookReference).isbn10 || "Not available"}`}
            {refData.type === "PAPER" && `DOI: ${(refData as PaperReference).doi || "Not available"}`}
            {refData.type === "WEBSITE" && `URL: ${(refData as WebsiteReference).url}`}
          </p>
          {refData.sourceDocumentName && (
            <span className="text-[10px] font-mono text-[#5B4BDB] bg-[#EEF0FF] border border-[#DDD8FE] px-2 py-0.5 rounded-full truncate inline-block max-w-xs mt-1">
              From: {refData.sourceDocumentName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 flex-shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">{refData.type}</Badge>
          <Badge variant="default" className="text-[10px] font-semibold tracking-wider">{refData.citationStyle}</Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button onClick={onView} variant="ghost" size="sm" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Details
          </Button>
          <Button onClick={onCite} variant="ghost" size="sm" className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
            Cite
          </Button>
          <button 
            onClick={onDelete} 
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
            title="Delete reference"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Reference Grid Card
function ReferenceGridCard({ refData, onView, onCite, onDelete }: { refData: Reference; onView: () => void; onCite: () => void; onDelete: () => void }) {
  const getIcon = () => {
    if (refData.type === "BOOK") return <BookOpen size={16} className="text-[var(--text-secondary)]" />;
    if (refData.type === "PAPER") return <FileText size={16} className="text-[var(--text-secondary)]" />;
    return <Globe size={16} className="text-[var(--text-secondary)]" />;
  };

  return (
    <Card className="flex flex-col justify-between p-4 sm:p-5 hover:border-[var(--border-strong)] transition-all">
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 hover:text-[var(--primary)] cursor-pointer" onClick={onView}>{refData.title}</h3>
            {refData.type === "BOOK" && (
              <>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 font-medium">{(refData as BookReference).authors[0]}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{(refData as BookReference).publisher} · {(refData as BookReference).year}</p>
              </>
            )}
            {refData.type === "PAPER" && (
              <>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 font-medium">{(refData as PaperReference).authors[0]}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{(refData as PaperReference).journal || "Research Portal"}</p>
              </>
            )}
            {refData.type === "WEBSITE" && (
              <>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 font-medium">{(refData as WebsiteReference).pageTitle}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{(refData as WebsiteReference).domain}</p>
              </>
            )}
          </div>
        </div>

        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mb-2">
          {refData.type === "BOOK" && `ISBN: ${(refData as BookReference).isbn13 || (refData as BookReference).isbn10 || "Not available"}`}
          {refData.type === "PAPER" && `DOI: ${(refData as PaperReference).doi || "Not available"}`}
          {refData.type === "WEBSITE" && `URL: ${(refData as WebsiteReference).url}`}
        </p>

        {refData.sourceDocumentName && (
          <span className="text-[10px] font-mono text-[#5B4BDB] bg-[#EEF0FF] border border-[#DDD8FE] px-2 py-0.5 rounded-full truncate inline-block max-w-full mb-3">
            From: {refData.sourceDocumentName}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-auto">
        <div className="flex gap-1">
          <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider">{refData.type}</Badge>
          <Badge variant="default" className="text-[9px] font-semibold tracking-wider">{refData.citationStyle}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={onView} variant="ghost" size="sm" className="text-xs font-semibold px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Details
          </Button>
          <Button onClick={onCite} variant="ghost" size="sm" className="text-xs font-semibold px-2 py-1 text-[var(--primary)] hover:text-[var(--primary-hover)]">
            Cite
          </Button>
          <button 
            onClick={onDelete} 
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}
