import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  ArrowLeft, BookOpen, Download, RefreshCw, FileText, 
  Globe, ExternalLink, ShieldCheck, Quote, Edit3, Layers,
  Calendar, User, Building, Bookmark
} from "lucide-react";
import { Card, Button, Tabs, CopyBox, Badge, BookCover } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { generateCitationPlainText } from "../services/citationService";
import { Reference, BookReference, PaperReference, WebsiteReference } from "../types";

const STYLES = ["IEEE", "APA", "MLA", "Harvard"];

export default function ReferenceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { references } = useRefScan();
  
  const reference = id ? references.find((r) => r.id === id) : undefined;
  const [activeStyle, setActiveStyle] = useState("IEEE");

  if (!reference) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 text-[#172554]">
        <p className="text-base text-[#64748B] font-medium">Bibliographic reference record not found.</p>
        <Button onClick={() => navigate("/references")} variant="primary" size="md" className="mt-4">
          Back to Reference Library
        </Button>
      </div>
    );
  }

  const isBook = reference.type === "BOOK";
  const isPaper = reference.type === "PAPER";
  const isWeb = reference.type === "WEBSITE";

  const book = isBook ? (reference as BookReference) : null;
  const paper = isPaper ? (reference as PaperReference) : null;
  const web = isWeb ? (reference as WebsiteReference) : null;

  const authors = isBook 
    ? book?.authors 
    : isPaper 
    ? paper?.authors 
    : web?.author ? [web.author] : [];

  const year = isBook ? book?.year : isPaper ? paper?.publicationYear : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[#172554]">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="pb-4 border-b border-[#E6E9F8]">
        <button
          onClick={() => navigate("/references")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#5B4BDB] mb-2 cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} /> Back to Library
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
            Reference Metadata & Citation
          </h1>
          <Badge 
            variant={isBook ? "indigo" : isPaper ? "success" : "info"}
            className="text-xs px-2.5 py-0.5 font-bold uppercase"
          >
            {reference.referenceTypeCategory || reference.type}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Complete academic bibliographic record with provenance tracking and standard citation generation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* ── Left Column: Identity Card ─────────────────────────────────────── */}
        <div className="space-y-5">
          <Card className="flex flex-col items-center gap-4 text-center p-6 bg-white border border-[#E6E9F8] shadow-xs">
            {isBook && book ? (
              book.coverImage ? (
                <div className="w-32 sm:w-36 h-48 sm:h-52 rounded-2xl overflow-hidden shadow-md border border-[#E6E9F8] bg-[#F8F7FF] flex items-center justify-center">
                  <img 
                    src={book.coverImage} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }} 
                  />
                </div>
              ) : (
                <BookCover title={book.title} color={book.coverColor || "#6366F1"} size="lg" />
              )
            ) : isPaper ? (
              <div className="w-24 h-28 rounded-2xl bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE] flex items-center justify-center shadow-xs">
                <FileText size={42} />
              </div>
            ) : (
              <div className="w-24 h-28 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                <Globe size={42} />
              </div>
            )}

            <div className="space-y-1 w-full">
              <h2 className="text-base sm:text-lg font-bold text-[#172554] leading-snug break-words">
                {isWeb && web ? web.pageTitle || web.title : reference.title}
              </h2>
              {authors && authors.length > 0 && (
                <p className="text-xs sm:text-sm text-[#64748B] font-medium">
                  {authors.join(", ")}
                </p>
              )}
              {year && (
                <p className="text-xs font-mono text-[#5B4BDB] font-bold">
                  {year}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#F1F3FB] w-full flex justify-center">
              <Badge variant="indigo" className="text-[11px] px-2.5 py-0.5 font-semibold">
                Cataloged in Library ✓
              </Badge>
            </div>
          </Card>

          {/* Provenance Card */}
          {(reference.sourceDocumentName || reference.originalReferenceText) && (
            <Card className="p-5 bg-[#F8F7FF] border border-[#E6E9F8] rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5B4BDB]">
                <ShieldCheck size={15} /> Source Provenance
              </div>
              <div className="space-y-2 text-xs text-[#475569]">
                {reference.sourceDocumentName && (
                  <div>
                    <span className="font-bold text-[#172554]">Source Document:</span>
                    <p className="font-mono text-[#5B4BDB] mt-0.5 truncate">{reference.sourceDocumentName}</p>
                  </div>
                )}
                {reference.extractionMethod && (
                  <div>
                    <span className="font-bold text-[#172554]">Extraction Method:</span>
                    <p className="mt-0.5">{reference.extractionMethod}</p>
                  </div>
                )}
                {reference.extractedAt && (
                  <div>
                    <span className="font-bold text-[#172554]">Extracted Date:</span>
                    <p className="mt-0.5">{reference.extractedAt}</p>
                  </div>
                )}
                {reference.originalReferenceText && (
                  <div className="pt-2 border-t border-[#E6E9F8]">
                    <span className="font-bold text-[#172554] block mb-1">Raw Extracted Text:</span>
                    <p className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-[#E6E9F8] leading-relaxed select-all">
                      {reference.originalReferenceText}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right Column: Metadata & Citations ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata dl */}
          <Card className="p-5 sm:p-7 space-y-4 bg-white border border-[#E6E9F8]">
            <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Bibliographic Metadata
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Title</dt>
                <dd className="text-sm sm:text-base font-semibold text-[#172554] mt-0.5 break-words">
                  {isWeb && web ? web.pageTitle : reference.title}
                </dd>
              </div>

              {authors && authors.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Author(s)</dt>
                  <dd className="text-sm sm:text-base font-semibold text-[#172554] mt-0.5">
                    {authors.join(", ")}
                  </dd>
                </div>
              )}

              {isBook && book && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Publisher</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{book.publisher}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Publication Year</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{book.year}</dd>
                  </div>
                  {book.isbn13 && (
                    <div>
                      <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">ISBN-13</dt>
                      <dd className="text-sm font-mono text-[#172554] mt-0.5">{book.isbn13}</dd>
                    </div>
                  )}
                  {book.category && (
                    <div>
                      <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Category</dt>
                      <dd className="text-sm font-semibold text-[#172554] mt-0.5">{book.category}</dd>
                    </div>
                  )}
                </>
              )}

              {isPaper && paper && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Publication Year</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{paper.publicationYear}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Journal / Conference</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{paper.journal || paper.conference || paper.publisher || "Academic Press"}</dd>
                  </div>
                  {paper.volume && (
                    <div>
                      <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Volume / Issue</dt>
                      <dd className="text-sm font-semibold text-[#172554] mt-0.5">Vol. {paper.volume} {paper.issue ? `(No. ${paper.issue})` : ""}</dd>
                    </div>
                  )}
                  {paper.pages && (
                    <div>
                      <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Pages</dt>
                      <dd className="text-sm font-semibold text-[#172554] mt-0.5">{paper.pages}</dd>
                    </div>
                  )}
                  {paper.doi && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">DOI</dt>
                      <dd className="text-sm font-mono text-[#5B4BDB] mt-0.5">
                        <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                          {paper.doi} <ExternalLink size={12} />
                        </a>
                      </dd>
                    </div>
                  )}
                </>
              )}

              {isWeb && web && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Website / Domain</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{web.domain || web.title}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Access Date</dt>
                    <dd className="text-sm font-semibold text-[#172554] mt-0.5">{web.accessDate}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">URL</dt>
                    <dd className="text-sm font-mono text-[#5B4BDB] mt-0.5 break-all">
                      <a href={web.url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        {web.url} <ExternalLink size={12} />
                      </a>
                    </dd>
                  </div>
                </>
              )}

              <div>
                <dt className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Date Cataloged</dt>
                <dd className="text-sm text-[#172554] mt-0.5">{reference.dateAdded}</dd>
              </div>
            </dl>
          </Card>

          {/* Citations Card */}
          <Card className="p-5 sm:p-7 space-y-4 bg-white border border-[#E6E9F8]">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Standards-Compliant Citations
              </h2>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#5B4BDB] hover:text-[#4338CA]">
                <RefreshCw size={13} className="mr-1" /> Regenerate
              </Button>
            </div>

            <Tabs tabs={STYLES} active={activeStyle} onChange={setActiveStyle} />

            <div className="mt-3">
              <CopyBox text={generateCitationPlainText(reference, activeStyle as any)} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-[#E6E9F8]">
              {isBook && (
                <Button onClick={() => navigate(`/book/${book?.id}`)} variant="secondary" size="sm" className="w-full sm:w-auto min-h-[44px] touch-manipulation active:scale-95">
                  <BookOpen size={15} className="mr-1.5" /> Edit Full Book Record
                </Button>
              )}
              {isPaper && (
                <Button onClick={() => navigate(`/analysis/${paper?.id}`)} variant="secondary" size="sm" className="w-full sm:w-auto min-h-[44px] touch-manipulation active:scale-95">
                  <FileText size={15} className="mr-1.5 text-[#5B4BDB]" /> View In-Depth Paper Analysis
                </Button>
              )}
              <Button onClick={() => navigate(`/citations?ref=${reference.id}`)} variant="primary" size="sm" className="w-full sm:w-auto text-white font-semibold min-h-[44px] touch-manipulation active:scale-95">
                <Download size={15} className="mr-1.5" /> Open in Citation Studio
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
