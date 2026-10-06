import { useState } from "react";
import { useNavigate } from "react-router";
import { Bookmark, Eye, Quote, GitCompare, Trash2, FileText } from "lucide-react";
import { Card, Button, SearchBar, EmptyState } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference } from "../types";

export default function SavedPapers() {
  const navigate = useNavigate();
  const { references, updateReference, deleteReference } = useRefScan();
  const [search, setSearch] = useState("");

  const papers = references.filter((r) => r.type === "PAPER" && r.saved !== false) as PaperReference[];

  const filtered = papers.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const titleMatch = p.title?.toLowerCase().includes(q) || false;
    const authorsMatch = (p.authors || []).some((a) => a.toLowerCase().includes(q));
    const journalMatch = p.journal?.toLowerCase().includes(q) || false;
    return titleMatch || authorsMatch || journalMatch;
  });

  const handleRemoveBookmark = (id: string) => {
    const match = references.find((r) => r.id === id);
    if (match) {
      updateReference({ ...match, saved: false });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Saved Papers</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            {papers.length} research papers bookmarked in your workspace for quick reference
          </p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search saved papers by title, topic, or author..." />

      {filtered.length === 0 ? (
        <EmptyState 
          icon={<Bookmark size={32} />} 
          title="No saved papers found" 
          description="Upload research papers or bookmark papers from your Reference Library to access them here." 
          action={<Button onClick={() => navigate("/papers")} variant="primary" size="md">Browse Research Papers</Button>} 
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((paper) => (
            <Card key={paper.id} className="p-5 sm:p-6 hover:shadow-xs transition-all">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-12 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center flex-shrink-0 text-[var(--primary)] shadow-xs">
                  <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug hover:text-[var(--primary)] cursor-pointer" 
                        onClick={() => navigate(`/references/${paper.id}`)}
                      >
                        {paper.title}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">
                        {(paper.authors && paper.authors.length > 0 && !paper.authors[0].includes("not specified") && !paper.authors[0].includes("Not available") ? paper.authors.join(", ") : "Research Contributors")} · {paper.publicationYear || new Date().getFullYear()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button 
                        onClick={() => navigate(`/references/${paper.id}`)} 
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer" 
                        title="View Reference Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/citations?ref=${paper.id}`)} 
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[#5B4BDB] hover:bg-[#EEF0FF] transition-all cursor-pointer" 
                        title="Generate Citations"
                      >
                        <Quote size={16} />
                      </button>
                      <button 
                        onClick={() => navigate("/compare")} 
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-all cursor-pointer" 
                        title="Compare with Others"
                      >
                        <GitCompare size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveBookmark(paper.id)} 
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer" 
                        title="Remove Bookmark"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {(paper.keywords && paper.keywords.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {paper.keywords.slice(0, 4).map((k) => (
                        <span key={k} className="text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] px-2.5 py-0.5 rounded-full">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
