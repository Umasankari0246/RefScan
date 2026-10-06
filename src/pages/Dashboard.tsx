import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  BookMarked, ScanLine, FileText, Lightbulb, ArrowRight, Plus, 
  Globe, Search, Quote, Sparkles, PlusCircle,
  Layers, Bookmark, BarChart3, Copy, Check, ExternalLink
} from "lucide-react";
import { StatCard, Badge, Card, Button, BookCover, Input } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { BookReference, PaperReference, WebsiteReference, CitationStyle } from "../types";
import { generateCitationHTML } from "../services/citationService";

export default function Dashboard() {
  const navigate = useNavigate();
  const { references } = useRefScan();

  // Shared stats
  const totalReferences = references.length;
  const booksCount = references.filter((r) => r.type === "BOOK").length;
  const papersCount = references.filter((r) => r.type === "PAPER").length;
  const analyzedCount = references.filter((r) => r.type === "PAPER" && (r as PaperReference).analysisStatus === "complete").length;
  const gapsCount = references.filter((r) => r.type === "PAPER").reduce((acc, r) => acc + ((r as PaperReference).researchGaps?.length || 0), 0);

  // Recent lists
  const recentReferences = references.slice(0, 5);
  const recentPapers = references.filter((r) => r.type === "PAPER").slice(0, 3) as PaperReference[];
  const featuredGap = references
    .filter((r) => r.type === "PAPER")
    .flatMap((p) => (p as PaperReference).researchGaps?.map((g) => ({ ...g, paperTitle: p.title, paperId: p.id })) || [])[0];

  // Universal Search states
  const [searchTab, setSearchTab] = useState<"BOOK" | "PAPER" | "TOPIC" | "GAP" | "WEBSITE">("BOOK");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Citation widget states
  const [quickCiteRefId, setQuickCiteRefId] = useState<string>(references[0]?.id || "");
  const [quickCiteStyle, setQuickCiteStyle] = useState<CitationStyle>("IEEE");
  const [copiedCitation, setCopiedCitation] = useState(false);

  const selectedQuickRef = references.find((r) => r.id === quickCiteRefId) || references[0];
  const quickCitationText = selectedQuickRef ? generateCitationHTML(selectedQuickRef, quickCiteStyle) : "";

  const handleCopyQuickCitation = () => {
    if (!quickCitationText) return;
    const cleanText = quickCitationText.replace(/<[^>]+>/g, "");
    navigator.clipboard.writeText(cleanText);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleTabChange = (tab: "BOOK" | "PAPER" | "TOPIC" | "GAP" | "WEBSITE") => {
    setSearchTab(tab);
    setSearchQuery("");
  };

  const getTabLabel = (tab: typeof searchTab) => {
    if (tab === "BOOK") return "Books";
    if (tab === "PAPER") return "Research Papers";
    if (tab === "TOPIC") return "Topic Synthesis";
    if (tab === "GAP") return "Research Gaps";
    return "Web References";
  };

  const renderUniversalSearchContent = () => {
    const q = searchQuery.toLowerCase().trim();
    
    switch (searchTab) {
      case "BOOK": {
        const matches = references.filter(
          (r) => r.type === "BOOK" && (r.title.toLowerCase().includes(q) || r.authors.some(a => a.toLowerCase().includes(q)) || (r as BookReference).isbn13?.includes(q) || (r as BookReference).isbn10?.includes(q))
        ) as BookReference[];

        return (
          <div className="space-y-4">
            <Input
              icon={<Search size={16} className="text-[var(--text-muted)]" />}
              placeholder="Search books by title, author, publisher, or ISBN..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {q && matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((book) => (
                  <div 
                    key={book.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors"
                  >
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => navigate(`/references/${book.id}`)}
                    >
                      <BookCover title={book.title} color={book.coverColor} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--primary)] transition-colors">{book.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{book.authors.join(", ")} · {book.publisher} ({book.year})</p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">ISBN: {book.isbn13 || book.isbn10 || "Not available"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button onClick={() => navigate(`/citations?ref=${book.id}`)} variant="ghost" size="sm" className="text-xs font-medium">
                        <Quote size={13} className="mr-1" /> Cite
                      </Button>
                      <Button onClick={() => navigate(`/references/${book.id}`)} variant="outline" size="sm" className="text-xs font-medium">
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : q ? (
              <div className="text-center py-6 bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg p-5">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-2.5">No matching books found in your library.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => navigate("/scan")} variant="primary" size="sm">
                    <ScanLine size={14} className="mr-1" /> Scan Barcode / ISBN
                  </Button>
                  <Button onClick={() => navigate("/book/custom")} variant="outline" size="sm">
                    Enter Manually
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Type to search cataloged books by title, author, or ISBN code.</p>
            )}
          </div>
        );
      }
      
      case "PAPER": {
        const matches = references.filter(
          (r) => r.type === "PAPER" && (r.title.toLowerCase().includes(q) || r.authors.some(a => a.toLowerCase().includes(q)) || (r as PaperReference).keywords?.some(k => k.toLowerCase().includes(q)))
        ) as PaperReference[];

        return (
          <div className="space-y-4">
            <Input
              icon={<Search size={16} className="text-[var(--text-muted)]" />}
              placeholder="Search research papers by title, author, algorithms, or keywords..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {q && matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((paper) => (
                  <div 
                    key={paper.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors"
                  >
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => navigate(`/references/${paper.id}`)}
                    >
                      <div className="w-8 h-9 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--primary)] transition-colors">{paper.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{paper.authors.join(", ")} · {paper.journal || "Conference"} ({paper.publicationYear})</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="success" className="text-[10px] px-1.5 py-0.2">
                            {paper.researchGaps?.length || 0} Gaps
                          </Badge>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">DOI: {paper.doi || "Preprint"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button onClick={() => navigate(`/citations?ref=${paper.id}`)} variant="ghost" size="sm" className="text-xs font-medium">
                        <Quote size={13} className="mr-1" /> Cite
                      </Button>
                      <Button onClick={() => navigate(`/references/${paper.id}`)} variant="primary" size="sm" className="text-xs font-medium">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : q ? (
              <div className="text-center py-6 bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg p-5">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-2.5">No matching research papers found.</p>
                <Button onClick={() => navigate("/papers")} variant="primary" size="sm">
                  <Plus size={14} className="mr-1" /> Upload PDF Paper
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Search cataloged papers to review problem statements, methodology, and identified research gaps.</p>
            )}
          </div>
        );
      }

      case "TOPIC": {
        const sampleTopics = [
          "Edge AI Object Detection",
          "Medical NLP Report Generation",
          "Federated Learning",
          "Transformer Attention Mechanisms",
          "Zero-Shot Multilingual Models",
          "Adversarial Robustness"
        ];

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                icon={<Search size={16} className="text-[var(--text-muted)]" />}
                placeholder="Enter a research topic (e.g., 'Edge AI', 'Clinical NLP')..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="flex-1"
              />
              <Button 
                onClick={() => navigate(`/sites?q=${encodeURIComponent(searchQuery || "Machine Learning")}`)} 
                variant="primary" 
                size="md"
              >
                Search Sources
              </Button>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Suggested Academic Topics:</p>
              <div className="flex flex-wrap gap-1.5">
                {sampleTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSearchQuery(topic);
                      navigate(`/sites?q=${encodeURIComponent(topic)}`);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer"
                  >
                    {topic} →
                  </button>
                ))}
              </div>
            </div>

            {q && (
              <div className="p-4 bg-[var(--surface-soft)] border border-[var(--border)] rounded-lg space-y-2.5">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Generated Literature Queries:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">"{q} systematic review"</Badge>
                  <Badge variant="outline" className="text-xs">"recent advances in {q}"</Badge>
                  <Badge variant="outline" className="text-xs">"{q} benchmark evaluation"</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)] text-xs">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Direct Portals:</span>
                  <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 font-medium">
                    Google Scholar <ExternalLink size={12} />
                  </a>
                  <span className="text-[var(--border)]">·</span>
                  <a href={`https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 font-medium">
                    arXiv <ExternalLink size={12} />
                  </a>
                  <span className="text-[var(--border)]">·</span>
                  <button onClick={() => navigate(`/sites?q=${encodeURIComponent(q)}`)} className="text-[var(--primary)] hover:underline cursor-pointer font-medium">
                    Research Portals →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "GAP": {
        const matches = references.filter((r) => r.type === "PAPER").flatMap((p) => 
          ((p as PaperReference).researchGaps || (p as PaperReference).researchGapsList || []).map((g) => ({ ...g, paperTitle: p.title, paperId: p.id }))
        ).filter((g) => !q || g.title?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q) || g.possibleProjectIdea?.toLowerCase().includes(q));

        return (
          <div className="space-y-4">
            <Input
              icon={<Search size={16} className="text-[var(--text-muted)]" />}
              placeholder="Search potential research gaps, limitations, or novelty directions..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {matches.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {matches.map((gap) => (
                  <div 
                    key={gap.id} 
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                    onClick={() => navigate(`/gaps?paper=${gap.paperId}`)}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)] leading-snug hover:text-[var(--primary)]">{gap.title}</span>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">From: {gap.paperTitle}</p>
                      </div>
                      <Badge variant={gap.strength === "strong" ? "error" : gap.strength === "moderate" ? "warning" : "info"} className="text-[10.5px] flex-shrink-0">
                        {gap.strength} Gap
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{gap.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No research gaps matching query. Upload new research papers to detect potential research gaps.</p>
            )}
          </div>
        );
      }

      case "WEBSITE": {
        const matches = references.filter(
          (r) => r.type === "WEBSITE" && (!q || r.title.toLowerCase().includes(q) || (r as WebsiteReference).pageTitle.toLowerCase().includes(q) || (r as WebsiteReference).url.toLowerCase().includes(q))
        ) as WebsiteReference[];

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                icon={<Search size={16} className="text-[var(--text-muted)]" />}
                placeholder="Search cataloged online articles, policy docs, and databases..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="flex-1"
              />
              <Button onClick={() => navigate("/references?addWeb=true")} variant="primary" size="md">
                <PlusCircle size={15} className="mr-1.5" /> Add Website
              </Button>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((web) => (
                  <div key={web.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
                        <Globe size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{web.pageTitle}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{web.title} · {web.domain}</p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">{web.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button onClick={() => navigate(`/citations?ref=${web.id}`)} variant="ghost" size="sm" className="text-xs font-medium">
                        <Quote size={13} className="mr-1" /> Cite
                      </Button>
                      <Button onClick={() => navigate("/references")} variant="outline" size="sm" className="text-xs font-medium">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg p-5">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-2.5">No matching website references found.</p>
                <Button onClick={() => navigate("/references?addWeb=true")} variant="primary" size="sm">
                  <PlusCircle size={14} className="mr-1" /> Add Website Reference
                </Button>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-7 text-[#172554]">
      {/* ── 1. Academic Workspace Header ── */}
      <div className="relative overflow-hidden rounded-[22px] border border-[#DDD8FE] bg-gradient-to-r from-[#EEF2FF] via-[#F5F3FF] to-[#EFF6FF] p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#172554] leading-tight">
              Academic Research Workspace
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-xl">
              Catalog citations, scan physical book barcodes with WebRTC, analyze research PDF methodologies, and uncover high-impact literature gaps in one unified hub.
            </p>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center w-full sm:w-auto flex-shrink-0">
            <Button 
              onClick={() => navigate("/scan")} 
              variant="primary" 
              size="md" 
              className="flex-1 sm:flex-initial bg-[#5B4BDB] hover:bg-[#4938C5] text-white font-semibold text-xs sm:text-sm shadow-xs rounded-xl px-4 py-2.5 min-h-[44px] touch-manipulation active:scale-95"
            >
              <ScanLine size={16} className="mr-1.5" /> Scan ISBN
            </Button>
            <Button 
              onClick={() => navigate("/papers")} 
              variant="outline" 
              size="md" 
              className="flex-1 sm:flex-initial bg-white hover:bg-[#F8F7FF] text-[#172554] border border-[#DDD8FE] font-semibold text-xs sm:text-sm rounded-xl px-4 py-2.5 min-h-[44px] shadow-2xs touch-manipulation active:scale-95"
            >
              <Plus size={16} className="mr-1.5 text-[#5B4BDB]" /> Upload Paper
            </Button>
            <Button 
              onClick={() => navigate("/citations")} 
              variant="outline" 
              size="md" 
              className="w-full sm:w-auto bg-white hover:bg-[#F8F7FF] text-[#64748B] hover:text-[#172554] border border-[#E2E8F0] font-semibold text-xs sm:text-sm rounded-xl px-3.5 py-2.5 min-h-[44px] shadow-2xs touch-manipulation active:scale-95"
            >
              <Quote size={16} className="mr-1.5 text-[#3B82F6]" /> Quick Cite
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Metric Statistics (Colorful 4-Card Overview) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div onClick={() => navigate("/references")} className="cursor-pointer touch-manipulation active:scale-[0.99] transition-transform">
          <StatCard 
            label="Total References" 
            value={totalReferences} 
            icon={<BookMarked size={18} />} 
            accent="indigo"
            subtext="Books, papers & digital"
            trend="Open library →" 
          />
        </div>
        <div onClick={() => navigate("/scan")} className="cursor-pointer touch-manipulation active:scale-[0.99] transition-transform">
          <StatCard 
            label="Books Scanned" 
            value={booksCount} 
            icon={<ScanLine size={18} />} 
            accent="violet"
            subtext="Verified ISBN records"
            trend="Scan book →" 
          />
        </div>
        <div onClick={() => navigate("/papers")} className="cursor-pointer touch-manipulation active:scale-[0.99] transition-transform">
          <StatCard 
            label="Research Papers" 
            value={papersCount} 
            icon={<FileText size={18} />} 
            accent="blue"
            subtext={`${analyzedCount} analyzed with AI`}
            trend="Explore papers →" 
          />
        </div>
        <div onClick={() => navigate("/gaps")} className="cursor-pointer touch-manipulation active:scale-[0.99] transition-transform">
          <StatCard 
            label="Research Gaps" 
            value={gapsCount} 
            icon={<Lightbulb size={18} />} 
            accent="amber"
            subtext="Literature opportunities"
            trend="View matrix →" 
          />
        </div>
      </div>

      {/* ── 3. Quick Actions Grid ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#172554] uppercase tracking-wider">
            Quick Research Actions
          </h2>
          <span className="text-xs text-[#64748B]">All core workspace capabilities</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Scan Book", icon: ScanLine, to: "/scan", desc: "ISBN & Barcode", color: "text-[#5B4BDB] bg-[#EEF0FF]" },
            { label: "Upload Paper", icon: FileText, to: "/papers", desc: "PDF Analysis", color: "text-[#3B82F6] bg-[#EFF6FF]" },
            { label: "Research Gaps", icon: Lightbulb, to: "/gaps", desc: "Novelty Matrix", color: "text-[#D97706] bg-[#FFFBEB]" },
            { label: "Compare", icon: Layers, to: "/compare", desc: "Multi-paper", color: "text-[#7C3AED] bg-[#F5F3FF]" },
            { label: "Citations", icon: Quote, to: "/citations", desc: "IEEE / APA 7th", color: "text-[#059669] bg-[#ECFDF5]" },
            { label: "Portals", icon: Globe, to: "/sites", desc: "Academic Search", color: "text-[#0284C7] bg-[#F0F9FF]" },
            { label: "Saved", icon: Bookmark, to: "/saved", desc: "Bookmarks", color: "text-[#DC2626] bg-[#FEF2F2]" },
            { label: "Insights", icon: BarChart3, to: "/insights", desc: "Analytics & Trends", color: "text-[#5B4BDB] bg-[#EEF0FF]" },
          ].map(({ label, icon: Icon, to, desc, color }) => (
            <button 
              key={to} 
              onClick={() => navigate(to)} 
              className="flex flex-col items-start p-3.5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#5B4BDB]/50 hover:shadow-sm active:scale-95 transition-all duration-150 cursor-pointer text-left group min-h-[44px] touch-manipulation"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform ${color}`}>
                <Icon size={17} />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-[#172554] group-hover:text-[#5B4BDB] transition-colors leading-tight">{label}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 leading-tight">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Universal Research Search Hub ─────────────────────────────────── */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              Universal Academic Search
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Filter across cataloged books, research papers, topic synthesis, and discovered gaps</p>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">{references.length} items cataloged</span>
        </div>
        
        {/* Tab strip */}
        <div className="flex gap-4 sm:gap-5 border-b border-[var(--border)] w-full overflow-x-auto select-none">
          {(["BOOK", "PAPER", "TOPIC", "GAP", "WEBSITE"] as const).map((tab) => (
            <button 
              key={tab} 
              onClick={() => handleTabChange(tab)} 
              className={`pb-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
                searchTab === tab 
                  ? "border-[var(--primary)] text-[var(--primary)] font-semibold" 
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        
        <div>
          {renderUniversalSearchContent()}
        </div>
      </Card>

      {/* ── 5. Main Split Section: Recent Activity & Quick Tools ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left 2 Columns: Recent References & Research Comparative Hub */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent References Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  Recent References
                </h2>
                <p className="text-xs text-[var(--text-muted)]">Recently cataloged books, research papers, and web materials</p>
              </div>
              <Button onClick={() => navigate("/references")} variant="ghost" size="sm" className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]">
                View All ({references.length}) <ArrowRight size={13} className="ml-1" />
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-[var(--border)]">
                {recentReferences.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No references added yet. Scan a book or upload a PDF paper to get started.
                  </div>
                ) : (
                  recentReferences.map((ref) => (
                    <div 
                      key={ref.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          if (ref.type === "BOOK" || ref.type === "PAPER") navigate(`/references/${ref.id}`);
                          else navigate("/references");
                        }}
                      >
                        {ref.type === "BOOK" ? (
                          <BookCover title={ref.title} color={(ref as BookReference).coverColor} size="sm" />
                        ) : ref.type === "PAPER" ? (
                          <div className="w-8 h-9 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                            <FileText size={15} />
                          </div>
                        ) : (
                          <div className="w-8 h-9 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                            <Globe size={15} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--primary)] transition-colors">{ref.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {ref.type === "BOOK" && `${(ref as BookReference).authors.join(", ")} · ${(ref as BookReference).year}`}
                            {ref.type === "PAPER" && `${(ref as PaperReference).authors.join(", ")} · ${(ref as PaperReference).publicationYear}`}
                            {ref.type === "WEBSITE" && `${(ref as WebsiteReference).domain}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                        <Button 
                          onClick={() => navigate(`/citations?ref=${ref.id}`)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs font-medium text-[var(--text-secondary)]"
                        >
                          <Quote size={13} className="mr-1" /> Cite
                        </Button>
                        <Button 
                          onClick={() => {
                            if (ref.type === "BOOK" || ref.type === "PAPER") navigate(`/references/${ref.id}`);
                            else navigate("/references");
                          }} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs font-medium"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Comparative Research Teaser */}
          <Card className="bg-[var(--surface-soft)] p-4 sm:p-5 border border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Multi-Paper Comparative Analysis</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed max-w-lg">
                    Compare methodologies, algorithms, datasets, and benchmark results across your uploaded research papers.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/compare")} variant="outline" size="sm" className="whitespace-nowrap font-medium text-xs">
                Open Comparison <ArrowRight size={13} className="ml-1" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right 1 Column: Research Gap Spotlight & Fast Citation Box */}
        <div className="space-y-4">
          {/* Spotlight: High-Impact Research Gap */}
          {featuredGap && (
            <Card className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <Lightbulb size={15} className="text-amber-500 flex-shrink-0" />
                  <span>Spotlight Research Gap</span>
                </div>
                <Badge variant={featuredGap.strength === "strong" ? "error" : "warning"} className="text-[10px]">
                  {featuredGap.strength}
                </Badge>
              </div>

              <h3 className="text-[13.5px] font-medium text-[var(--text-primary)] leading-snug">{featuredGap.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                {featuredGap.description}
              </p>

              <div className="pt-2.5 border-t border-[var(--border)] flex justify-between items-center text-xs">
                <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[130px]">From: {featuredGap.paperTitle}</span>
                <Button onClick={() => navigate(`/gaps?paper=${featuredGap.paperId}`)} variant="ghost" size="sm" className="text-xs text-[var(--primary)] p-0 h-auto font-medium hover:underline">
                  Explore Gaps →
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Citation Box */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                <Quote size={15} className="text-[var(--text-muted)]" />
                <span>Quick Citation Copy</span>
              </div>
              <Button onClick={() => navigate(`/citations?ref=${quickCiteRefId}`)} variant="ghost" size="sm" className="text-xs text-[var(--primary)] hover:underline p-0 h-auto font-medium">
                Studio →
              </Button>
            </div>

            {/* Source selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)]">Source:</label>
              <select 
                value={quickCiteRefId} 
                onChange={(e) => setQuickCiteRefId(e.target.value)}
                className="w-full text-base sm:text-xs font-medium rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] cursor-pointer min-h-[44px]"
              >
                {references.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                    [{r.type}] {r.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Style selector pills */}
            <div className="flex gap-1 bg-[var(--surface-soft)] p-1 rounded-xl border border-[var(--border)]">
              {(["IEEE", "APA", "MLA", "Harvard"] as CitationStyle[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setQuickCiteStyle(st)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[36px] touch-manipulation ${
                    quickCiteStyle === st 
                      ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-semibold border border-[var(--border)]" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Formatted citation preview */}
            <div className="bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-primary)] font-mono leading-relaxed min-h-[50px] break-words">
              <span dangerouslySetInnerHTML={{ __html: quickCitationText || "Select a reference to preview citation." }} />
            </div>

            <Button onClick={handleCopyQuickCitation} variant="primary" size="md" className="w-full text-xs font-semibold min-h-[44px] touch-manipulation active:scale-95">
              {copiedCitation ? <><Check size={14} className="mr-1" /> Citation Copied!</> : <><Copy size={14} className="mr-1" /> Copy {quickCiteStyle} Citation</>}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
