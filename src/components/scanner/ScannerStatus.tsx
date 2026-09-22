import React from "react";
import { 
  Camera, CheckCircle2, AlertCircle, 
  Loader2, BookOpen, RefreshCw, Keyboard, Sparkles, Edit3 
} from "lucide-react";
import { Button } from "../ui";
import { BookReference } from "../../types";

export type ScannerLifecycleState =
  | "permission_required"
  | "ready"
  | "scanning"
  | "detected"
  | "validating"
  | "fetching_metadata"
  | "book_found"
  | "invalid_barcode"
  | "book_not_found"
  | "camera_error";

interface ScannerStatusProps {
  state: ScannerLifecycleState;
  detectedIsbn?: string;
  foundBook?: BookReference | null;
  errorMessage?: string;
  onRequestPermission: () => void;
  onRetry: () => void;
  onManualInput: () => void;
  onEditManually?: () => void;
  onConfirmBook: () => void;
}

export function ScannerStatus({
  state,
  detectedIsbn,
  foundBook,
  errorMessage,
  onRequestPermission,
  onRetry,
  onManualInput,
  onEditManually,
  onConfirmBook
}: ScannerStatusProps) {
  // State 1 — Camera Permission Required
  if (state === "permission_required") {
    return (
      <div className="absolute inset-0 bg-[var(--surface)]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-[var(--text-primary)] z-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-[var(--primary)] shadow-xs">
          <Camera size={32} />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">Camera Access Required</h3>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md leading-relaxed">
          Allow camera access to scan physical book barcodes and retrieve verified academic metadata automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-sm">
          <Button onClick={onRequestPermission} variant="primary" size="lg" className="flex-1">
            Allow Camera
          </Button>
          <Button onClick={onManualInput} variant="outline" size="lg" className="flex-1">
            Enter ISBN
          </Button>
        </div>
      </div>
    );
  }

  // State 9 — Camera Error / Access Denied
  if (state === "camera_error") {
    return (
      <div className="absolute inset-0 bg-[var(--surface)]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-[var(--text-primary)] z-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-500 shadow-xs">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Unable to access the camera</h3>
        <p className="text-sm sm:text-base text-rose-600 dark:text-rose-400 max-w-md leading-relaxed">
          {errorMessage || "Unable to access the camera. Check camera permissions and try again."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-sm">
          <Button onClick={onRetry} variant="primary" size="lg" className="flex-1">
            <RefreshCw size={18} className="mr-1.5" /> Try Again
          </Button>
          <Button onClick={onManualInput} variant="outline" size="lg" className="flex-1">
            <Keyboard size={18} className="mr-1.5" /> Manual ISBN
          </Button>
        </div>
      </div>
    );
  }

  // State 4 — Code Detected
  if (state === "detected" || state === "validating") {
    return (
      <div className="absolute inset-x-4 top-4 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 backdrop-blur-md rounded-2xl p-4 text-emerald-950 dark:text-emerald-100 flex items-center gap-3.5 shadow-md z-20 animate-in fade-in duration-200">
        <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Code Detected ✓</p>
          <p className="text-xs sm:text-sm font-mono text-emerald-950 dark:text-emerald-100 truncate font-semibold">{detectedIsbn}</p>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
      </div>
    );
  }

  // State 5 — Fetching Metadata from Google Books + Open Library
  if (state === "fetching_metadata") {
    return (
      <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-[var(--text-primary)] z-20 space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-[var(--primary)] shadow-xs">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Querying Academic Databases...</h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-mono truncate max-w-xs">{detectedIsbn}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Fetching metadata from Google Books & Open Library</p>
        </div>
      </div>
    );
  }

  // State 6 — Book Successfully Found & Verified
  if (state === "book_found" && foundBook) {
    return (
      <div className="absolute inset-4 bg-[var(--surface)]/95 border border-emerald-300 dark:border-emerald-800/60 backdrop-blur-md rounded-2xl p-5 text-[var(--text-primary)] flex flex-col justify-between shadow-xl z-20 animate-in zoom-in-95 duration-200 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm uppercase tracking-wider">
              <Sparkles size={16} /> Reference Verified
            </span>
            <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border)] truncate max-w-[180px]">
              {detectedIsbn || foundBook.isbn13 || foundBook.isbn10}
            </span>
          </div>

          <div className="flex gap-4 items-start">
            <div 
              className="w-16 h-24 rounded-lg flex flex-col justify-between p-2 text-white font-bold text-xs flex-shrink-0 shadow-sm border-l-4 border-white/30"
              style={{ background: `linear-gradient(135deg, ${foundBook.coverColor || "#6366F1"}, ${foundBook.coverColor || "#6366F1"}cc)` }}
            >
              <span className="text-[10px] break-all leading-tight">{foundBook.title.slice(0, 14)}...</span>
              <BookOpen size={14} className="self-end opacity-80" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-bold text-base sm:text-lg text-[var(--text-primary)] leading-snug line-clamp-2">
                {foundBook.title}
              </h4>
              <p className="text-sm text-[var(--text-secondary)] truncate">
                by {foundBook.authors.join(", ")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {foundBook.publisher} ({foundBook.year})
              </p>
              {foundBook.category && (
                <span className="inline-block text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md mt-1 font-semibold">
                  {foundBook.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-3 border-t border-[var(--border)] mt-3">
          <Button onClick={onRetry} variant="outline" size="md" className="flex-1">
            Rescan
          </Button>
          <Button onClick={onConfirmBook} variant="primary" size="md" className="flex-2 font-bold">
            Verify & Save Reference →
          </Button>
        </div>
      </div>
    );
  }

  // State 7 — Unrecognized Code Detected
  if (state === "invalid_barcode") {
    return (
      <div className="absolute inset-4 bg-[var(--surface)]/95 border border-rose-300 dark:border-rose-800/60 backdrop-blur-md rounded-2xl p-5 text-[var(--text-primary)] flex flex-col justify-between shadow-xl z-20 animate-in zoom-in-95 duration-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm uppercase tracking-wider">
            <AlertCircle size={18} /> Code Not Recognized
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {errorMessage || "The detected barcode or QR code could not be resolved."}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Please position the official book barcode or research QR code squarely in view.
          </p>
        </div>
        <div className="flex gap-2.5 pt-3 border-t border-[var(--border)]">
          <Button onClick={onRetry} variant="outline" size="md" className="flex-1">
            Try Again
          </Button>
          <Button onClick={onManualInput} variant="primary" size="md" className="flex-1 bg-rose-600 hover:bg-rose-500">
            Enter Manually
          </Button>
        </div>
      </div>
    );
  }

  // State 8 — Book Not Found in External APIs
  if (state === "book_not_found") {
    return (
      <div className="absolute inset-4 bg-[var(--surface)]/95 border border-amber-300 dark:border-amber-800/60 backdrop-blur-md rounded-2xl p-5 text-[var(--text-primary)] flex flex-col justify-between shadow-xl z-20 animate-in zoom-in-95 duration-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-wider">
            <AlertCircle size={18} /> Metadata Not Found
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Detected code <span className="font-mono font-bold text-[var(--text-primary)]">{detectedIsbn}</span>, but external bibliographic databases did not return a matching record.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            You can create and save this reference by filling in the details manually.
          </p>
        </div>
        <div className="flex gap-2.5 pt-3 border-t border-[var(--border)]">
          <Button onClick={onRetry} variant="outline" size="md" className="flex-1">
            Rescan
          </Button>
          <Button onClick={onEditManually || onManualInput} variant="primary" size="md" className="flex-2 bg-amber-600 hover:bg-amber-500 font-bold text-white border-0">
            <Edit3 size={16} className="mr-1.5" /> Fill Manually
          </Button>
        </div>
      </div>
    );
  }

  // Scanning helper instruction badge at top center
  return (
    <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-10 px-4">
      <div className="bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-md rounded-full px-4 py-1.5 text-xs sm:text-sm text-[var(--text-secondary)] shadow-sm flex items-center gap-2 font-medium">
        <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
        Align book barcode or QR code inside frame
      </div>
    </div>
  );
}
