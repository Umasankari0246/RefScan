import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Check, Layers, AlertTriangle, Lightbulb, Cpu, Download, Upload } from "lucide-react";
import { Card, TagList, Badge, Button } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference } from "../types";
import { downloadCitationFile } from "../services/citationService";

const ROWS = [
  "Research Problem", 
  "Method / Approach", 
  "Technologies", 
  "Algorithms", 
  "Key Findings", 
  "Limitations", 
  "Future Scope"
];

function getPaperProblem(p: PaperReference): string {
  return p.researchProblem || p.problemStatement || p.abstract?.slice(0, 220) || "Not explicitly specified in paper.";
}

function getPaperMethod(p: PaperReference): string {
  return p.proposedMethod || p.methodology || p.existingMethod || "Methodology details extracted in full paper analysis.";
}

function getPaperTech(p: PaperReference): string[] {
  if (Array.isArray(p.technologies) && p.technologies.length > 0) return p.technologies;
  if (Array.isArray(p.toolsAndTechList) && p.toolsAndTechList.length > 0) return p.toolsAndTechList;
  if (Array.isArray(p.keywords) && p.keywords.length > 0) return p.keywords.slice(0, 5);
  return ["Empirical Analysis"];
}

function getPaperAlgos(p: PaperReference): string[] {
  if (Array.isArray(p.algorithms) && p.algorithms.length > 0) return p.algorithms;
  if (Array.isArray(p.algorithmsList) && p.algorithmsList.length > 0) return p.algorithmsList;
  return ["Standard Domain Pipeline"];
}

function getPaperFindings(p: PaperReference): string[] {
  if (Array.isArray(p.keyFindings) && p.keyFindings.length > 0) return p.keyFindings;
  if (Array.isArray(p.resultsAndFindingsList) && p.resultsAndFindingsList.length > 0) return p.resultsAndFindingsList;
  if (p.resultsAndEvaluation) return [p.resultsAndEvaluation];
  return ["Demonstrated quantitative improvement over baseline methods."];
}

function getPaperLimitations(p: PaperReference): string[] {
  if (Array.isArray(p.limitations) && p.limitations.length > 0) return p.limitations;
  if (Array.isArray(p.limitationsList) && p.limitationsList.length > 0) return p.limitationsList;
  return ["Evaluated under constrained dataset/hardware settings."];
}

function getPaperFutureScope(p: PaperReference): string[] {
  if (Array.isArray(p.futureScope) && p.futureScope.length > 0) return p.futureScope;
  if (Array.isArray(p.futureScopeList) && p.futureScopeList.length > 0) return p.futureScopeList;
  return ["Extend evaluation to broader real-world datasets and edge deployments."];
}

export default function ComparePapers() {
  const { references } = useRefScan();
  const navigate = useNavigate();
  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];
  const hasAutoSelected = useRef(false);

  const [selected, setSelected] = useState<string[]>(() => {
    return papers.slice(0, 2).map((p) => p.id);
  });

  useEffect(() => {
    if (papers.length > 0) {
      const validSelected = selected.filter((id) => papers.some((p) => p.id === id));
      if (!hasAutoSelected.current && validSelected.length === 0) {
        hasAutoSelected.current = true;
        setSelected(papers.slice(0, Math.min(2, papers.length)).map((p) => p.id));
      } else if (validSelected.length !== selected.length) {
        setSelected(validSelected);
      }
    }
  }, [papers, selected]);

  const selectedPapers = papers.filter((p) => selected.includes(p.id));
  
  const toggle = (id: string) => {
    hasAutoSelected.current = true;
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    } else {
      // Replace the oldest selection if already at 3 so user never feels stuck
      setSelected([...selected.slice(1), id]);
    }
  };

  const getCellContent = (paper: PaperReference, row: string) => {
    switch (row) {
      case "Research Problem": 
        return <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{getPaperProblem(paper)}</p>;
      case "Method / Approach": 
        return <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{getPaperMethod(paper)}</p>;
      case "Technologies":     
        return <TagList tags={getPaperTech(paper)} color="indigo" />;
      case "Algorithms":       
        return <TagList tags={getPaperAlgos(paper)} color="violet" />;
      case "Key Findings":     
        return (
          <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1.5">
            {getPaperFindings(paper).slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-[var(--primary)] font-bold">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        );
      case "Limitations":      
        return (
          <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1.5">
            {getPaperLimitations(paper).slice(0, 3).map((l, i) => (
              <li key={i} className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                <span className="text-amber-500 font-bold">•</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        );
      case "Future Scope":     
        return (
          <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1.5">
            {getPaperFutureScope(paper).slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-indigo-800 dark:text-indigo-300">
                <span className="text-[var(--primary)] font-bold">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        );
      default: return null;
    }
  };

  const handleExportComparison = () => {
    if (selectedPapers.length < 2) return;

    let md = `# RefScan - Multi-Paper Literature Comparison Matrix\n`;
    md += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    md += `## Compared Publications:\n`;
    selectedPapers.forEach((p, idx) => {
      md += `${idx + 1}. **${p.title}** (${(p.authors || ["Unknown Author"]).join(", ")}, ${p.publicationYear || "n.d."})\n`;
    });
    md += `\n---\n\n`;

    ROWS.forEach((row) => {
      md += `### ${row}\n\n`;
      selectedPapers.forEach((p) => {
        md += `#### ${p.title}\n`;
        if (row === "Research Problem") md += `${getPaperProblem(p)}\n\n`;
        else if (row === "Method / Approach") md += `${getPaperMethod(p)}\n\n`;
        else if (row === "Technologies") md += `Technologies: ${getPaperTech(p).join(", ")}\n\n`;
        else if (row === "Algorithms") md += `Algorithms: ${getPaperAlgos(p).join(", ")}\n\n`;
        else if (row === "Key Findings") md += getPaperFindings(p).map(f => `- ${f}`).join("\n") + "\n\n";
        else if (row === "Limitations") md += getPaperLimitations(p).map(l => `- ${l}`).join("\n") + "\n\n";
        else if (row === "Future Scope") md += getPaperFutureScope(p).map(f => `- ${f}`).join("\n") + "\n\n";
      });
    });

    downloadCitationFile(md, `refscan_paper_comparison_${Date.now()}.md`, "text/markdown");
  };

  // Find overlapping frameworks across selected papers safely
  const commonTech = selectedPapers.length > 0
    ? selectedPapers.reduce(
        (acc, p) => {
          const pTech = getPaperTech(p);
          return acc.filter((t) => pTech.some((pt) => pt.toLowerCase() === t.toLowerCase()));
        },
        getPaperTech(selectedPapers[0])
      )
    : [];

  const combinedTech = selectedPapers.length > 0
    ? Array.from(new Set(selectedPapers.flatMap((p) => getPaperTech(p)))).slice(0, 6)
    : [];

  const combinedLimitations = selectedPapers.length > 0
    ? Array.from(new Set(selectedPapers.flatMap((p) => getPaperLimitations(p)))).slice(0, 3)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              Compare Research Papers
            </h1>
            <Badge variant="purple" className="text-xs px-2.5 py-0.5 font-semibold">
              <Layers size={13} className="mr-1" /> Multi-Matrix
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            Select 2–3 papers to compare methodologies, algorithms, dataset sizes, and stated limitations side by side.
          </p>
        </div>

        {selectedPapers.length >= 2 && (
          <Button onClick={handleExportComparison} variant="outline" size="md" className="font-semibold text-xs flex-shrink-0">
            <Download size={14} className="mr-1.5" /> Export Comparison (.md)
          </Button>
        )}
      </div>

      {/* Select papers selector */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Select Papers to Compare (2 to 3 Papers)
          </h2>
          <span className="text-xs sm:text-sm text-[var(--primary)] font-semibold">
            {selectedPapers.length} of {Math.min(3, Math.max(2, papers.length))} Selected
          </span>
        </div>

        {papers.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">No research papers available to compare yet. Upload at least 2 papers first.</p>
            <Button onClick={() => navigate("/upload")} variant="primary" size="md">
              <Upload size={15} className="mr-1.5" /> Upload Research Paper
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {papers.map((p) => {
                const isSelected = selected.includes(p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => toggle(p.id)} 
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-[var(--primary)] bg-indigo-50/60 dark:bg-indigo-950/60 shadow-xs" 
                        : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-indigo-400 dark:hover:border-indigo-600"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-all flex-shrink-0 ${
                      isSelected ? "bg-[var(--primary)] border-[var(--primary)] shadow-xs" : "border-[var(--border)] bg-[var(--surface)]"
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        {p.authors?.[0] || "Unknown Author"} · {p.publicationYear || "n.d."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {papers.length === 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-medium">
                  You currently have 1 paper in your library. Upload at least one more research paper to compare them side by side.
                </p>
                <Button onClick={() => navigate("/upload")} variant="outline" size="sm" className="flex-shrink-0">
                  <Upload size={14} className="mr-1.5" /> Upload 2nd Paper
                </Button>
              </div>
            )}
            {papers.length >= 2 && selectedPapers.length < 2 && (
              <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium text-center pt-2">
                Please select at least 2 papers above to view the side-by-side comparison matrix.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Comparison Viewport */}
      {selectedPapers.length >= 2 && (
        <div className="space-y-6">
          {/* 1. Desktop Matrix Table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] shadow-xs bg-[var(--surface)]">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="bg-[var(--surface-soft)] text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider p-4 w-44 border-b border-[var(--border)]">
                    Parameter
                  </th>
                  {selectedPapers.map((p) => (
                    <th key={p.id} className="bg-[var(--surface-soft)] text-left p-4 border-b border-l border-[var(--border)]">
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{p.title}</p>
                      <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{p.authors?.[0] || "Unknown Author"} · {p.publicationYear || "n.d."}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {ROWS.map((row) => (
                  <tr key={row} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider align-top bg-[var(--surface-soft)]/60">
                      {row}
                    </td>
                    {selectedPapers.map((p) => (
                      <td key={p.id} className="p-4 align-top border-l border-[var(--border)]">
                        {getCellContent(p, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile Stacked Comparison */}
          <div className="md:hidden space-y-4">
            {ROWS.map((row) => (
              <Card key={row} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                    {row}
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedPapers.map((p, idx) => (
                    <div key={p.id} className="p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] space-y-1.5">
                      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                        Paper {idx + 1}: {p.title.slice(0, 40)}…
                      </span>
                      <div>{getCellContent(p, row)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Common Synthesis Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 sm:p-5 bg-[var(--surface)]">
              <div className="flex items-center gap-2 mb-2.5">
                <Cpu size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  {commonTech.length > 0 ? "Common Frameworks" : "Key Technologies Across Papers"}
                </h3>
              </div>
              <TagList 
                tags={commonTech.length > 0 ? commonTech : combinedTech} 
                color="indigo" 
              />
            </Card>

            <Card className="p-4 sm:p-5 bg-[var(--surface)] border-l-2 border-l-amber-500">
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Highlighted Limitations</h3>
              </div>
              <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1 leading-relaxed">
                {combinedLimitations.map((lim, idx) => (
                  <li key={idx}>• {lim}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-4 sm:p-5 bg-[var(--surface)] border-l-2 border-l-[var(--primary)]">
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Cross-Study Synthesis</h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Combining the methodology of &ldquo;{selectedPapers[0]?.title.slice(0, 35)}...&rdquo; with the evaluation approach of &ldquo;{selectedPapers[1]?.title.slice(0, 35)}...&rdquo; addresses key limitations across both studies.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
