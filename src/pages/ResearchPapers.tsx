import { useState } from "react";
import { useNavigate } from "react-router";
import { FileText, Trash2, Eye, Quote, Lightbulb, Upload } from "lucide-react";
import { Card, Badge, Button, SearchBar, FileDropzone, EmptyState } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference } from "../types";

export default function ResearchPapers() {
  const navigate = useNavigate();
  const { references, deleteReference, uploadAndProcessPaper } = useRefScan();
  const [search, setSearch] = useState("");

  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];

  const filtered = papers.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const matchTitle = p.title ? p.title.toLowerCase().includes(q) : false;
    const matchAuthors = Array.isArray(p.authors) ? p.authors.some((a) => a && a.toLowerCase().includes(q)) : false;
    const matchJournal = p.journal ? p.journal.toLowerCase().includes(q) : false;
    return matchTitle || matchAuthors || matchJournal;
  });

  const handleFile = (f: File) => {
    uploadAndProcessPaper(f).then(() => {
      navigate("/upload");
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Research Papers</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 font-normal">
            {papers.length} research papers cataloged and ready for automated AI analysis
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <FileDropzone onFile={handleFile} label="Drag & drop your research paper PDF here or click to browse" />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={<FileText size={32} />} 
          title="No research papers uploaded yet" 
          description="Upload a research PDF to extract references, structured analysis, methodology, and research gaps." 
          action={
            <Button onClick={() => navigate("/upload")} variant="primary" size="md">
              <Upload size={16} className="mr-1.5" /> Upload PDF Paper
            </Button>
          } 
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((paper) => (
            <PaperCard 
              key={paper.id} 
              paper={paper} 
              onView={() => navigate(`/references/${paper.id}`)} 
              onDelete={() => deleteReference(paper.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper, onView, onDelete }: { paper: PaperReference; onView: () => void; onDelete: () => void }) {
  const navigate = useNavigate();

  return (
    <Card className="p-5 sm:p-6 hover:shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-12 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center flex-shrink-0 text-[var(--primary)] shadow-xs">
          <FileText size={22} />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug hover:text-[var(--primary)] cursor-pointer" onClick={() => navigate(`/analysis/${paper.id}`)}>{paper.title}</p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">{(paper.authors || []).join(", ") || "Unknown Authors"} · {paper.publicationYear || "Recent"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{paper.journal || paper.conference || "Conference Proceedings"}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button 
                onClick={() => navigate(`/analysis/${paper.id}`)} 
                className="p-2 rounded-xl text-[var(--primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer" 
                title="View In-Depth Paper Analysis"
              >
                <FileText size={16} />
              </button>
              <button 
                onClick={onView} 
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer" 
                title="View Bibliographic Reference"
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
                onClick={onDelete} 
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer" 
                title="Delete Paper"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {(paper.keywords || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(paper.keywords || []).slice(0, 5).map((k) => (
                <span key={k} className="text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] px-2.5 py-0.5 rounded-full">
                  {k}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={paper.analysisStatus === "complete" ? "success" : "warning"} className="text-[11px] font-semibold px-2.5 py-0.5">
                {paper.analysisStatus === "complete" ? "Analyzed ✓" : "Processing"}
              </Badge>
              {(paper.researchGaps || []).length > 0 && (
                <Badge variant="warning" className="text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1">
                  <Lightbulb size={12} /> {(paper.researchGaps || []).length} gaps identified
                </Badge>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)]">Added {paper.uploadDate || paper.dateAdded || "Recently"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
