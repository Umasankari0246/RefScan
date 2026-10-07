import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, FileText, Loader2, AlertCircle, Upload } from "lucide-react";
import { Card, Button, FileDropzone } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";

const STAGES = [
  { label: "Uploading", sublabel: "Transferring file to secure workspace…" },
  { label: "Extracting Content", sublabel: "Parsing PDF structure, body text, and references…" },
  { label: "Identifying Research Problem", sublabel: "Locating problem statements and hypotheses…" },
  { label: "Analyzing Methodology", sublabel: "Detecting datasets, algorithms, and evaluation metrics…" },
  { label: "Detecting Limitations & Results", sublabel: "Extracting stated performance gains and limitations…" },
  { label: "Finding Research Gaps", sublabel: "Running logic comparative checks for unexplored domains…" },
  { label: "Preparing Insights Dashboard", sublabel: "Compiling interactive academic breakdown…" }
];

export default function PaperUpload() {
  const navigate = useNavigate();
  const { activePaper, addReference, uploadAndProcessPaper } = useRefScan();
  
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    if (!activePaper) return;

    if (stage < STAGES.length) {
      const t = setTimeout(() => setStage((s) => s + 1), 900);
      return () => clearTimeout(t);
    } else {
      setDone(true);
      if (activePaper && !hasSaved) {
        // Save to global catalog
        addReference({
          ...activePaper,
          analysisStatus: "complete"
        });
        setHasSaved(true);
      }
    }
  }, [stage, activePaper, hasSaved, addReference]);

  const handleSelectFile = (file: File) => {
    setIsProcessingFile(true);
    uploadAndProcessPaper(file).finally(() => {
      setIsProcessingFile(false);
    });
  };

  const pct = Math.round((stage / STAGES.length) * 100);

  if (!activePaper) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-[var(--text-primary)]">
        <div className="pb-4 border-b border-[var(--border)]">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Upload & Analyze Paper</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 font-normal">
            Upload your academic research paper PDF to run deep methodology extraction, dataset analysis, and scientific gap discovery.
          </p>
        </div>

        <Card className="p-6 sm:p-8 space-y-6">
          {isProcessingFile ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="mx-auto text-[var(--primary)] animate-spin" size={36} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Parsing PDF document structure…</p>
              <p className="text-xs text-[var(--text-muted)]">Extracting multi-page text and bibliographic headers</p>
            </div>
          ) : (
            <>
              <FileDropzone onFile={handleSelectFile} label="Drag & drop research paper PDF here or tap to browse" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
                <span>Supports PDF documents up to 50MB</span>
                <Button onClick={() => navigate("/papers")} variant="outline" size="sm">
                  View Cataloged Papers
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div className="pb-4 border-b border-[var(--border)]">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">AI PDF Processing</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
          RefScan is parsing your paper to extract metrics, findings, and research gaps.
        </p>
      </div>

      <Card className="p-5 sm:p-7 space-y-6">
        {/* File card */}
        <div className="flex items-center gap-3.5 p-4 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)]">
          <div className="w-11 h-13 bg-indigo-50 dark:bg-indigo-950/50 text-[var(--primary)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border border-indigo-200 dark:border-indigo-800">
            <FileText size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug line-clamp-2">{activePaper.title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              {activePaper.fileName || "Academic Document.pdf"} · {activePaper.authors?.slice(0, 2).join(", ") || "Academic PDF"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mb-2">
            <span>{done ? "Extraction complete!" : `Analyzing Stage ${Math.min(stage + 1, STAGES.length)} of ${STAGES.length}`}</span>
            <span className="text-[var(--primary)] font-mono">{pct}%</span>
          </div>
          <div className="h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500 shadow-xs" : "bg-[var(--primary)]"}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
        </div>

        {/* Stages items list */}
        <div className="space-y-3.5">
          {STAGES.map((s, i) => {
            const isComplete = i < stage;
            const isCurrent = i === stage && !done;
            return (
              <div 
                key={s.label} 
                className={`flex items-start gap-3 transition-opacity duration-300 ${
                  i > stage ? "opacity-35" : "opacity-100"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isComplete ? (
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-[var(--border)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm sm:text-base font-semibold ${isCurrent ? "text-[var(--primary)]" : isComplete ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.sublabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete action */}
        {done && (
          <div className="pt-4 border-t border-[var(--border)] space-y-3">
            <Button 
              onClick={() => navigate(activePaper ? `/analysis/${activePaper.id}` : "/papers")} 
              variant="primary" 
              size="lg" 
              className="w-full font-semibold shadow-xs text-sm sm:text-base min-h-[48px]"
            >
              🔬 View In-Depth Paper Analysis & Extracted Sections →
            </Button>
            <Button 
              onClick={() => navigate("/collection")} 
              variant="outline" 
              size="lg" 
              className="w-full font-semibold min-h-[44px]"
            >
              📄 View Extracted Reference Collection (A4 Canvas) →
            </Button>
            <Button 
              onClick={() => navigate(activePaper ? `/references/${activePaper.id}` : "/references")} 
              variant="ghost" 
              size="sm" 
              className="w-full font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px]"
            >
              View Bibliographic Record in Library →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
