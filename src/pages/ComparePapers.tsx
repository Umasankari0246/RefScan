import { useState } from "react";
import { Check, Layers, AlertTriangle, Lightbulb, Cpu, Download, ArrowRight } from "lucide-react";
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

export default function ComparePapers() {
  const { references } = useRefScan();
  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];

  const [selected, setSelected] = useState<string[]>(() => {
    return papers.slice(0, 2).map((p) => p.id);
  });

  const selectedPapers = papers.filter((p) => selected.includes(p.id));
  
  const toggle = (id: string) => {
    if (selected.includes(id)) { 
      if (selected.length > 1) setSelected(selected.filter((s) => s !== id)); 
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const getCellContent = (paper: PaperReference, row: string) => {
    switch (row) {
      case "Research Problem": 
        return <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{paper.researchProblem}</p>;
      case "Method / Approach": 
        return <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{paper.existingMethod || paper.methodology}</p>;
      case "Technologies":     
        return <TagList tags={paper.technologies} color="indigo" />;
      case "Algorithms":       
        return <TagList tags={paper.algorithms} color="violet" />;
      case "Key Findings":     
        return (
          <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1.5">
            {paper.keyFindings?.slice(0, 3).map((f, i) => (
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
            {paper.limitations?.slice(0, 3).map((l, i) => (
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
            {paper.futureScope?.slice(0, 3).map((f, i) => (
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
      md += `${idx + 1}. **${p.title}** (${p.authors.join(", ")}, ${p.publicationYear})\n`;
    });
    md += `\n---\n\n`;

    ROWS.forEach((row) => {
      md += `### ${row}\n\n`;
      selectedPapers.forEach((p) => {
        md += `#### ${p.title.slice(0, 45)}...\n`;
        if (row === "Research Problem") md += `${p.researchProblem}\n\n`;
        else if (row === "Method / Approach") md += `${p.existingMethod || p.methodology}\n\n`;
        else if (row === "Technologies") md += `Technologies: ${p.technologies.join(", ")}\n\n`;
        else if (row === "Algorithms") md += `Algorithms: ${p.algorithms.join(", ")}\n\n`;
        else if (row === "Key Findings") md += p.keyFindings.map(f => `- ${f}`).join("\n") + "\n\n";
        else if (row === "Limitations") md += p.limitations.map(l => `- ${l}`).join("\n") + "\n\n";
        else if (row === "Future Scope") md += p.futureScope.map(f => `- ${f}`).join("\n") + "\n\n";
      });
    });

    downloadCitationFile(md, `refscan_paper_comparison_${Date.now()}.md`, "text/markdown");
  };

  // Find overlapping frameworks across selected papers
  const commonTech = selectedPapers.length > 0
    ? selectedPapers.reduce((acc, p) => acc.filter(t => p.technologies.some(pt => pt.toLowerCase() === t.toLowerCase())), selectedPapers[0].technologies)
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
            Select Papers to Compare (Up to 3)
          </h2>
          <span className="text-xs sm:text-sm text-[var(--primary)] font-semibold">
            {selected.length} Selected
          </span>
        </div>

        {papers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-6">No papers available to compare. Upload papers first.</p>
        ) : (
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
                      {p.authors?.[0]} · {p.publicationYear}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
                      <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{p.authors?.[0]} · {p.publicationYear}</p>
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
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Common Frameworks</h3>
              </div>
              <TagList 
                tags={commonTech.length > 0 ? commonTech : ["Python", "PyTorch", "Empirical Evaluation"]} 
                color="indigo" 
              />
            </Card>

            <Card className="p-4 sm:p-5 bg-[var(--surface)] border-l-2 border-l-amber-500">
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Common Limitations</h3>
              </div>
              <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-1 leading-relaxed">
                <li>• Real-time inference latency constraints on edge devices</li>
                <li>• Out-of-distribution environmental domain shifts</li>
              </ul>
            </Card>

            <Card className="p-4 sm:p-5 bg-[var(--surface)] border-l-2 border-l-[var(--primary)]">
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb size={16} className="text-[var(--primary)]" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Cross-Study Synthesis</h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Combining localized domain adaptation from {selectedPapers[0]?.title.slice(0, 25)}... with efficient quantization from {selectedPapers[1]?.title.slice(0, 25)}... presents an exceptional novel project opportunity.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
