import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  Camera, Keyboard, Sparkles, CheckCircle2, AlertCircle, 
  ArrowRight, BookOpen, ShieldCheck, Zap, CheckSquare
} from "lucide-react";
import { Card, Button, Input, Badge } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { ScannerView } from "../components/scanner/ScannerView";
import { validateIsbn, cleanIsbnString, formatIsbn } from "../services/isbnService";
import { fetchBookMetadata } from "../services/bookMetadataService";
import { BookReference } from "../types";

const SAMPLE_ISBNS = [
  { label: "Clean Code", isbn: "978-0-13-235088-4", author: "Robert C. Martin" },
  { label: "Intro to Algorithms (CLRS)", isbn: "978-0-262-03384-8", author: "Cormen et al." },
  { label: "Design Patterns (GoF)", isbn: "978-0-201-63361-0", author: "Gamma et al." },
  { label: "Artificial Intelligence: A Modern Approach", isbn: "978-0-13-461099-3", author: "Russell & Norvig" }
];

export default function ScanBook() {
  const navigate = useNavigate();
  const { setActiveBook, stagedReferences } = useRefScan();
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [isbn, setIsbn] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const clean = cleanIsbnString(isbn);
  const validation = isbn ? validateIsbn(clean) : null;

  const handleBookDetected = (book: BookReference) => {
    setActiveBook(book);
    navigate(`/book/${book.id}`);
  };

  const handleManualSearch = async (isbnToSearch: string) => {
    const raw = isbnToSearch || isbn;
    const cleaned = cleanIsbnString(raw);
    const valid = validateIsbn(cleaned);

    if (!valid.isValid) {
      setErrorMsg(valid.errorMessage || "Please enter a valid 10 or 13-digit ISBN.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const book = await fetchBookMetadata(cleaned);
      setActiveBook(book);
      navigate(`/book/${book.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to find book metadata. You can enter details manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              Book Barcode Scanner
            </h1>
            <Badge variant="indigo" className="text-[10.5px] sm:text-xs px-2 py-0.5 font-semibold">
              <Zap size={12} className="mr-1 inline" /> Live WebRTC
            </Badge>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] mt-1 sm:mt-1.5 leading-relaxed">
            Scan physical book barcodes or enter ISBN to automatically pull verified bibliographic records.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 sm:flex bg-[var(--surface-muted)] p-1 rounded-xl sm:rounded-2xl border border-[var(--border)] w-full sm:w-fit flex-shrink-0">
          <button
            onClick={() => { setActiveTab("camera"); setErrorMsg(""); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[44px] touch-manipulation active:scale-[0.98] ${
              activeTab === "camera"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Camera size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
            <span className="truncate">Camera Scanner</span>
          </button>
          <button
            onClick={() => { setActiveTab("manual"); setErrorMsg(""); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[44px] touch-manipulation active:scale-[0.98] ${
              activeTab === "manual"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Keyboard size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
            <span className="truncate">Manual ISBN</span>
          </button>
        </div>
      </div>

      {/* Batch Collection Notification Banner */}
      {stagedReferences.length > 0 && (
        <div className="bg-indigo-50 border border-[#DDD8FE] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#5B4BDB] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
              {stagedReferences.length}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#172554]">
                Batch Reference Collection Active
              </p>
              <p className="text-xs text-[#64748B]">
                You have {stagedReferences.length} items ready to be reviewed, edited, and batch-saved.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/collection")}
            variant="primary"
            size="sm"
            className="text-xs font-semibold shadow-xs"
          >
            <CheckSquare size={14} className="mr-1.5" /> Open Reference Collection ({stagedReferences.length})
          </Button>
        </div>
      )}

      {/* Main Viewport */}
      {activeTab === "camera" ? (
        <div className="space-y-5">
          <ScannerView
            onBookDetected={handleBookDetected}
            onManualInput={() => setActiveTab("manual")}
            onEditManually={() => navigate("/book/custom")}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--text-secondary)] px-1">
            <span className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-600 dark:text-emerald-400" />
              Camera stream is processed locally in real-time
            </span>
            <button
              onClick={() => setActiveTab("manual")}
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium hover:underline cursor-pointer"
            >
              Having camera issues? Enter manually →
            </button>
          </div>
        </div>
      ) : (
        <Card className="space-y-5 sm:space-y-6 p-6 sm:p-7">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              Manual ISBN Bibliographic Search
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Queries Google Books API & Open Library API simultaneously to generate citations.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  label="ISBN-10 or ISBN-13 Code"
                  placeholder="e.g. 978-0-13-235088-4 or 0132350882"
                  value={isbn}
                  onChange={(val) => {
                    setIsbn(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="font-mono text-sm tracking-wide"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={() => handleManualSearch(isbn)}
                  disabled={!isbn.trim() || loading || (validation !== null && !validation.isValid)}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto px-6 font-semibold min-h-[44px]"
                >
                  {loading ? "Searching..." : "Lookup Book"}
                  <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </div>

            {/* Validation Indicator */}
            {isbn && validation && (
              <div className="flex items-center gap-2 pt-1">
                {validation.isValid ? (
                  <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    Valid {validation.type} ({formatIsbn(clean)})
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                    <AlertCircle size={16} className="text-rose-500 dark:text-rose-400" />
                    {validation.errorMessage}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Sample ISBN Chips */}
          <div className="pt-5 border-t border-[var(--border)] space-y-2.5">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Quick Test / Popular Academic Books
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_ISBNS.map((sample) => (
                <button
                  key={sample.isbn}
                  onClick={() => {
                    setIsbn(sample.isbn);
                    handleManualSearch(sample.isbn);
                  }}
                  className="flex items-start gap-3 p-3.5 text-left rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group active:scale-[0.99] touch-manipulation min-h-[44px]"
                >
                  <BookOpen size={18} className="text-[var(--primary)] mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)]">
                      {sample.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {sample.isbn} · {sample.author}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Skip directly to blank form */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center pt-4 border-t border-[var(--border)] text-sm">
            <button
              onClick={() => setActiveTab("camera")}
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-semibold hover:underline cursor-pointer min-h-[44px] flex items-center justify-center sm:justify-start touch-manipulation"
            >
              ← Back to Camera View
            </button>
            <button
              onClick={() => navigate("/book/custom")}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer min-h-[44px] flex items-center justify-center sm:justify-end touch-manipulation"
            >
              Skip Lookup, Fill Form Manually →
            </button>
          </div>
        </Card>
      )}

      {/* Error alert fallback */}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-sm text-rose-900 dark:text-rose-200">
          <AlertCircle size={20} className="text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-800 dark:text-rose-300">Lookup Failed</p>
            <p className="mt-0.5 leading-relaxed text-rose-700 dark:text-rose-400">{errorMsg}</p>
          </div>
          <Button
            onClick={() => navigate("/book/custom")}
            variant="outline"
            size="sm"
            className="text-xs border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
          >
            Create Blank
          </Button>
        </div>
      )}

      {/* Academic Scanning Guidelines */}
      <Card className="bg-[var(--hero-bg)] p-6 sm:p-7 border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3.5">
          <Sparkles size={18} className="text-[var(--primary)]" />
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Academic Scanning Tips
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm text-[var(--text-secondary)]">
          <div className="p-3.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">1. Good Lighting</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Position the barcode within the target box and avoid harsh glare or shadows on the book cover.
            </p>
          </div>
          <div className="p-3.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">2. Dual API Query</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              RefScan combines Google Books and Open Library data to retrieve publisher, edition, and category.
            </p>
          </div>
          <div className="p-3.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">3. Citation Ready</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Verified records can be directly exported into IEEE, APA, MLA, and Harvard formats with 1 click.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
