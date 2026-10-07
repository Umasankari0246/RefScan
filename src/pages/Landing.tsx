import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useRefScan } from "../context/RefScanContext";
import { 
  ScanLine, FileText, Quote, Lightbulb, ArrowRight, BookOpen, 
  CheckCircle2, Cpu, GitBranch, Sparkles, Folder, Bot, 
  Camera, ExternalLink 
} from "lucide-react";
import { RefScanLogo } from "../components/common/RefScanLogo";
import { PageThemeBackground } from "../components/common/PageThemeBackground";

const QUICK_CARDS = [
  {
    title: "Book Scanner",
    desc: "Scan barcodes & ISBNs",
    path: "/scan",
    icon: <Camera size={26} className="text-blue-600" />,
    badge: "Camera Scan",
  },
  {
    title: "Reference Library",
    desc: "Catalog books & papers",
    path: "/references",
    icon: <Folder size={26} className="text-amber-500" />,
    badge: "Organization",
  },
  {
    title: "Citation Studio",
    desc: "IEEE, APA 7, MLA & Harvard",
    path: "/citations",
    icon: <Quote size={26} className="text-purple-600" />,
    badge: "Auto-Format",
  },
  {
    title: "AI Research Assistant",
    desc: "Academic literature Q&A",
    path: "/dashboard",
    icon: <Bot size={26} className="text-indigo-600" />,
    badge: "AI Powered",
  },
  {
    title: "Paper Analysis",
    desc: "Methods & gap discovery",
    path: "/papers",
    icon: <FileText size={26} className="text-emerald-600" />,
    badge: "Deep Parsing",
  },
];

const FEATURES = [
  { icon: <ScanLine size={22} className="text-indigo-600" />, title: "Smart Book Scanning", desc: "Scan any book's barcode to instantly retrieve complete bibliographic details and generate verified citations." },
  { icon: <BookOpen size={22} className="text-blue-600" />, title: "Reference Library", desc: "Organize all your academic books, papers, and online articles in one searchable, filterable digital catalog." },
  { icon: <Quote size={22} className="text-violet-600" />, title: "Citation Generator", desc: "Generate IEEE, APA 7th, MLA 9th, and Harvard references in seconds with one-click clipboard copying." },
  { icon: <FileText size={22} className="text-teal-600" />, title: "Paper Analysis", desc: "Upload research PDFs and get structured breakdowns of problem statements, methodology, and findings." },
  { icon: <Lightbulb size={22} className="text-amber-500" />, title: "Research Gap Detection", desc: "Identify potential unexplored areas, limitations, and future research directions automatically." },
  { icon: <GitBranch size={22} className="text-rose-500" />, title: "Paper Comparison", desc: "Compare multiple research papers side-by-side across datasets, algorithms, performance, and gaps." },
];

const STEPS = [
  { num: "01", title: "Scan or Upload", desc: "Scan a physical book barcode with your camera or drag-and-drop a research PDF." },
  { num: "02", title: "Automated AI Analysis", desc: "RefScan parses the document structure, extracts citations, and identifies methods." },
  { num: "03", title: "Explore Scientific Gaps", desc: "Review algorithmic limitations and unexplored problems discovered across literature." },
  { num: "04", title: "Generate & Export", desc: "Export compliant citations and format your bibliography for publication." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isAuthChecking } = useRefScan();

  useEffect(() => {
    if (!isAuthChecking && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, navigate]);

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* ── Dynamic Page-Adaptive Academic Library Background ───────────────── */}
      <PageThemeBackground />

      {/* ── Top Navigation (Frosted Academic Pill Header) ────────────────────── */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-all">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 py-2.5 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-lg">
          {/* Brand Logo */}
          <div 
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <RefScanLogo size={32} rounded="lg" showGlow className="group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold tracking-tight text-white drop-shadow-sm">RefScan</span>
          </div>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-7 text-xs font-semibold text-white/90">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <button onClick={() => navigate("/dashboard")} className="hover:text-white transition-colors cursor-pointer">Workspace</button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate("/login")} 
              className="text-xs sm:text-sm font-semibold text-[#172554] bg-white hover:bg-slate-100 px-4 py-1.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Login
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="text-xs sm:text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-1.5 rounded-full shadow-md border border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              Register
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero Section (Direct match to reference screenshot) ─────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 text-center relative z-10">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-1.5 text-xs text-white font-medium mb-6 shadow-sm">
          <Sparkles size={14} className="text-amber-300" /> Built for students & researchers
        </div>

        {/* Main Title */}
        <h1 
          style={{ color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold !text-white tracking-tight leading-[1.15] mb-4 drop-shadow-lg"
        >
          Manage Your Academic References <br className="hidden sm:block" />
          <span 
            style={{ color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
            className="!text-white drop-shadow-lg"
          >
            Smarter
          </span>
        </h1>

        {/* Subtitle */}
        <p 
          style={{ color: '#FFFFFF', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
          className="text-lg sm:text-2xl font-bold !text-white tracking-tight mb-4 drop-shadow-md"
        >
          Scan. Organize. Cite. Research
        </p>

        {/* Description */}
        <p 
          style={{ color: '#F1F5F9', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          className="text-xs sm:text-sm md:text-base !text-slate-100 max-w-2xl mx-auto mb-8 leading-relaxed font-medium drop-shadow-sm"
        >
          RefScan simplifies academic reference management by helping students scan, organize, verify, and generate citations from one convenient platform.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-row gap-3.5 justify-center items-center mb-16">
          <button 
            onClick={() => navigate("/register")} 
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-[#172554] font-bold px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-[44px]"
          >
            Get Started <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => navigate("/login")} 
            className="flex items-center justify-center gap-2 bg-[#7C3AED]/90 hover:bg-[#6D28D9] text-white font-bold px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm border border-white/30 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-[44px]"
          >
            Login
          </button>
        </div>

        {/* ── "Everything you need" Feature Row (As in Screenshot) ─────────────── */}
        <div className="pt-2 pb-6">
          <h2 
            style={{ color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
            className="text-xl sm:text-2xl font-bold !text-white tracking-tight drop-shadow-lg mb-6"
          >
            Everything you need
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 max-w-4xl mx-auto">
            {QUICK_CARDS.map((card) => (
              <div
                key={card.title}
                onClick={() => navigate(card.path)}
                className="bg-white/92 hover:bg-white backdrop-blur-xl border border-white/60 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer text-center group flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#172554] mb-0.5 leading-snug">
                  {card.title}
                </h3>
                <p className="text-[11px] text-[#64748B] line-clamp-1">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Breakdowns (Frosted Cards) ─────────────────────────────── */}
      <section id="workflow" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Interactive Workflow
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-[#172554] mt-3 mb-2 tracking-tight">
              From Physical Books to Peer-Reviewed Citations
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              RefScan bridges physical print and digital literature through automated metadata synthesis.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-3">
            {[
              { label: "Book Barcode", sub: "Camera or manual ISBN", icon: <BookOpen size={18} /> },
              { label: "Retrieve Data", sub: "Auto-fill Google Books", icon: <ArrowRight size={18} /> },
              { label: "Verify Details", sub: "Publisher & publication year", icon: <CheckCircle2 size={18} /> },
              { label: "Instant Citation", sub: "IEEE, APA, MLA, Harvard", icon: <Quote size={18} /> },
            ].map((w) => (
              <div key={w.label} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-center hover:bg-white hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2.5">
                  {w.icon}
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#172554]">{w.label}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">{w.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { label: "Upload Paper", sub: "PDF drag-and-drop parsing", icon: <FileText size={18} /> },
              { label: "AI Analysis", sub: "Methods & dataset extraction", icon: <Cpu size={18} /> },
              { label: "Analyze Results", sub: "Scientific findings indexed", icon: <Lightbulb size={18} /> },
              { label: "Identify Gaps", sub: "Novel research opportunities", icon: <GitBranch size={18} /> },
            ].map((w) => (
              <div key={w.label} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-center hover:bg-white hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto mb-2.5">
                  {w.icon}
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#172554]">{w.label}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">{w.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        <div className="text-center mb-8">
          <h2 
            style={{ color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
            className="text-2xl sm:text-4xl font-extrabold !text-white tracking-tight drop-shadow-lg"
          >
            Features Designed for Modern Academia
          </h2>
          <p 
            style={{ color: '#E2E8F0', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            className="text-xs sm:text-sm !text-slate-200 mt-2 max-w-xl mx-auto"
          >
            Everything you need to catalog, synthesize, cite, and evaluate research papers with ease.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/92 backdrop-blur-xl border border-white/60 rounded-2xl p-5 hover:bg-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-bold mb-1 text-sm text-[#172554]">{f.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        <div className="text-center mb-8">
          <h2 
            style={{ color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
            className="text-2xl sm:text-4xl font-extrabold !text-white tracking-tight drop-shadow-lg"
          >
            How It Works
          </h2>
          <p 
            style={{ color: '#E2E8F0', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            className="text-xs sm:text-sm !text-slate-200 mt-2"
          >
            Accelerate your literature review cycle in four straightforward steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-white/92 backdrop-blur-xl border border-white/60 rounded-2xl p-5 text-center shadow-lg hover:bg-white transition-all">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center mx-auto mb-3 shadow-2xs">
                {s.num}
              </div>
              <h3 className="font-bold mb-1.5 text-sm text-[#172554]">{s.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final Call to Action ────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center relative z-10">
        <div className="bg-white/92 backdrop-blur-xl border border-white/60 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2.5 tracking-tight text-[#172554]">
            Accelerate Your Research Journey
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mb-6 leading-relaxed max-w-lg mx-auto">
            Join students, researchers, and professors using RefScan to manage citations, analyze literature, and discover unexplored research directions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => navigate("/register")} 
              className="inline-flex items-center justify-center gap-2 bg-[#5B4BDB] hover:bg-[#4938C5] text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Get Started Free <ArrowRight size={15} />
            </button>
            <button 
              onClick={() => navigate("/login")} 
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#172554] font-bold px-6 py-3 rounded-full text-xs sm:text-sm border border-slate-200 transition-all active:scale-95 cursor-pointer"
            >
              Sign In to Existing Workspace
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/20 py-8 text-center text-xs text-white/80 bg-slate-950/40 backdrop-blur-md relative z-10">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <RefScanLogo size={22} rounded="md" />
          <span className="font-bold text-sm text-white">RefScan</span>
        </div>
        <p className="leading-relaxed">
          Smart Reference & Research Assistant · Academic Research Workspace
        </p>
        <p className="text-[11px] text-white/60 mt-1">
          Designed for IEEE, APA 7th, MLA 9th & Harvard Scholarly Publishing
        </p>
      </footer>
    </div>
  );
}
