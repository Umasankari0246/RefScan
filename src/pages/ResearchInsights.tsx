import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Card, StatCard, TagList } from "../components/ui";
import { FileText, Lightbulb, Cpu, Globe, BarChart2 } from "lucide-react";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference, WebsiteReference } from "../types";

export default function ResearchInsights() {
  const { references } = useRefScan();
  
  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];
  const websites = references.filter((r) => r.type === "WEBSITE") as WebsiteReference[];

  const totalGaps = papers.reduce((a, p) => a + p.researchGaps.length, 0);
  const allTechs = [...new Set(papers.flatMap((p) => p.technologies))];
  const allAlgos = [...new Set(papers.flatMap((p) => p.algorithms))];

  // Dynamic Chart calculations based on current workspace state
  const getTechChartData = () => {
    const counts: Record<string, number> = {};
    papers.flatMap((p) => p.technologies).forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const getAlgoChartData = () => {
    const counts: Record<string, number> = {};
    papers.flatMap((p) => p.algorithms).forEach((a) => {
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getGapCategoryData = () => {
    const counts: Record<string, number> = { unexplored: 0, improvement: 0, novelty: 0, limitation: 0 };
    papers.flatMap((p) => p.researchGaps).forEach((g) => {
      counts[g.type] = (counts[g.type] || 0) + 1;
    });
    
    const colors = { 
      unexplored: "#6366F1", // Indigo
      improvement: "#38BDF8", // Cyan
      novelty: "#22C55E", // Emerald
      limitation: "#F59E0B" // Amber
    };
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[name as keyof typeof colors] || "#94A3B8"
    })).filter(entry => entry.value > 0);
  };

  const getLimitationData = () => {
    const items = papers.flatMap((p) => p.limitations);
    const counts: Record<string, number> = {};
    
    items.forEach((l) => {
      let cat = "General";
      if (/light|lux|night|weather|rain|fog/i.test(l)) cat = "Lighting/Env";
      else if (/language|english|multilingual/i.test(l)) cat = "Translation/Lang";
      else if (/privacy|cloud|hipaa|gdpr|security/i.test(l)) cat = "Privacy & Safety";
      else if (/scale|device|constrained|microcontroller|fps|latency/i.test(l)) cat = "Hardware Scaling";
      else if (/explain|black box|visualize/i.test(l)) cat = "Explainability";
      
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  const techData = getTechChartData();
  const algoData = getAlgoChartData();
  const gapCategories = getGapCategoryData();
  const limitData = getLimitationData();

  const tooltipCustomStyle = {
    backgroundColor: "var(--surface)",
    borderColor: "var(--border)",
    borderRadius: "12px",
    color: "var(--text-primary)",
    boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.2)",
    fontSize: "13px",
    padding: "8px 12px"
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
            <BarChart2 size={15} /> Quantitative Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Research Analytics</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            Aggregated scientific intelligence across all your cataloged books, papers, and web materials.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <StatCard label="Papers Analyzed" value={papers.length} icon={<FileText size={20} />} color="indigo" />
        <StatCard label="Research Gaps" value={totalGaps} icon={<Lightbulb size={20} />} color="amber" />
        <StatCard label="Technologies" value={allTechs.length} icon={<Cpu size={20} />} color="violet" />
        <StatCard label="Web Sources" value={websites.length} icon={<Globe size={20} />} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Technologies Chart */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
              Most Referenced Technologies
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{techData.length} indexed</span>
          </div>
          {techData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">Upload papers to generate technology frequency charts.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={techData} margin={{ left: -15, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" allowDecimals={false} />
                <Tooltip contentStyle={tooltipCustomStyle} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Gap Category Chart */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
              Research Gap Breakdown
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{totalGaps} total</span>
          </div>
          {gapCategories.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">No research gaps cataloged in workspace.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={gapCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={80} paddingAngle={4}>
                  {gapCategories.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipCustomStyle} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "var(--text-secondary)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Algorithms list chart */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Common Algorithms & Methods
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{algoData.length} recorded</span>
          </div>
          {algoData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">No algorithms identified yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={algoData} layout="vertical" margin={{ left: 45, right: 15 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" width={90} />
                <Tooltip contentStyle={tooltipCustomStyle} cursor={{ fill: "rgba(34, 197, 94, 0.08)" }} />
                <Bar dataKey="count" fill="#22C55E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Limitations category chart */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Limitation Categories
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{limitData.length} categories</span>
          </div>
          {limitData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">No limitations recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={limitData} margin={{ left: -15, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" allowDecimals={false} />
                <Tooltip contentStyle={tooltipCustomStyle} cursor={{ fill: "rgba(245, 158, 11, 0.08)" }} />
                <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Aggregate tags list */}
      {allTechs.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight mb-4">
            Technical Domain Vocabulary
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Technologies & Frameworks</p>
              <TagList tags={allTechs} color="indigo" />
            </div>
            {allAlgos.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Theoretical Models / Algorithms</p>
                <TagList tags={allAlgos} color="sky" />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
