import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  Edit3, Save, ScanLine, AlertCircle, CheckCircle2, 
  Quote, Search, ExternalLink, Globe, ArrowLeft, ShieldCheck,
  BookOpen, Layers, CheckSquare, Plus
} from "lucide-react";
import { Card, Button, Input, Select, Badge, Textarea, BookCover } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { BookReference, CitationStyle, ExtractedReferenceItem } from "../types";
import { createManualBookEntry } from "../services/bookService";

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { references, addReference, activeBook, setActiveBook, stagedReferences, addStagedReference } = useRefScan();

  const [editing, setEditing] = useState(() => id === "custom" || id === "new");
  const [saved, setSaved] = useState(false);
  const [savedBookId, setSavedBookId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Determine initial book data
  const getInitialBook = (): BookReference | null => {
    if (id === "custom" || id === "new") {
      return createManualBookEntry();
    }
    
    // 1. Check in saved references state
    if (id) {
      const savedRef = references.find((r) => r.id === id && r.type === "BOOK") as BookReference | undefined;
      if (savedRef) return savedRef;

      // 2. Check active scan state
      if (activeBook && activeBook.id === id) return activeBook;

      return null;
    }

    if (activeBook) return activeBook;
    return null;
  };

  const [fields, setFields] = useState<BookReference | null>(getInitialBook);

  // Sync state if id or activeBook changes
  useEffect(() => {
    if (id === "custom" || id === "new") {
      setEditing(true);
      return;
    }
    const book = getInitialBook();
    setFields(book);
    if (book?.saved) {
      setSaved(true);
      setSavedBookId(book.id);
    } else {
      setSaved(false);
      setSavedBookId(null);
    }
  }, [id, activeBook, references]);

  if (!fields) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 text-[var(--text-primary)]">
        <p className="text-base text-[var(--text-secondary)] font-medium">Book reference record not found.</p>
        <div className="flex justify-center gap-3 mt-4">
          <Button onClick={() => navigate("/references")} variant="primary" size="md">
            Back to Library
          </Button>
          <Button onClick={() => navigate("/scan")} variant="outline" size="md">
            Scan Book Barcode
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!fields.title.trim()) {
      setError("Book Title is required.");
      return;
    }

    const authorsArr = Array.isArray(fields.authors) 
      ? fields.authors.filter((a) => Boolean(a.trim()))
      : (fields.authors as string).split(",").map((s) => s.trim()).filter(Boolean);

    if (authorsArr.length === 0) {
      setError("At least one Author name is required.");
      return;
    }

    const bookId = fields.id && fields.id !== "custom" && fields.id !== "new" ? fields.id : ("b_" + Date.now());
    const bookToSave: BookReference = {
      ...fields,
      id: bookId,
      authors: authorsArr,
      year: Number(fields.year) || new Date().getFullYear(),
      pages: fields.pages ? Number(fields.pages) : undefined,
      status: "verified",
      saved: true,
      dateAdded: fields.dateAdded || new Date().toISOString().split("T")[0]
    };

    addReference(bookToSave);
    setActiveBook(bookToSave);
    setFields(bookToSave);
    setSaved(true);
    setSavedBookId(bookToSave.id);
    setError("");
    setEditing(false);
  };

  const handleAddToCollectionAndScanAnother = () => {
    if (!fields.title.trim()) {
      setError("Book Title is required.");
      return;
    }

    const authorsArr = Array.isArray(fields.authors) 
      ? fields.authors.filter((a) => Boolean(a.trim()))
      : (fields.authors as string).split(",").map((s) => s.trim()).filter(Boolean);

    const stagedItem: ExtractedReferenceItem = {
      id: `ref_book_staged_${Date.now()}`,
      title: fields.title,
      authors: authorsArr.length > 0 ? authorsArr : ["Author Unknown"],
      year: Number(fields.year) || new Date().getFullYear(),
      venueOrPublisher: fields.publisher,
      isbn: fields.isbn13 || fields.isbn10,
      referenceType: "Book",
      originalText: `${fields.title} by ${authorsArr.join(", ")} (${fields.year}). ${fields.publisher}. ISBN: ${fields.isbn13 || fields.isbn10 || "N/A"}`,
      sourceDocumentName: "Book Barcode Scanner Session",
      extractionMethod: "Barcode OCR & Open Library Ingestion",
      extractedAt: new Date().toISOString().split("T")[0],
      status: "new",
      selected: true
    };

    addStagedReference(stagedItem);
    setActiveBook(null);
    navigate("/scan");
  };

  const handleFieldChange = (key: keyof BookReference, val: any) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <button
            onClick={() => navigate("/references")}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-2 font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} /> Back to Library
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {editing ? "Edit Book Reference Details" : "Verify Book Details"}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 leading-relaxed">
            Review and adjust bibliographic metadata before logging the citation into your research workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {stagedReferences.length > 0 && (
            <Button onClick={() => navigate("/collection")} variant="outline" size="sm" className="font-semibold text-[var(--primary)]">
              <CheckSquare size={15} className="mr-1 text-[var(--primary)]" /> Collection ({stagedReferences.length})
            </Button>
          )}
          <Button onClick={() => navigate("/scan")} variant="outline" size="sm">
            <ScanLine size={16} className="mr-1" /> Scan Another
          </Button>
          {!editing && !saved && (
            <Button onClick={() => setEditing(true)} variant="secondary" size="sm">
              <Edit3 size={16} className="mr-1" /> Edit Details
            </Button>
          )}
        </div>
      </div>

      {/* Warnings & Notices */}
      {!editing && !saved && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-xs text-amber-950 dark:text-amber-200">
          <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
              Unsaved Reference — Please Cross-Verify Details
            </p>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              Verify publisher, publication year, and authors below. Click <strong className="text-amber-950 dark:text-amber-100 font-semibold">"Confirm Details & Save Reference"</strong> to permanently catalog this book into your Reference Library.
            </p>
          </div>
        </div>
      )}

      {/* Success Confirmation Card */}
      {saved && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-300 shadow-xs text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-900 dark:text-emerald-200">
                Reference saved successfully.
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-0.5">
                <strong className="text-emerald-950 dark:text-emerald-100 font-semibold">"{fields.title}"</strong> is now cataloged in your workspace library and citation generator.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-3 border-t border-emerald-200 dark:border-emerald-800">
            <Button 
              onClick={() => navigate(`/citations?ref=${savedBookId || fields.id}`)} 
              variant="primary" 
              size="sm"
            >
              <Quote size={15} className="mr-1" /> Generate Citation
            </Button>
            <Button 
              onClick={() => navigate("/references")} 
              variant="outline" 
              size="sm"
            >
              <BookOpen size={15} className="mr-1" /> Go to Library
            </Button>
            <Button 
              onClick={() => navigate("/scan")} 
              variant="ghost" 
              size="sm"
            >
              <ScanLine size={15} className="mr-1" /> Continue Scanning
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 shadow-xs text-rose-900 dark:text-rose-200">
          <AlertCircle size={20} className="text-rose-500 dark:text-rose-400 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Book Cover & Quick Actions */}
        <div className="space-y-5">
          <Card className="flex flex-col items-center gap-4 text-center p-6">
            {fields.coverImage ? (
              <div className="w-32 sm:w-36 h-48 sm:h-52 rounded-2xl overflow-hidden shadow-md border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center">
                <img 
                  src={fields.coverImage} 
                  alt={fields.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }} 
                />
              </div>
            ) : (
              <BookCover title={fields.title || "New Book"} color={fields.coverColor || "#6366F1"} size="lg" />
            )}
            
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Retrieval Source</p>
              <Badge variant="info" className="text-xs px-2.5 py-0.5 font-medium">
                <Globe size={13} className="mr-1" /> {fields.source || "Verified Source"}
              </Badge>
            </div>

            <div className="w-full border-t border-[var(--border)] pt-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-[var(--text-secondary)]">Verification</span>
                <Badge variant={fields.status === "verified" ? "success" : "warning"} className="text-[11px] px-2 py-0.5 font-semibold">
                  <ShieldCheck size={13} className="mr-1" /> {fields.status === "verified" ? "Verified ✓" : "Pending Check"}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-[var(--text-secondary)]">ISBN-13</span>
                <span className="font-mono text-[var(--text-primary)] font-semibold">{fields.isbn13 || "Not available"}</span>
              </div>
              {fields.isbn10 && (
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-[var(--text-secondary)]">ISBN-10</span>
                  <span className="font-mono text-[var(--text-primary)] font-semibold">{fields.isbn10}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick citations navigation */}
          {!editing && (
            <Card className="bg-[var(--hero-bg)] border border-[var(--border)] flex flex-col gap-2.5 p-5">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-0.5">
                Citation & Actions
              </p>
              <Button 
                onClick={() => navigate(`/citations?ref=${savedBookId || fields.id}`)} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-sm font-semibold"
              >
                <Quote size={16} className="text-[var(--primary)] mr-1.5" /> Format Citation Style
              </Button>
              <Button 
                onClick={() => navigate(`/sites?q=${encodeURIComponent(fields.title + " " + fields.authors.join(" "))}`)} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-sm font-semibold"
              >
                <Search size={16} className="text-[var(--primary)] mr-1.5" /> Find Related Research
              </Button>
              <a 
                href={`https://www.google.com/search?tbo=p&tbm=bks&q=isbn:${fields.isbn13 || fields.isbn10 || encodeURIComponent(fields.title)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="w-full"
              >
                <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <ExternalLink size={16} className="mr-1.5" /> View on Google Books
                </Button>
              </a>
            </Card>
          )}
        </div>

        {/* Right Column: Info / Edit Form */}
        <div className="lg:col-span-2">
          <Card className="p-6 sm:p-7">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <Input 
                  label="Book Title" 
                  value={fields.title} 
                  onChange={(v) => handleFieldChange("title", v)} 
                  required
                  className="sm:col-span-2" 
                />
                <Input 
                  label="Subtitle (optional)" 
                  value={fields.subtitle || ""} 
                  onChange={(v) => handleFieldChange("subtitle", v)} 
                  className="sm:col-span-2" 
                />
                <Input 
                  label="Author(s) (Comma separated)" 
                  value={Array.isArray(fields.authors) ? fields.authors.join(", ") : fields.authors} 
                  onChange={(v) => handleFieldChange("authors", v)} 
                  required
                  className="sm:col-span-2" 
                />
                <Input 
                  label="Publisher" 
                  value={fields.publisher} 
                  onChange={(v) => handleFieldChange("publisher", v)} 
                />
                <Input 
                  label="Publisher Location (City)" 
                  value={fields.publisherInfo || ""} 
                  onChange={(v) => handleFieldChange("publisherInfo", v)} 
                />
                <Input 
                  label="Publication Year" 
                  value={String(fields.year)} 
                  onChange={(v) => handleFieldChange("year", v)} 
                  type="number" 
                />
                <Input 
                  label="Publication Date" 
                  value={fields.publicationDate || ""} 
                  onChange={(v) => handleFieldChange("publicationDate", v)} 
                  type="text"
                  placeholder="e.g. 2023-05-12 or May 2023"
                />
                <Input 
                  label="Edition" 
                  value={fields.edition || ""} 
                  onChange={(v) => handleFieldChange("edition", v)} 
                  placeholder="e.g. 1st, 2nd, Revised"
                />
                <Input 
                  label="Page Count" 
                  value={fields.pages ? String(fields.pages) : ""} 
                  onChange={(v) => handleFieldChange("pages", v)} 
                  type="number" 
                />
                <Input 
                  label="ISBN-10" 
                  value={fields.isbn10 || ""} 
                  onChange={(v) => handleFieldChange("isbn10", v)} 
                  className="font-mono text-sm" 
                />
                <Input 
                  label="ISBN-13" 
                  value={fields.isbn13 || ""} 
                  onChange={(v) => handleFieldChange("isbn13", v)} 
                  className="font-mono text-sm" 
                />
                <Input 
                  label="Language" 
                  value={fields.language} 
                  onChange={(v) => handleFieldChange("language", v)} 
                />
                <Input 
                  label="Subject Category" 
                  value={fields.category} 
                  onChange={(v) => handleFieldChange("category", v)} 
                />
                <div className="sm:col-span-2">
                  <Textarea 
                    label="Description / Synopsis" 
                    value={fields.description || ""} 
                    onChange={(v) => handleFieldChange("description", v)} 
                    rows={3}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Select 
                    label="Preferred Citation Style"
                    options={[
                      { label: "IEEE Style", value: "IEEE" }, 
                      { label: "APA Style (7th ed.)", value: "APA" }, 
                      { label: "MLA Style (9th ed.)", value: "MLA" }, 
                      { label: "Harvard Reference Style", value: "Harvard" }
                    ]}
                    value={fields.citationStyle}
                    onChange={(v) => handleFieldChange("citationStyle", v as CitationStyle)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Book Title & Synopsis
                  </h3>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug">
                    {fields.title || "Not available"}
                  </p>
                  {fields.subtitle && (
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 italic font-medium">
                      {fields.subtitle}
                    </p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed bg-[var(--surface-soft)] p-4 sm:p-5 rounded-xl border border-[var(--border)]">
                    {fields.description || "No description provided for this catalog entry."}
                  </p>
                </div>

                <div className="border-t border-[var(--border)] pt-5">
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                    Bibliographic Information
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      ["Author(s)", Array.isArray(fields.authors) ? fields.authors.join(", ") : fields.authors],
                      ["Publisher", fields.publisher],
                      ["Publisher Location", fields.publisherInfo],
                      ["Publication Date", fields.publicationDate],
                      ["Publication Year", fields.year],
                      ["Edition", fields.edition],
                      ["Page Count", fields.pages ? `${fields.pages} pages` : undefined],
                      ["Language", fields.language],
                      ["ISBN-10", fields.isbn10],
                      ["ISBN-13", fields.isbn13],
                      ["Subject Category", fields.category]
                    ].map(([k, v]) => (
                      <div key={String(k)} className={String(k) === "Author(s)" ? "sm:col-span-2" : ""}>
                        <dt className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{k}</dt>
                        <dd className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mt-0.5 break-words">
                          {v !== undefined && String(v).trim() !== "" ? String(v) : <span className="text-[var(--text-muted)] font-normal">Not available</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-[var(--border)]">
              {editing ? (
                <>
                  <Button onClick={handleSave} variant="primary" size="md" className="flex-1 font-semibold">
                    <Save size={16} className="mr-1.5" /> Save & Verify Details
                  </Button>
                  <Button onClick={() => { setEditing(false); setFields(getInitialBook()); }} variant="outline" size="md">
                    Cancel
                  </Button>
                </>
              ) : !saved ? (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button onClick={handleSave} variant="primary" size="lg" className="flex-1 font-semibold shadow-xs">
                    <Save size={18} className="mr-1.5" /> Save to Library
                  </Button>
                  <Button onClick={handleAddToCollectionAndScanAnother} variant="secondary" size="lg" className="flex-1 font-semibold">
                    <Plus size={18} className="mr-1.5 text-[var(--primary)]" /> Add to Batch Collection & Scan Another
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setEditing(true)} variant="secondary" size="md" className="w-full font-semibold">
                  <Edit3 size={16} className="mr-1.5" /> Edit Verified Reference
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
