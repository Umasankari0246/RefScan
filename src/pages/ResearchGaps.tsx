import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { 
  AlertTriangle, Telescope, Wand2, 
  TrendingUp, Info, Download, Plus, Filter, Check
} from "lucide-react";
import { Card, Button, GapBadge, Badge, Modal, Input, Textarea, Select } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference, ResearchGap } from "../types";
import { downloadCitationFile } from "../services/citationService";

export default function ResearchGaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { references, updateReference } = useRefScan();
  
  const paperId = searchParams.get("paper");
  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];
  
  // Find specific paper if ID passed, otherwise check all papers
  const paper = paperId ? papers.find((p) => p.id === paperId) : null;

  // Filter states
  const [strengthFilter, setStrengthFilter] = useState<"ALL" | "strong" | "moderate" | "emerging">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "unexplored" | "improvement" | "novelty" | "limitation">("ALL");

  // Add Custom Gap Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaperForGap, setSelectedPaperForGap] = useState<string>(paperId || (papers[0]?.id || ""));
  const [newGapTitle, setNewGapTitle] = useState("");
  const [newGapDesc, setNewGapDesc] = useState("");
  const [newGapWhy, setNewGapWhy] = useState("");
  const [newGapIdea, setNewGapIdea] = useState("");
  const [newGapStrength, setNewGapStrength] = useState<"strong" | "moderate" | "emerging">("strong");
  const [newGapType, setNewGapType] = useState<"unexplored" | "improvement" | "novelty" | "limitation">("unexplored");
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (!selectedPaperForGap && papers.length > 0) {
      setSelectedPaperForGap(paperId || papers[0].id);
    }
  }, [papers, paperId, selectedPaperForGap]);

  const extractGapsForPaper = (p: PaperReference) => {
    const rawList = p.researchGaps || p.researchGapsList || [];
    return rawList.map((g: any, idx: number) => ({
      ...g,
      id: g.id ? `${p.id}_${g.id}` : `${p.id}_gap_${idx + 1}`,
      strength: (g.strength || (idx === 0 ? "strong" : idx === 1 ? "moderate" : "emerging")) as "strong" | "moderate" | "emerging",
      type: (g.type || (idx === 0 ? "limitation" : idx === 1 ? "unexplored" : "improvement")) as "unexplored" | "improvement" | "novelty" | "limitation",
      paperTitle: p.title,
      paperId: p.id,
    }));
  };

  const allGaps = paper 
    ? extractGapsForPaper(paper)
    : papers.flatMap((p) => extractGapsForPaper(p));

  const filteredGaps = allGaps.filter((g) => {
    const matchStrength = strengthFilter === "ALL" || g.strength === strengthFilter;
    const matchType = typeFilter === "ALL" || g.type === typeFilter;
    return matchStrength && matchType;
  });

  const strong = allGaps.filter((g) => g.strength === "strong");
  const moderate = allGaps.filter((g) => g.strength === "moderate");
  const emerging = allGaps.filter((g) => g.strength === "emerging");

  const getPaperLimitations = (p: PaperReference): string[] => {
    const raw = (Array.isArray(p.limitations) && p.limitations.length > 0)
      ? p.limitations
      : (Array.isArray(p.limitationsList) ? p.limitationsList : []);
    return raw.map((l: any) => (typeof l === "string" ? l : l?.text || "")).filter(Boolean);
  };

  const getPaperFutureScope = (p: PaperReference): string[] => {
    const base = (Array.isArray(p.futureScope) && p.futureScope.length > 0)
      ? p.futureScope
      : (Array.isArray(p.futureScopeList) ? p.futureScopeList : []);
    return base
      .concat((p as any).aiFutureScope || [])
      .map((f: any) => (typeof f === "string" ? f : f?.text || ""))
      .filter(Boolean);
  };

  const allLimitations = paper 
    ? getPaperLimitations(paper) 
    : papers.flatMap((p) => getPaperLimitations(p));
    
  const allFutureScope = paper 
    ? getPaperFutureScope(paper)
    : papers.flatMap((p) => getPaperFutureScope(p));

  const handleExportGapsReport = () => {
    if (allGaps.length === 0) return;

    let md = `# RefScan - Research Gaps & Novel Opportunities Report\n`;
    md += `Generated: ${new Date().toLocaleDateString()} | Total Cataloged Gaps: ${allGaps.length}\n\n`;
    md += `## 1. Summary Metrics\n`;
    md += `- Critical / Strong Gaps: ${strong.length}\n`;
    md += `- Moderate Gaps: ${moderate.length}\n`;
    md += `- Emerging Directions: ${emerging.length}\n\n`;
    md += `## 2. Identified Research Opportunities\n\n`;

    allGaps.forEach((g, idx) => {
      md += `### ${idx + 1}. ${g.title} [${(g.strength || "strong").toUpperCase()} / ${(g.type || "unexplored").toUpperCase()}]\n`;
      md += `- **Source Paper:** ${g.paperTitle}\n`;
      md += `- **Description:** ${g.description}\n`;
      if (g.whyIsGap) md += `- **Why this is a Gap:** ${g.whyIsGap}\n`;
      if (g.possibleProjectIdea) md += `- **Proposed Project Direction:** ${g.possibleProjectIdea}\n`;
      md += `\n`;
    });

    md += `## 3. Literature Stated Limitations\n`;
    allLimitations.slice(0, 10).forEach(l => md += `- ${l}\n`);

    downloadCitationFile(md, `refscan_research_gaps_report.md`, "text/markdown");
  };

  const handleCreateCustomGap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGapTitle.trim() || !newGapDesc.trim() || !selectedPaperForGap) return;

    const targetPaper = papers.find(p => p.id === selectedPaperForGap);
    if (!targetPaper) return;

    const createdGap: ResearchGap = {
      id: "custom_gap_" + Date.now(),
      title: newGapTitle.trim(),
      description: newGapDesc.trim(),
      whyIsGap: newGapWhy.trim() || undefined,
      possibleProjectIdea: newGapIdea.trim() || undefined,
      strength: newGapStrength,
      type: newGapType,
      isAiGenerated: false
    };

    const existingGaps = targetPaper.researchGaps || targetPaper.researchGapsList || [];
    const nextGaps = [createdGap, ...existingGaps];

    const updatedPaper: PaperReference = {
      ...targetPaper,
      researchGaps: nextGaps,
      researchGapsList: nextGaps,
    };

    await updateReference(updatedPaper);
    setModalOpen(false);
    setNewGapTitle("");
    setNewGapDesc("");
    setNewGapWhy("");
    setNewGapIdea("");
    setToastMsg(`Research gap "${createdGap.title.slice(0, 24)}..." added!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            Research Gap Discovery
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            {paper ? `Gaps identified in "${paper.title}"` : `Aggregated research gaps found across ${papers.length} papers`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {paper && (
            <Button onClick={() => navigate("/gaps")} variant="ghost" size="md">
              View All Gaps
            </Button>
          )}
          <Button onClick={handleExportGapsReport} variant="outline" size="md" className="font-semibold text-xs">
            <Download size={14} className="mr-1.5" /> Export Report (.md)
          </Button>
          <Button onClick={() => setModalOpen(true)} variant="primary" size="md" className="font-semibold text-xs">
            <Plus size={14} className="mr-1.5" /> Add Research Gap
          </Button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Academic Disclaimer */}
      <div className="flex items-start gap-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 sm:p-5 shadow-xs text-sky-950 dark:text-sky-200">
        <Info size={20} className="text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
          <strong className="text-sky-900 dark:text-sky-200">Academic Disclaimer:</strong> RefScan uses comparative cross-model algorithms to flag limitations and gaps. 
          Please perform a comprehensive literature survey to verify if a direction is truly a novel research contribution before finalizing your dissertation or project proposal.
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Critical Gaps", count: strong.length, color: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300", dot: "bg-rose-500", key: "strong" as const },
          { label: "Moderate Gaps", count: moderate.length, color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300", dot: "bg-amber-500", key: "moderate" as const },
          { label: "Emerging Areas", count: emerging.length, color: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300", dot: "bg-[var(--primary)]", key: "emerging" as const },
        ].map(({ label, count, color, dot, key }) => (
          <div 
            key={label} 
            onClick={() => setStrengthFilter(strengthFilter === key ? "ALL" : key)}
            className={`rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${color} ${
              strengthFilter === key ? "ring-2 ring-indigo-500 shadow-xs" : ""
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-3 h-3 rounded-full ${dot} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-bold leading-none text-[var(--text-primary)]">{count}</p>
                <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-[var(--text-secondary)]">{label}</p>
              </div>
            </div>
            <span className="text-xs font-semibold underline text-[var(--text-muted)]">
              {strengthFilter === key ? "Filtered ✓" : "Filter"}
            </span>
          </div>
        ))}
      </div>

      {/* Filter Control Bar */}
      <Card className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--primary)]" />
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Filters:</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-36">
            <Select
              options={[
                { label: "All Strengths", value: "ALL" },
                { label: "Critical Gaps", value: "strong" },
                { label: "Moderate Gaps", value: "moderate" },
                { label: "Emerging Gaps", value: "emerging" }
              ]}
              value={strengthFilter}
              onChange={(v) => setStrengthFilter(v as any)}
            />
          </div>

          <div className="w-40">
            <Select
              options={[
                { label: "All Types", value: "ALL" },
                { label: "Unexplored Domains", value: "unexplored" },
                { label: "Improvement Area", value: "improvement" },
                { label: "Novelty Synthesis", value: "novelty" },
                { label: "Limitation Bypass", value: "limitation" }
              ]}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as any)}
            />
          </div>

          {(strengthFilter !== "ALL" || typeFilter !== "ALL") && (
            <button
              onClick={() => { setStrengthFilter("ALL"); setTypeFilter("ALL"); }}
              className="text-xs text-[var(--primary)] hover:underline font-semibold cursor-pointer px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Identified Gaps list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Identified Research Gaps ({filteredGaps.length})
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Click on any gap to search literature or inspect source paper</span>
        </div>

        {filteredGaps.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[var(--text-muted)]">
            No research gaps matched your current filter criteria. Try uploading papers or adding a custom research gap.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGaps.map((gap) => (
              <GapCard 
                key={gap.id} 
                gap={gap} 
                onExplore={() => navigate(`/analysis/${gap.paperId}`)} 
                onSearch={() => navigate(`/sites?q=${encodeURIComponent(gap.title)}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Limitations and Future scopes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Limitations */}
        <Card className="p-5 sm:p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Limitations Across Literature</h3>
          </div>
          {allLimitations.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No limitation metrics recorded.</p>
          ) : (
            <ul className="space-y-2 text-xs sm:text-sm">
              {allLimitations.slice(0, 6).map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed">{l}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Future Scope */}
        <Card className="p-5 sm:p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-3">
            <Telescope size={18} className="text-[var(--primary)]" />
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Future Directions Mentioned</h3>
          </div>
          {allFutureScope.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No future scopes recorded.</p>
          ) : (
            <ul className="space-y-2 text-xs sm:text-sm">
              {allFutureScope.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Add Custom Research Gap Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Custom Research Gap / Idea">
        <form onSubmit={handleCreateCustomGap} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Associate with Paper*
            </label>
            <select
              value={selectedPaperForGap}
              onChange={(e) => setSelectedPaperForGap(e.target.value)}
              className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-2.5 text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.slice(0, 50)}... ({p.publicationYear})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Gap Title*"
            placeholder="E.g., Low-light camera detection failure during heavy fog"
            value={newGapTitle}
            onChange={setNewGapTitle}
            required
          />

          <Textarea
            label="Detailed Description*"
            placeholder="Explain why current literature fails in this area and what is missing..."
            value={newGapDesc}
            onChange={setNewGapDesc}
            rows={2}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Opportunity Strength"
              options={[
                { label: "Critical / Strong Impact", value: "strong" },
                { label: "Moderate Impact", value: "moderate" },
                { label: "Emerging Direction", value: "emerging" }
              ]}
              value={newGapStrength}
              onChange={(v) => setNewGapStrength(v as any)}
            />

            <Select
              label="Gap Type"
              options={[
                { label: "Unexplored Domain", value: "unexplored" },
                { label: "Performance Improvement", value: "improvement" },
                { label: "Novelty Synthesis", value: "novelty" },
                { label: "Stated Limitation", value: "limitation" }
              ]}
              value={newGapType}
              onChange={(v) => setNewGapType(v as any)}
            />
          </div>

          <Input
            label="Why this is a Gap (optional)"
            placeholder="E.g., Lack of annotated nighttime sensor datasets in urban areas"
            value={newGapWhy}
            onChange={setNewGapWhy}
          />

          <Input
            label="Proposed Project Direction (optional)"
            placeholder="E.g., Combine thermal infrared pre-processing with quantized YOLOv8"
            value={newGapIdea}
            onChange={setNewGapIdea}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="md" disabled={!newGapTitle.trim() || !newGapDesc.trim()}>
              Save Research Gap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function GapCard({ gap, onExplore, onSearch }: { gap: any; onExplore: () => void; onSearch: () => void }) {
  const typeIcon = {
    unexplored: <Telescope size={15} />,
    improvement: <TrendingUp size={15} />,
    novelty: <Wand2 size={15} />,
    limitation: <AlertTriangle size={15} />,
  };
  const typeColor = {
    unexplored: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    improvement: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    novelty: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    limitation: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  };
  const safeType = (gap.type && typeColor[gap.type as keyof typeof typeColor]) ? (gap.type as keyof typeof typeColor) : "unexplored";
  const safeStrength = (gap.strength === "strong" || gap.strength === "moderate" || gap.strength === "emerging") ? gap.strength : "moderate";

  return (
    <Card className="flex flex-col justify-between p-5 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${typeColor[safeType]}`}>
              {typeIcon[safeType]}
            </div>
            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">{gap.title}</span>
          </div>
          <GapBadge strength={safeStrength} />
        </div>
        
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{gap.description}</p>
        
        {gap.whyIsGap && (
          <div className="p-3 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl">
            <dt className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Why this is a gap</dt>
            <dd className="text-xs sm:text-sm text-[var(--text-primary)] mt-0.5 leading-relaxed font-medium">{gap.whyIsGap}</dd>
          </div>
        )}

        {gap.possibleProjectIdea && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <dt className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Proposed Project Idea</dt>
            <dd className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 mt-0.5 font-medium leading-relaxed">{gap.possibleProjectIdea}</dd>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 mt-4">
        <div>
          <span className="text-xs text-[var(--text-muted)] block truncate max-w-[150px]" title={gap.paperTitle}>Source: {gap.paperTitle}</span>
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mt-0.5 block">
            {gap.isAiGenerated ? "AI-Synthesized Opportunity Estimate" : "Author explicitly stated"}
          </span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={onSearch} variant="outline" size="sm" className="text-xs font-semibold px-2.5 py-1">
            Search Portal
          </Button>
          <Button onClick={onExplore} variant="secondary" size="sm" className="text-xs font-semibold px-2.5 py-1">
            View Paper →
          </Button>
        </div>
      </div>
    </Card>
  );
}
