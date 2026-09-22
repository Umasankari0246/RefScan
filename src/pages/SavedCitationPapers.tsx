import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  BookmarkCheck, Quote, Printer, Trash2, Download, Copy,
  Check, FileText, ArrowLeft, ExternalLink, Eye, Plus, Calendar, RefreshCw,
  ZoomIn, ZoomOut
} from "lucide-react";
import { Card, Button, Badge, Modal } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { CitationPaper } from "../types";
import {
  generateBatchBibliography,
  downloadCitationFile,
  generateCitationHTML,
  generateInTextCitation
} from "../services/citationService";
import { exportElementAsPdf } from "../services/pdfExportService";

export default function SavedCitationPapers() {
  const navigate = useNavigate();
  const { citationPapers, deleteCitationPaper } = useRefScan();

  const [activePaper, setActivePaper] = useState<CitationPaper | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modal A4 Canvas Zoom State
  const modalCanvasRef = useRef<HTMLDivElement>(null);
  const [modalZoomMode, setModalZoomMode] = useState<"fit" | "100" | "custom">("fit");
  const [modalZoomLevel, setModalZoomLevel] = useState<number>(1);
  const [modalContainerWidth, setModalContainerWidth] = useState<number>(800);

  useEffect(() => {
    if (!activePaper) return;
    const updateWidth = () => {
      if (modalCanvasRef.current) {
        setModalContainerWidth(modalCanvasRef.current.clientWidth);
      }
    };
    const t = setTimeout(updateWidth, 60);
    window.addEventListener("resize", updateWidth);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateWidth);
    };
  }, [activePaper]);

  const modalScale = useMemo(() => {
    if (modalZoomMode === "100") return 1;
    if (modalZoomMode === "custom") return modalZoomLevel;
    if (modalContainerWidth < 810 && modalContainerWidth > 0) {
      return Math.max(0.35, Math.min(1, (modalContainerWidth - 24) / 794));
    }
    return 1;
  }, [modalZoomMode, modalZoomLevel, modalContainerWidth]);

  // Print helper - prints ONLY the A4 citation paper sheet via @media print CSS
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Export helper
  const handleExportPdf = async (paper: CitationPaper) => {
    const sheetEl = document.getElementById("citation-a4-sheet");
    if (!sheetEl) {
      window.print();
      return;
    }

    try {
      setIsExportingPdf(true);
      const safeTitle = paper.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const filename = `refscan_${safeTitle || "citation_paper"}_${paper.citationStyle.toLowerCase()}.pdf`;
      await exportElementAsPdf(sheetEl, { filename, title: paper.title });
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyFormatted = (paper: CitationPaper) => {
    if (!paper.formattedText) return;
    navigator.clipboard.writeText(paper.formattedText);
    setCopiedId(paper.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (paper: CitationPaper, format: "txt" | "bib" | "ris" | "csv" | "json") => {
    const content = generateBatchBibliography(paper.references, paper.citationStyle, format);
    const ext = format === "bib" ? ".bib" : format === "ris" ? ".ris" : format === "csv" ? ".csv" : format === "json" ? ".json" : ".txt";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `${paper.title.toLowerCase().replace(/\s+/g, "_")}_${paper.citationStyle.toLowerCase()}${ext}`, mime);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E9F8] no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B4BDB]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
              Saved Citation Papers
            </h1>
            <Badge variant="indigo" size="sm">{citationPapers.length} Saved</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Browse, inspect, print, and export your archived A4 academic citation documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/citations")}
            variant="primary"
            size="sm"
            className="text-xs font-semibold shadow-xs"
          >
            <Plus size={14} className="mr-1.5" /> Create New Citation Paper
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {citationPapers.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto space-y-4 bg-white border-[#E6E9F8]">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] text-[#5B4BDB] flex items-center justify-center mx-auto">
            <Quote size={24} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-[#172554]">No Saved Citation Papers Yet</h3>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              Generate an academic citation paper with IEEE, APA, MLA, or Harvard styling and save it to access, print, or export anytime.
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => navigate("/citations")}
              variant="primary"
              size="md"
              className="text-xs font-semibold shadow-xs"
            >
              <Plus size={15} className="mr-1.5" /> Launch Citation Studio
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {citationPapers.map((paper) => {
            const formattedDate = new Date(paper.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <Card
                key={paper.id}
                className="p-5 flex flex-col justify-between space-y-4 bg-white border-[#E6E9F8] hover:border-[#DDD8FE] hover:shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE]">
                      {paper.citationStyle}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] flex items-center gap-1 font-medium">
                      <Calendar size={12} /> {formattedDate}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#172554] line-clamp-1 hover:text-[#5B4BDB] transition-colors cursor-pointer" onClick={() => setActivePaper(paper)}>
                      {paper.title}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {paper.referenceCount} {paper.referenceCount === 1 ? "reference" : "references"} included
                    </p>
                  </div>

                  {/* Snippet box */}
                  <div className="bg-[#F8F7FF] rounded-xl p-3 border border-[#E6E9F8] text-[11px] text-[#475569] font-serif line-clamp-3 leading-relaxed">
                    {paper.formattedText.slice(0, 180)}...
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <Button
                    onClick={() => setActivePaper(paper)}
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold flex-1"
                  >
                    <Eye size={13} className="mr-1" /> View A4 Paper
                  </Button>

                  <Button
                    onClick={() => handleCopyFormatted(paper)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#64748B] hover:text-[#5B4BDB]"
                    title="Copy Formatted Citations"
                  >
                    {copiedId === paper.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </Button>

                  <Button
                    onClick={() => setDeleteTargetId(paper.id)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete Saved Citation Paper"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Full A4 Viewer Modal ────────────────────────────────────────────── */}
      {activePaper && (
        <Modal
          open={!!activePaper}
          isOpen={!!activePaper}
          onClose={() => setActivePaper(null)}
          title={`Saved Document: ${activePaper.title}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            {/* Modal Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E9F8] no-print">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm">{activePaper.citationStyle} Format</Badge>
                <span className="text-xs text-[#64748B] font-medium">{activePaper.referenceCount || activePaper.references?.length || 0} References</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleExportPdf(activePaper)}
                  disabled={isExportingPdf}
                  variant="primary"
                  size="sm"
                  className="bg-[#5B4BDB] hover:bg-[#4938C5] text-white text-xs font-semibold shadow-xs"
                  title="Download this citation paper directly as an A4 PDF"
                >
                  {isExportingPdf ? (
                    <>
                      <RefreshCw size={13} className="mr-1 animate-spin" /> Exporting PDF...
                    </>
                  ) : (
                    <>
                      <Download size={13} className="mr-1" /> Export PDF
                    </>
                  )}
                </Button>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold bg-white hover:bg-[#F8F7FF] text-[#172554] border-[#DDD8FE]"
                  title="Print only this A4 citation paper sheet"
                >
                  <Printer size={13} className="mr-1 text-[#5B4BDB]" /> Print
                </Button>

                <Button
                  onClick={() => handleCopyFormatted(activePaper)}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  {copiedId === activePaper.id ? <Check size={13} className="mr-1 text-emerald-600" /> : <Copy size={13} className="mr-1" />}
                  {copiedId === activePaper.id ? "Copied All" : "Copy Citations"}
                </Button>

                <div className="flex items-center gap-1 border border-[#E6E9F8] rounded-lg p-0.5 bg-[#F8F7FF]">
                  <button
                    onClick={() => handleExportPdf(activePaper)}
                    disabled={isExportingPdf}
                    className="px-2 py-1 text-[11px] font-mono text-[#5B4BDB] hover:bg-white rounded cursor-pointer font-bold"
                    title="Download as PDF (.pdf)"
                  >
                    .PDF
                  </button>
                  <button
                    onClick={() => handleExport(activePaper, "bib")}
                    className="px-2 py-1 text-[11px] font-mono text-[#5B4BDB] hover:bg-white rounded cursor-pointer font-bold"
                    title="Export BibTeX (.bib)"
                  >
                    .BIB
                  </button>
                  <button
                    onClick={() => handleExport(activePaper, "ris")}
                    className="px-2 py-1 text-[11px] font-mono text-[#5B4BDB] hover:bg-white rounded cursor-pointer font-bold"
                    title="Export RIS (.ris)"
                  >
                    .RIS
                  </button>
                  <button
                    onClick={() => handleExport(activePaper, "txt")}
                    className="px-2 py-1 text-[11px] font-mono text-[#5B4BDB] hover:bg-white rounded cursor-pointer font-bold"
                    title="Export TXT (.txt)"
                  >
                    .TXT
                  </button>
                </div>
              </div>
            </div>

            {/* Zoom Controls Toolbar */}
            <div ref={modalCanvasRef} className="w-full flex flex-col items-center">
              <div className="no-print flex items-center justify-between gap-2 w-full max-w-[210mm] mb-3 px-1">
                <div className="flex items-center gap-1.5 bg-white border border-[#E6E9F8] rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setModalZoomMode("fit")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[32px] touch-manipulation ${
                      modalZoomMode === "fit" ? "bg-[#5B4BDB] text-white" : "text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF]"
                    }`}
                    title="Fit to dialog width"
                  >
                    Fit Width
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalZoomMode("100"); setModalZoomLevel(1); }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[32px] touch-manipulation ${
                      modalZoomMode === "100" ? "bg-[#5B4BDB] text-white" : "text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF]"
                    }`}
                    title="Physical 100% A4 size"
                  >
                    100% (A4)
                  </button>
                  <div className="h-4 w-[1px] bg-[#E2E8F0] mx-0.5" />
                  <button
                    type="button"
                    onClick={() => { setModalZoomMode("custom"); setModalZoomLevel((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(1)))); }}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF] cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center touch-manipulation"
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="px-1.5 font-mono text-[11px] font-bold text-[#5B4BDB]">
                    {Math.round(modalScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => { setModalZoomMode("custom"); setModalZoomLevel((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1)))); }}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172554] hover:bg-[#F8F7FF] cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center touch-manipulation"
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
                <span className="text-[11px] text-[#94A3B8] hidden sm:inline">
                  A4 Portrait Preview
                </span>
              </div>

              {/* Rendered A4 Document Sheet inside isolated scroll viewport */}
              <div className="w-full overflow-x-auto overflow-y-visible flex justify-center pb-4 custom-scrollbar">
                <div
                  style={{
                    width: modalScale < 1 && modalZoomMode === "fit" ? `${794 * modalScale}px` : undefined,
                    height: modalScale < 1 && modalZoomMode === "fit" ? `${1123 * modalScale}px` : undefined,
                    transition: "width 0.15s ease, height 0.15s ease",
                  }}
                >
                  <div
                    id="citation-a4-sheet"
                    style={{
                      transform: modalScale !== 1 ? `scale(${modalScale})` : undefined,
                      transformOrigin: "top left",
                      boxSizing: "border-box",
                    }}
                    className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-[#172554] border border-[#E2E8F0] shadow-xs p-8 sm:p-12 rounded-sm space-y-6 flex flex-col justify-between"
                  >
                    {/* Header */}
                    <div className="border-b-2 border-[#172554] pb-4 space-y-2 font-serif">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-[#172554]">
                          {activePaper.title}
                        </h2>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#5B4BDB] font-bold bg-[#EEF0FF] px-2 py-0.5 rounded border border-[#DDD8FE]">
                          {activePaper.citationStyle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] font-sans pt-1">
                        <span>Saved on: {new Date(activePaper.generatedAt || activePaper.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        <span>{activePaper.referenceCount || activePaper.references?.length || 0} Citations</span>
                      </div>
                    </div>

                    {/* References list */}
                    <div className="space-y-4 font-serif text-sm leading-relaxed text-[#172554]">
                      {activePaper.references && activePaper.references.length > 0 ? (
                        activePaper.references.map((ref, idx) => {
                          const html = generateCitationHTML(ref, activePaper.citationStyle);

                          return (
                            <div key={ref.id || idx} className="flex items-start gap-3">
                              {activePaper.citationStyle === "IEEE" && (
                                <span className="font-mono font-bold text-xs text-[#172554] w-6 flex-shrink-0 pt-0.5">
                                  [{idx + 1}]
                                </span>
                              )}
                              <div className={`flex-1 ${activePaper.citationStyle !== "IEEE" ? "pl-6 -indent-6" : ""}`}>
                                <div
                                  className="text-[#172554] font-serif text-[13.5px] leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : activePaper.formattedText ? (
                        <div className="whitespace-pre-line text-[#172554] font-serif text-[13.5px] leading-relaxed">
                          {activePaper.formattedText}
                        </div>
                      ) : (
                        <p className="text-xs text-[#64748B] italic">No reference entries recorded for this document.</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#E2E8F0] pt-4 mt-8 flex items-center justify-between text-[10px] text-[#94A3B8] font-sans">
                      <span>RefScan Academic Archive</span>
                      <span>Verified Bibliographic Records</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <Modal
          open={!!deleteTargetId}
          isOpen={!!deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          title="Delete Saved Citation Paper?"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#64748B]">
              Are you sure you want to delete this saved citation paper? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setDeleteTargetId(null)} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  deleteCitationPaper(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                variant="danger"
                size="sm"
              >
                Delete Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

