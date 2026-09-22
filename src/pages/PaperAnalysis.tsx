import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Lightbulb, FlaskConical, AlertTriangle,
  BookOpen, Target, Quote, Sparkles,
  Bookmark, BookmarkCheck, Database, Award, BarChart3, HelpCircle,
  Search, GitCompare, ExternalLink, ShieldAlert, Layers, CheckSquare,
  FileText, Code, Cpu, ChevronDown, ChevronUp, Copy, Check
} from "lucide-react";
import { Card, Button, Badge, GapBadge, SearchBar } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference, SourceEvidence } from "../types";
import { parseSingleReferenceText, detectDuplicates } from "../services/referenceExtractionService";

function EvidenceBox({ evidence, title = "Source Evidence" }: { evidence?: SourceEvidence; title?: string }) {
  const [open, setOpen] = useState(false);
  if (!evidence || !evidence.quote) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-semibold text-[#5B4BDB] bg-[#EEF0FF] hover:bg-[#E0E7FF] border border-[#DDD8FE] px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <FileText size={12} /> {title}: Page {evidence.pageNumber} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-[#F8F7FF] rounded-xl border border-[#DDD8FE] text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[#5B4BDB] font-bold text-[11px]">
            <span>Exact Extracted Quote (Page {evidence.pageNumber}):</span>
          </div>
          <p className="italic text-[#334155] bg-white p-2.5 rounded-lg border border-[#E6E9F8] font-serif leading-relaxed">
            "{evidence.quote}"
          </p>
          {evidence.interpretation && (
            <p className="text-[#64748B] text-[11px] pt-1 border-t border-[#E6E9F8]">
              <strong className="text-[#172554]">Synthesis:</strong> {evidence.interpretation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0 overflow-hidden bg-white border-[#E6E9F8] transition-all shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-left cursor-pointer hover:bg-[#F8F7FF] active:bg-[#EEF0FF]/50 transition-colors min-h-[48px] touch-manipulation select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          <div className="text-[#5B4BDB] flex-shrink-0">{icon}</div>
          <h2 className="text-xs sm:text-sm font-bold text-[#172554] uppercase tracking-wider truncate">
            {title}
          </h2>
          {badge}
        </div>
        <div className="p-1 rounded-lg text-[#64748B] flex-shrink-0">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-[#F1F5F9] animate-in fade-in duration-150 space-y-3">
          {children}
        </div>
      )}
    </Card>
  );
}

export default function PaperAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { references, updateReference, setStagedReferences } = useRefScan();

  const [refSearch, setRefSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"structured" | "rawPages" | "simplified" | "references">("structured");
  const [selectedRawPage, setSelectedRawPage] = useState<number>(0);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const paper = id
    ? (references.find((r) => r.id === id && r.type === "PAPER") as PaperReference | undefined)
    : undefined;

  if (!paper) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16 text-[#172554] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] text-[#5B4BDB] flex items-center justify-center mx-auto">
          <FileText size={24} />
        </div>
        <h2 className="text-xl font-bold text-[#172554]">Research Paper Analysis Record Not Found</h2>
        <p className="text-sm text-[#64748B] max-w-md mx-auto">
          The requested paper could not be found in your local workspace or MongoDB repository.
        </p>
        <Button onClick={() => navigate("/papers")} variant="primary" size="md" className="mt-2">
          <ArrowLeft size={14} className="mr-1.5" /> Back to Research Papers
        </Button>
      </div>
    );
  }

  const toggleSave = () => {
    const updated = { ...paper, saved: !paper.saved };
    updateReference(updated);
    setToastMsg(updated.saved ? "Paper added to saved bookmarks" : "Paper removed from bookmarks");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const filteredRefs = (paper.references || []).filter((r) =>
    r.toLowerCase().includes(refSearch.toLowerCase())
  );

  const handleCopyRawPage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[#172554] pb-12">
      {/* Back link + Toast */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => navigate("/papers")}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#64748B] hover:text-[#5B4BDB] font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} /> Back to Research Papers
        </button>
        {toastMsg && (
          <span className="text-xs sm:text-sm bg-white border border-[#DDD8FE] text-[#5B4BDB] px-3.5 py-1.5 rounded-xl shadow-xs font-semibold animate-in fade-in">
            {toastMsg}
          </span>
        )}
      </div>

      {/* Meta Header */}
      <Card className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6E9F8] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
          <div className="space-y-2.5 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {paper.keywords?.map((k) => (
                <span
                  key={k}
                  className="text-xs bg-[#EEF0FF] text-[#5B4BDB] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border border-[#DDD8FE]"
                >
                  {k}
                </span>
              ))}
              {paper.isScannedOrImageBased && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">
                  Scanned / Image PDF
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#172554] leading-tight tracking-tight">
              {paper.title}
            </h1>

            <p className="text-sm sm:text-base text-[#64748B] font-medium">
              {paper.authors?.join(", ")} · <span className="font-semibold text-[#172554]">{paper.publicationYear}</span>
            </p>

            {paper.journal && (
              <p className="text-xs sm:text-sm text-[#64748B]">
                {paper.journal}{" "}
                {paper.volume ? `· Vol ${paper.volume}, Issue ${paper.issue || ""}` : ""}{" "}
                {paper.pages ? `· Pages ${paper.pages}` : ""}
              </p>
            )}

            {paper.doi && (
              <p className="text-xs text-[#64748B] font-mono">
                DOI: {paper.doi} {paper.citationCount !== undefined ? `· Citations: ${paper.citationCount}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 w-full lg:w-48 flex-shrink-0 pt-2 lg:pt-0">
            <Button
              onClick={toggleSave}
              variant={paper.saved ? "outline" : "primary"}
              size="sm"
              className="flex-1 lg:w-full text-xs font-semibold"
            >
              {paper.saved ? (
                <>
                  <BookmarkCheck size={15} className="text-emerald-600 mr-1.5" /> Saved Paper
                </>
              ) : (
                <>
                  <Bookmark size={15} className="mr-1.5" /> Bookmark Paper
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/citations?ref=${paper.id}`)}
              variant="secondary"
              size="sm"
              className="flex-1 lg:w-full text-xs font-semibold"
            >
              <Quote size={15} className="mr-1.5" /> Format in A4 Paper
            </Button>
            <Button
              onClick={() => navigate(`/sites?q=${encodeURIComponent(paper.title)}`)}
              variant="outline"
              size="sm"
              className="flex-1 lg:w-full text-xs font-semibold"
            >
              <Search size={15} className="mr-1.5" /> Find Portals
            </Button>
            <Button
              onClick={() => navigate("/compare")}
              variant="ghost"
              size="sm"
              className="flex-1 lg:w-full text-xs font-semibold text-[#64748B] hover:text-[#172554]"
            >
              <GitCompare size={15} className="mr-1.5" /> Compare Papers
            </Button>
          </div>
        </div>
      </Card>

      {/* Scanned / Image-based warning notice */}
      {paper.isScannedOrImageBased && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 shadow-2xs">
          <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950">Scanned or Image-Based PDF Detected</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              This PDF may be scanned or image-based. OCR is required to extract its full content. Text extraction was limited to available embedded textual streams.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 sm:gap-6 border-b border-[#E6E9F8] w-full overflow-x-auto select-none">
        {[
          { id: "structured", label: "Evidence-Based Structured Analysis" },
          { id: "rawPages", label: `Page-by-Page Raw Text (${paper.rawTextByPage?.length || 1})` },
          { id: "simplified", label: "Plain-Language Summary 💡" },
          { id: "references", label: `Cited References (${paper.references?.length || 0})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
              activeTab === t.id
                ? "border-[#5B4BDB] text-[#5B4BDB]"
                : "border-transparent text-[#64748B] hover:text-[#172554]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Evidence-Based Structured Analysis */}
      {activeTab === "structured" && (
        <div className="space-y-4">
          {/* 1. Paper Information */}
          <CollapsibleSection
            title="1. Paper Information & Provenance"
            icon={<FileText size={18} />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-[#64748B] block font-semibold text-[11px] uppercase tracking-wider">Title</span>
                <p className="font-bold text-[#172554] mt-0.5">{paper.title}</p>
              </div>
              <div>
                <span className="text-[#64748B] block font-semibold text-[11px] uppercase tracking-wider">Author(s)</span>
                <p className="text-[#172554] mt-0.5">{paper.authors?.join(", ") || "Unknown Authors"}</p>
              </div>
              <div>
                <span className="text-[#64748B] block font-semibold text-[11px] uppercase tracking-wider">Publication Year</span>
                <p className="text-[#172554] font-semibold mt-0.5">{paper.publicationYear || "Not recorded"}</p>
              </div>
              <div>
                <span className="text-[#64748B] block font-semibold text-[11px] uppercase tracking-wider">Journal / Venue</span>
                <p className="text-[#172554] mt-0.5">{paper.journal || paper.conference || "Academic Conference Proceedings"}</p>
              </div>
              {paper.doi && (
                <div className="sm:col-span-2">
                  <span className="text-[#64748B] block font-semibold text-[11px] uppercase tracking-wider">DOI</span>
                  <p className="font-mono text-[#5B4BDB] mt-0.5 break-all">
                    <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                      {paper.doi} <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* 2. Abstract */}
          <CollapsibleSection
            title="2. Abstract Overview"
            icon={<BookOpen size={18} />}
            defaultOpen={true}
          >
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed bg-[#F8F7FF] p-4 sm:p-5 rounded-2xl border border-[#E6E9F8]">
              {paper.abstract || "Not available in the uploaded paper."}
            </p>
            {paper.evidenceProblem && (
              <EvidenceBox evidence={paper.evidenceProblem} title="Abstract Evidence" />
            )}
          </CollapsibleSection>

          {/* 3. Research Problem */}
          <CollapsibleSection
            title="3. Research Problem"
            icon={<Target size={18} className="text-rose-500" />}
            defaultOpen={true}
          >
            <p className="text-sm sm:text-base text-[#172554] leading-relaxed font-medium">
              {paper.researchProblem || "Not available in the uploaded paper."}
            </p>
            {paper.evidenceProblem && (
              <EvidenceBox evidence={paper.evidenceProblem} title="Problem Evidence" />
            )}
          </CollapsibleSection>

          {/* 4. Research Objectives */}
          <CollapsibleSection
            title="4. Research Objectives"
            icon={<Sparkles size={18} />}
            defaultOpen={true}
          >
            <p className="text-sm sm:text-base text-[#172554] leading-relaxed font-medium">
              {paper.researchObjective || "Not available in the uploaded paper."}
            </p>
            {paper.evidenceObjective && (
              <EvidenceBox evidence={paper.evidenceObjective} title="Objective Evidence" />
            )}
          </CollapsibleSection>

          {/* 5. Existing Method */}
          <CollapsibleSection
            title="5. Existing Baseline / Pipeline"
            icon={<Layers size={18} />}
            defaultOpen={true}
          >
            <p className="text-sm sm:text-base text-[#172554] leading-relaxed font-medium">
              {paper.existingMethod || "Not available in the uploaded paper."}
            </p>
          </CollapsibleSection>

          {/* 6. Proposed Method */}
          <CollapsibleSection
            title="6. Proposed Method & Contribution"
            icon={<FlaskConical size={18} />}
            defaultOpen={true}
          >
            <p className="text-sm sm:text-base text-[#334155] leading-relaxed font-medium">
              {paper.methodology || "Not available in the uploaded paper."}
            </p>
          </CollapsibleSection>

          {/* 7. Methodology */}
          <CollapsibleSection
            title="7. Methodology & Technical Approach"
            icon={<FlaskConical size={18} />}
            defaultOpen={false}
          >
            <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
              {paper.methodology || "Not available in the uploaded paper."}
            </p>
            {paper.evidenceMethodology && (
              <EvidenceBox evidence={paper.evidenceMethodology} title="Methodology Evidence" />
            )}
          </CollapsibleSection>

          {/* 8. Algorithms */}
          <CollapsibleSection
            title="8. Algorithms & Computational Models"
            icon={<Code size={18} className="text-purple-600" />}
            badge={paper.algorithms?.length ? <Badge variant="purple" className="text-[10px] ml-auto">{paper.algorithms.length} models</Badge> : undefined}
            defaultOpen={false}
          >
            {paper.algorithmsWithRoles && paper.algorithmsWithRoles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paper.algorithmsWithRoles.map((alg, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#F8F7FF] border border-[#DDD8FE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#172554]">{alg.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#EEF0FF] text-[#5B4BDB]">
                        Algorithm #{idx + 1}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      <strong className="text-[#172554]">Functional Role:</strong> {alg.role}
                    </p>
                    {alg.sourceEvidence && (
                      <EvidenceBox evidence={alg.sourceEvidence} title="Algorithm Evidence" />
                    )}
                  </div>
                ))}
              </div>
            ) : paper.algorithms && paper.algorithms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {paper.algorithms.map((alg) => (
                  <span key={alg} className="text-xs font-semibold bg-purple-50 text-purple-700 px-3 py-1 rounded-xl border border-purple-200">
                    {alg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">Not available in the uploaded paper.</p>
            )}
          </CollapsibleSection>

          {/* 9. Dataset */}
          <CollapsibleSection
            title="9. Dataset & Benchmarks"
            icon={<Database size={18} className="text-sky-600" />}
            defaultOpen={false}
          >
            {paper.dataset ? (
              <div className="space-y-2 text-xs sm:text-sm">
                <div>
                  <span className="text-[#64748B]">Dataset:</span>
                  <span className="font-semibold text-[#172554] ml-2">{paper.dataset.name || "Custom Dataset"}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Size / Scale:</span>
                  <span className="font-semibold text-[#172554] ml-2">{paper.dataset.size || "Not specified"}</span>
                </div>
                {paper.dataset.features && paper.dataset.features.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[#64748B] block mb-1">Key Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {paper.dataset.features.map((f) => (
                        <span key={f} className="text-[11px] bg-[#F8F7FF] text-[#475569] border border-[#E6E9F8] px-2 py-0.5 rounded-md font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {paper.evidenceDataset && (
                  <EvidenceBox evidence={paper.evidenceDataset} title="Dataset Evidence" />
                )}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">Not available in the uploaded paper.</p>
            )}
          </CollapsibleSection>

          {/* 10. Technologies */}
          <CollapsibleSection
            title="10. Frameworks, Tools & Technologies"
            icon={<Cpu size={18} className="text-indigo-600" />}
            defaultOpen={false}
          >
            {paper.technologies && paper.technologies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {paper.technologies.map((tech) => (
                  <span key={tech} className="text-xs font-semibold bg-[#EEF0FF] text-[#5B4BDB] px-3 py-1 rounded-xl border border-[#DDD8FE]">
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">Not available in the uploaded paper.</p>
            )}
          </CollapsibleSection>

          {/* 11. Results */}
          <CollapsibleSection
            title="11. Results & Key Metrics"
            icon={<Award size={18} className="text-emerald-600" />}
            defaultOpen={false}
          >
            <div className="space-y-3 text-xs sm:text-sm">
              {paper.evaluationMetrics && paper.evaluationMetrics.length > 0 && (
                <div>
                  <span className="text-[#64748B]">Metrics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {paper.evaluationMetrics.map((m) => (
                      <span key={m} className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-[#64748B] font-medium block mb-1">Findings Summary:</span>
                <p className="text-xs sm:text-sm text-[#172554] leading-relaxed font-semibold bg-[#F8F7FF] p-3 rounded-xl border border-[#E6E9F8]">
                  {paper.results || "Not available in the uploaded paper."}
                </p>
              </div>
              {paper.evidenceResults && (
                <EvidenceBox evidence={paper.evidenceResults} title="Results Evidence" />
              )}
            </div>
          </CollapsibleSection>

          {/* 12. Limitations */}
          <CollapsibleSection
            title="12. Stated Limitations"
            icon={<AlertTriangle size={18} className="text-amber-500" />}
            defaultOpen={false}
          >
            {paper.limitations && paper.limitations.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-sm">
                {paper.limitations.map((l, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <p className="text-[#475569] leading-relaxed">{l}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#64748B] italic">Not available in the uploaded paper.</p>
            )}
          </CollapsibleSection>

          {/* 13. Research Gaps */}
          <CollapsibleSection
            title="13. Identified Research Gaps & Opportunities"
            icon={<Sparkles size={18} className="text-[#5B4BDB]" />}
            badge={paper.researchGaps?.length ? <Badge variant="warning" className="text-[10px] ml-auto">{paper.researchGaps.length} gaps</Badge> : undefined}
            defaultOpen={true}
          >
            {paper.researchGaps && paper.researchGaps.length > 0 ? (
              <div className="space-y-4">
                {paper.researchGaps.map((gap) => (
                  <div key={gap.id} className="bg-[#F8F7FF] rounded-2xl p-4 sm:p-5 border border-[#DDD8FE] space-y-2.5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE]">
                            {gap.category || "General Gap"}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-[#172554]">{gap.title}</span>
                        </div>
                        <span className="text-[11px] text-[#64748B] mt-1 block">
                          Confidence: {gap.confidence || "High"} · Source: {gap.isAiGenerated ? "AI Synthesized" : "Author-Stated Limitation"}
                        </span>
                      </div>
                      <GapBadge strength={gap.strength} />
                    </div>

                    <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">{gap.description}</p>

                    {gap.whyIsGap && (
                      <div className="p-3 bg-white border border-[#E6E9F8] rounded-xl text-xs sm:text-sm text-[#334155] leading-relaxed">
                        <strong className="text-[#172554]">Research Context:</strong> {gap.whyIsGap}
                      </div>
                    )}
                    {gap.possibleProjectIdea && (
                      <div className="p-3 bg-indigo-50/80 border border-[#DDD8FE] rounded-xl text-xs sm:text-sm text-indigo-950 font-medium leading-relaxed">
                        <strong className="text-[#5B4BDB]">💡 Project Opportunity:</strong> {gap.possibleProjectIdea}
                      </div>
                    )}
                    {gap.sourceEvidence && (
                      <EvidenceBox evidence={gap.sourceEvidence} title="Gap Evidence Quote" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] italic">No explicit research gaps identified in the uploaded document.</p>
            )}
          </CollapsibleSection>

          {/* 14. Future Scope */}
          <CollapsibleSection
            title="14. Future Scope & Directions"
            icon={<Lightbulb size={18} className="text-[#5B4BDB]" />}
            defaultOpen={false}
          >
            {paper.futureScope && paper.futureScope.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-sm">
                {paper.futureScope.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B4BDB] mt-2 flex-shrink-0" />
                    <p className="text-[#475569] leading-relaxed">{f}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#64748B] italic">Not available in the uploaded paper.</p>
            )}
          </CollapsibleSection>

          {/* 15. Extracted References Summary */}
          <CollapsibleSection
            title="15. Extracted References Summary"
            icon={<Quote size={18} />}
            badge={<Badge variant="default" className="text-[10px] ml-auto">{paper.references?.length || 0} citations</Badge>}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <p className="text-xs text-[#64748B]">
                {paper.references?.length || 0} references were automatically parsed from this paper's bibliography.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => setActiveTab("references")} 
                  variant="primary" 
                  size="sm"
                  className="text-xs font-semibold"
                >
                  View Full References List ({paper.references?.length || 0}) →
                </Button>
              </div>
            </div>
          </CollapsibleSection>

          {/* 16. Source Evidence */}
          <CollapsibleSection
            title="16. Source Evidence & Quotations"
            icon={<ShieldAlert size={18} className="text-emerald-600" />}
            defaultOpen={false}
          >
            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-xs text-[#64748B]">
                All structural analysis statements are grounded in verbatim quotes extracted from the uploaded document pages.
              </p>
              {paper.evidenceProblem && <EvidenceBox evidence={paper.evidenceProblem} title="Problem Statement" />}
              {paper.evidenceObjective && <EvidenceBox evidence={paper.evidenceObjective} title="Objectives" />}
              {paper.evidenceMethodology && <EvidenceBox evidence={paper.evidenceMethodology} title="Methodology" />}
              {paper.evidenceDataset && <EvidenceBox evidence={paper.evidenceDataset} title="Dataset" />}
              {paper.evidenceResults && <EvidenceBox evidence={paper.evidenceResults} title="Results" />}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Tab 2: Page-by-Page Raw Extracted Text */}
      {activeTab === "rawPages" && (
        <Card className="p-5 sm:p-7 bg-white border-[#E6E9F8] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#172554]">
                Page-by-Page Extracted Text Viewer
              </h2>
              <p className="text-xs text-[#64748B]">
                Inspect exact verbatim text parsed from each page of the uploaded PDF with coordinate sorting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleCopyRawPage(paper.rawTextByPage?.[selectedRawPage]?.text || "")}
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
              >
                {copiedRawText ? <Check size={13} className="mr-1 text-emerald-600" /> : <Copy size={13} className="mr-1" />}
                {copiedRawText ? "Page Copied" : "Copy Page Text"}
              </Button>
            </div>
          </div>

          {/* Page pagination selector */}
          {paper.rawTextByPage && paper.rawTextByPage.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {paper.rawTextByPage.map((p, idx) => (
                  <button
                    key={p.pageNumber}
                    onClick={() => setSelectedRawPage(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedRawPage === idx
                        ? "bg-[#5B4BDB] text-white border-[#5B4BDB] shadow-xs"
                        : "bg-[#F8F7FF] text-[#64748B] border-[#E6E9F8] hover:border-[#DDD8FE] hover:text-[#172554]"
                    }`}
                  >
                    Page {p.pageNumber}
                  </button>
                ))}
              </div>

              {/* Raw Page Text Block */}
              <div className="bg-[#F8F7FF] rounded-2xl p-5 border border-[#E6E9F8] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#64748B] border-b border-[#E6E9F8] pb-2">
                  <span className="font-bold text-[#172554]">
                    Page {paper.rawTextByPage[selectedRawPage].pageNumber} of {paper.rawTextByPage.length}
                  </span>
                  <span>{paper.rawTextByPage[selectedRawPage].text.length} characters</span>
                </div>
                <pre className="font-mono text-xs text-[#334155] whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                  {paper.rawTextByPage[selectedRawPage].text || "No text extracted on this page."}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#64748B] italic py-8 text-center">
              No page-by-page raw text stream recorded for this paper.
            </p>
          )}
        </Card>
      )}

      {/* Tab 3: Plain-Language Summary */}
      {activeTab === "simplified" && (
        <Card className="p-5 sm:p-7 bg-white border-[#E6E9F8] space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="w-10 h-10 rounded-xl bg-[#EEF0FF] text-[#5B4BDB] flex items-center justify-center flex-shrink-0">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="font-bold text-[#172554] text-base sm:text-lg">
                Plain-Language Academic Synthesis
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                Accessible overview designed to help you quickly grasp key hypotheses and findings without jargon.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { q: "WHAT IS THIS PAPER ABOUT?", val: paper.simplification?.about },
              { q: "WHY WAS THIS RESEARCH NEEDED?", val: paper.simplification?.whyNeeded },
              { q: "HOW DID THEY SOLVE IT?", val: paper.simplification?.howSolved },
              { q: "WHAT DID THEY ACHIEVE?", val: paper.simplification?.achieved },
              { q: "WHAT IS STILL MISSING?", val: paper.simplification?.missing },
              { q: "WHAT CAN I BUILD FROM THIS?", val: paper.simplification?.buildFromThis },
            ].map(({ q, val }) => (
              <div key={q} className="p-4 sm:p-5 rounded-2xl bg-[#F8F7FF] border border-[#E6E9F8] space-y-1.5">
                <span className="text-[11px] font-bold text-[#5B4BDB] uppercase tracking-wider block">{q}</span>
                <p className="text-sm sm:text-base text-[#172554] leading-relaxed font-medium">
                  {val || "Information synthesized from paper sections."}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Cited References Tab */}
      {activeTab === "references" && (
        <div className="space-y-4">
          {/* Action Banner to open A4 Collection */}
          <div className="bg-[#EEF0FF] border border-[#DDD8FE] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5B4BDB]" />
                <h3 className="font-bold text-[#172554] text-sm sm:text-base">
                  Multiple Reference Collection Available
                </h3>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                RefScan extracted {paper.references?.length || 0} cited references from this document. You can inspect, format, and batch-save them to your library.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => {
                  const parsed = (paper.references || []).map((raw, idx) =>
                    parseSingleReferenceText(raw, idx + 1, `${paper.title}.pdf`, paper.id)
                  );
                  const deduplicated = detectDuplicates(parsed, references);
                  setStagedReferences(deduplicated, `Citations from ${paper.title}`, "pdf");
                  navigate("/collection");
                }}
                variant="primary"
                size="sm"
                className="text-xs font-semibold shadow-xs"
              >
                <Layers size={14} className="mr-1.5" /> Open in Multiple Reference Collection
              </Button>
            </div>
          </div>

          <Card className="p-5 sm:p-7 bg-white border-[#E6E9F8]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <h2 className="font-bold text-[#172554] text-base sm:text-lg">Cited References List</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Academic records cited inside this publication.</p>
              </div>
              <div className="w-full sm:w-64">
                <SearchBar value={refSearch} onChange={setRefSearch} placeholder="Search cited references..." />
              </div>
            </div>

            {filteredRefs.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-8">No matching citations found.</p>
            ) : (
              <ol className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
                {filteredRefs.map((r, i) => (
                  <li key={i} className="flex gap-3 py-3.5 items-start">
                    <span className="text-[#94A3B8] font-mono font-semibold w-8 flex-shrink-0 text-right">[{i + 1}]</span>
                    <div className="flex-1 space-y-1.5 text-[#475569]">
                      <p className="leading-relaxed text-[#172554]">{r}</p>
                      <div className="flex gap-2.5 pt-0.5">
                        <a
                          href={`https://scholar.google.com/scholar?q=${encodeURIComponent(r)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#5B4BDB] hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          Search on Google Scholar <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
