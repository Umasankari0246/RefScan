import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { 
  Globe, Search, ExternalLink, Cpu, 
  Activity, Leaf, Scale, Library, Sparkles, Compass,
  BookOpen, Plus, Check, Loader2, FileText, ArrowRight
} from "lucide-react";
import { Card, Button, Input, Select, Badge, Tabs } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference } from "../types";
import { searchAcademicLiterature, convertSearchResultToPaperReference, AcademicSearchResult } from "../services/academicSearchService";

type DomainType = "MEDICAL" | "CS" | "AGRICULTURE" | "LAW" | "GENERAL";

interface Platform {
  name: string;
  description: string;
  bestFor: string;
  searchUrl: (q: string) => string;
  domains: DomainType[];
}

const PLATFORMS: Platform[] = [
  {
    name: "IEEE Xplore",
    description: "Highly recognized digital library for engineering, electronics, and computer science papers.",
    bestFor: "Engineering, Computer Science, Robotics, Hardware",
    searchUrl: (q) => `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(q)}`,
    domains: ["CS"]
  },
  {
    name: "PubMed",
    description: "Primary database of biomedical and life sciences literature from the National Library of Medicine.",
    bestFor: "Medicine, Healthcare, Biotechnology, Clinical Research",
    searchUrl: (q) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
    domains: ["MEDICAL"]
  },
  {
    name: "arXiv",
    description: "Open-access archive for physics, mathematics, computer science, quantitative biology, and statistics.",
    bestFor: "Artificial Intelligence, Deep Learning, Theory, Math",
    searchUrl: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
    domains: ["CS"]
  },
  {
    name: "ACM Digital Library",
    description: "Definitive computing research library covering computing machinery, interactions, and systems architectures.",
    bestFor: "Computer Science, Software Engineering, Database Systems",
    searchUrl: (q) => `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(q)}`,
    domains: ["CS"]
  },
  {
    name: "ScienceDirect",
    description: "Large database of scientific, technical, and medical journals published by Elsevier.",
    bestFor: "Agriculture, Biology, Pharmacology, Materials Science",
    searchUrl: (q) => `https://www.sciencedirect.com/search?qs=${encodeURIComponent(q)}`,
    domains: ["AGRICULTURE", "MEDICAL"]
  },
  {
    name: "SpringerLink",
    description: "Comprehensive scientific database covering journals, book series, and laboratory protocols.",
    bestFor: "Plant Pathology, Agriculture, Chemistry, Life Sciences",
    searchUrl: (q) => `https://link.springer.com/search?query=${encodeURIComponent(q)}`,
    domains: ["AGRICULTURE", "MEDICAL"]
  },
  {
    name: "Google Scholar",
    description: "Universal search engine for academic peer-reviewed papers, patents, and books across all domains.",
    bestFor: "All Fields, Legal Case Laws, Citations Tracking",
    searchUrl: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
    domains: ["MEDICAL", "CS", "AGRICULTURE", "LAW", "GENERAL"]
  },
  {
    name: "Semantic Scholar",
    description: "AI-powered academic search engine providing citation analysis, paper summaries, and scientific influence indices.",
    bestFor: "All Fields, Computer Science, Biomedicine",
    searchUrl: (q) => `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}`,
    domains: ["MEDICAL", "CS", "GENERAL"]
  },
  {
    name: "ResearchGate",
    description: "Social network for researchers to share papers, ask scientific questions, and find collaborators.",
    bestFor: "Preprints, Researcher Communication, Biology, CS",
    searchUrl: (q) => `https://www.researchgate.net/search/publication?q=${encodeURIComponent(q)}`,
    domains: ["GENERAL"]
  },
  {
    name: "CORE",
    description: "The world's largest aggregator of open-access research papers harvested from repositories and journals.",
    bestFor: "Open Access Papers, General Sciences",
    searchUrl: (q) => `https://core.ac.uk/search?q=${encodeURIComponent(q)}`,
    domains: ["GENERAL", "AGRICULTURE"]
  },
  {
    name: "DOAJ",
    description: "Directory of Open Access Journals mapping high-quality peer-reviewed open access papers.",
    bestFor: "Open Access, Global Multi-Disciplinary Journals",
    searchUrl: (q) => `https://doaj.org/search/articles?ref=homepage-box&source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22${encodeURIComponent(q)}%22%7D%7D%7D`,
    domains: ["GENERAL", "AGRICULTURE"]
  },
  {
    name: "HeinOnline",
    description: "Leading legal research database containing law reviews, legal histories, treaties, and government publications.",
    bestFor: "Law, Constitutional Studies, International Treaties",
    searchUrl: (q) => `https://heinonline.org/HOL/LuceneSearch?terms=${encodeURIComponent(q)}&collection=all`,
    domains: ["LAW"]
  }
];

export default function ResearchSites() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { references, addReference } = useRefScan();
  const queryParam = searchParams.get("q");

  const [activeTab, setActiveTab] = useState<"LIVE_SEARCH" | "PORTALS">("LIVE_SEARCH");
  const [query, setQuery] = useState(queryParam || "federated learning medical imaging");
  const [selectedDomain, setSelectedDomain] = useState<"AUTO" | DomainType>("AUTO");
  const [autoDomain, setAutoDomain] = useState<DomainType>("GENERAL");

  // Live search states
  const [liveResults, setLiveResults] = useState<AcademicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importedIds, setImportedIds] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState("");

  // Load papers and gaps to provide quick selection dropdown
  const papers = references.filter((r) => r.type === "PAPER") as PaperReference[];
  const allGaps = papers.flatMap((p) => (p.researchGaps || []).map((g) => ({ title: g.title, source: p.title })));

  // Automatically classify domain based on query changes
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setAutoDomain("GENERAL");
      return;
    }

    if (/medical|clinical|radiology|health|disease|treatment|doctor|hospital|patient|cardiology|biology|vaccine|bio/i.test(q)) {
      setAutoDomain("MEDICAL");
    } else if (/computer|algorithm|yolo|network|blockchain|learning|neural|ai|software|sensor|iot|edge|robot|hardware|database|nlp/i.test(q)) {
      setAutoDomain("CS");
    } else if (/crop|agriculture|farm|plant|soil|fao|agri|fertilizer|insect|harvest|pest|botany/i.test(q)) {
      setAutoDomain("AGRICULTURE");
    } else if (/law|legal|court|constitution|patent|copyright|statute|regulation|justice|attorney/i.test(q)) {
      setAutoDomain("LAW");
    } else {
      setAutoDomain("GENERAL");
    }
  }, [query]);

  // Sync state if URL query param changes
  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      handleExecuteLiveSearch(queryParam);
    } else {
      handleExecuteLiveSearch("federated learning medical imaging");
    }
  }, [queryParam]);

  const handleExecuteLiveSearch = async (searchTerm?: string) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const results = await searchAcademicLiterature(q, 8);
      setLiveResults(results);
    } catch (err) {
      console.warn("Search execution error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportPaper = (item: AcademicSearchResult) => {
    const newPaper = convertSearchResultToPaperReference(item);
    addReference(newPaper);
    setImportedIds((prev) => ({ ...prev, [item.id]: true }));
    setToastMsg(`"${item.title.slice(0, 32)}..." added to your Library!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const activeDomain = selectedDomain === "AUTO" ? autoDomain : selectedDomain;

  // Filters platforms
  const prioritized = PLATFORMS.filter((p) => p.domains.includes(activeDomain));
  const fallbacks = PLATFORMS.filter((p) => !p.domains.includes(activeDomain) && p.name !== "Google Scholar" && p.name !== "Semantic Scholar");

  const domainLabels: Record<DomainType, { label: string; icon: React.ReactNode; color: string }> = {
    MEDICAL: { label: "Biomedical & Healthcare", icon: <Activity size={14} />, color: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50" },
    CS: { label: "Computer Science & AI", icon: <Cpu size={14} />, color: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50" },
    AGRICULTURE: { label: "Agriculture & Botany", icon: <Leaf size={14} />, color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50" },
    LAW: { label: "Legal & Jurisprudence", icon: <Scale size={14} />, color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50" },
    GENERAL: { label: "General Multidisciplinary", icon: <Library size={14} />, color: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50" }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Title + Toast */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
            <Compass size={15} /> Global Literature Discovery
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Academic Search Portals</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            Search live across OpenAlex, CrossRef, and arXiv or generate direct links to specialized database portals.
          </p>
        </div>

        {toastMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            {toastMsg}
          </div>
        )}
      </div>

      {/* Query Bar */}
      <Card className="p-5 sm:p-7 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <Input
              label="Research Subject / Keyword / Gap"
              icon={<Search size={18} className="text-[var(--text-muted)]" />}
              placeholder="E.g., Deep learning for plant disease detection..."
              value={query}
              onChange={setQuery}
            />
          </div>
          <div className="w-full">
            <Button 
              onClick={() => handleExecuteLiveSearch()} 
              variant="primary" 
              size="md" 
              className="w-full font-semibold min-h-[42px] flex items-center justify-center gap-2"
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {isSearching ? "Searching..." : "Search Papers"}
            </Button>
          </div>
        </div>

        {/* Override Domain Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-medium">Domain:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${domainLabels[activeDomain].color}`}>
              {domainLabels[activeDomain].icon}
              {domainLabels[activeDomain].label}
            </span>
          </div>

          <div className="w-56">
            <Select
              options={[
                { label: `Auto-detect (${domainLabels[autoDomain].label})`, value: "AUTO" },
                { label: "Computer Science", value: "CS" },
                { label: "Medicine & Health", value: "MEDICAL" },
                { label: "Agriculture", value: "AGRICULTURE" },
                { label: "Law / Legal", value: "LAW" },
                { label: "General Multi-Disciplinary", value: "GENERAL" }
              ]}
              value={selectedDomain}
              onChange={(v) => setSelectedDomain(v as "AUTO" | DomainType)}
            />
          </div>
        </div>
      </Card>

      {/* Quick lookup helper from library */}
      {(papers.length > 0 || allGaps.length > 0) && (
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--primary)]" /> Quick select from your workspace library
          </p>
          <div className="flex flex-wrap gap-2">
            {papers.map((p) => (
              <button 
                key={p.id}
                onClick={() => {
                  setQuery(p.title);
                  handleExecuteLiveSearch(p.title);
                }}
                className="text-xs bg-[var(--bg-secondary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-[var(--border)] hover:border-indigo-200 dark:hover:border-indigo-800/60 px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer font-medium max-w-xs truncate transition-colors"
                title={p.title}
              >
                📄 {p.title}
              </button>
            ))}
            {allGaps.map((g, idx) => (
              <button 
                key={`${g.title}_${idx}`}
                onClick={() => {
                  setQuery(g.title);
                  handleExecuteLiveSearch(g.title);
                }}
                className="text-xs bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-lg text-amber-800 dark:text-amber-200 cursor-pointer font-medium max-w-xs truncate transition-colors"
                title={g.title}
              >
                💡 Gap: {g.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* View Switcher Tabs */}
      <div className="flex gap-4 sm:gap-6 border-b border-[var(--border)] w-full overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab("LIVE_SEARCH")}
          className={`pb-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "LIVE_SEARCH"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <BookOpen size={16} /> Live Academic Search & 1-Click Import ({liveResults.length})
        </button>
        <button
          onClick={() => setActiveTab("PORTALS")}
          className={`pb-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "PORTALS"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Globe size={16} /> Academic Portal Deep-Links ({prioritized.length})
        </button>
      </div>

      {/* 1. Live Academic Search Results View */}
      {activeTab === "LIVE_SEARCH" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
              Live Academic Papers for "{query}"
            </h3>
            <span className="text-xs text-[var(--text-muted)]">Queried via CrossRef & OpenAlex</span>
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Searching academic literature across global repositories…</p>
              <p className="text-xs text-[var(--text-muted)]">Fetching authors, DOIs, citations, and abstracts</p>
            </div>
          ) : liveResults.length === 0 ? (
            <Card className="p-8 text-center text-sm text-[var(--text-muted)]">
              No direct literature matches found. Try modifying your search keywords or visit the Portal Deep-Links tab.
            </Card>
          ) : (
            <div className="space-y-3.5">
              {liveResults.map((result) => {
                const isImported = importedIds[result.id] || references.some(r => r.title.toLowerCase() === result.title.toLowerCase());

                return (
                  <Card key={result.id} className="p-5 sm:p-6 hover:border-[var(--primary)] hover:shadow-xs transition-all">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/50">
                            {result.source}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-medium">
                            {result.publicationYear} · {result.journal}
                          </span>
                          {result.citationCount !== undefined && result.citationCount > 0 && (
                            <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 font-medium">
                              ★ {result.citationCount} Citations
                            </span>
                          )}
                        </div>

                        <h4 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                          {result.title}
                        </h4>

                        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                          <strong>Authors:</strong> {result.authors.join(", ")}
                        </p>

                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border)]">
                          {result.abstract}
                        </p>

                        {result.doi && (
                          <p className="text-xs font-mono text-[var(--text-muted)]">
                            DOI: {result.doi}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                        <Button
                          onClick={() => handleImportPaper(result)}
                          variant={isImported ? "outline" : "primary"}
                          size="sm"
                          disabled={isImported}
                          className="font-semibold text-xs min-h-[36px]"
                        >
                          {isImported ? (
                            <><Check size={14} className="text-emerald-600 dark:text-emerald-400 mr-1" /> In Workspace</>
                          ) : (
                            <><Plus size={14} className="mr-1" /> Import to Library</>
                          )}
                        </Button>

                        {result.url && (
                          <a href={result.url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="w-full text-xs font-semibold text-[var(--primary)]">
                              Open Source <ExternalLink size={12} className="ml-1" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Deep Links Platform View */}
      {activeTab === "PORTALS" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
              {query ? `Prioritized Portals for "${domainLabels[domain].label}"` : "Academic Research Portals"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {prioritized.map((platform) => (
                <PlatformCard key={platform.name} platform={platform} query={query} />
              ))}
            </div>
          </div>

          {query && fallbacks.length > 0 && (
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
                Other Supporting Research Libraries
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fallbacks.slice(0, 3).map((platform) => (
                  <PlatformCard key={platform.name} platform={platform} query={query} isMini />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, query, isMini = false }: { platform: Platform; query: string; isMini?: boolean }) {
  const isSearchDisabled = !query.trim();

  return (
    <Card className={`flex flex-col justify-between p-5 sm:p-6 hover:border-[var(--primary)] hover:shadow-xs transition-all group ${isMini ? "p-4 sm:p-5" : ""}`}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5 group-hover:text-[var(--primary)] transition-colors">
            <Globe size={16} className="text-[var(--accent)] flex-shrink-0" />
            {platform.name}
          </h4>
          {!isMini && (
            <Badge variant="indigo" className="text-[10px] font-semibold uppercase px-2 py-0.2">
              Primary
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {platform.description}
        </p>
        {!isMini && (
          <p className="text-xs text-[var(--text-muted)]">
            Best for: <span className="text-[var(--text-primary)] font-medium">{platform.bestFor}</span>
          </p>
        )}
      </div>

      <div className={`pt-3.5 border-t border-[var(--border)] mt-4 flex items-center justify-between gap-3 ${isMini ? "mt-3 pt-2.5" : ""}`}>
        <span className="text-xs text-[var(--text-muted)]">
          {isSearchDisabled ? "Enter query to search" : "Deep-link ready ✓"}
        </span>
        {isSearchDisabled ? (
          <Button variant="ghost" size="sm" className="px-3 text-xs" disabled>
            Search Portal
          </Button>
        ) : (
          <a href={platform.searchUrl(query)} target="_blank" rel="noreferrer">
            <Button variant="primary" size="sm" className="px-3.5 text-xs font-semibold flex items-center gap-1">
              Search {platform.name.split(" ")[0]} <ExternalLink size={12} />
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}
