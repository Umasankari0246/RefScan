import { useNavigate } from "react-router";
import { ScanLine, FileText, Quote, Lightbulb, ArrowRight, BookOpen, Microscope, CheckCircle2, Cpu, GitBranch, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: <ScanLine size={22} />, title: "Smart Book Scanning", desc: "Scan any book's barcode to instantly retrieve complete bibliographic details and generate verified citations." },
  { icon: <BookOpen size={22} />, title: "Reference Library", desc: "Organize all your academic books, papers, and online articles in one searchable, filterable digital catalog." },
  { icon: <Quote size={22} />, title: "Citation Generator", desc: "Generate IEEE, APA 7th, MLA 9th, and Harvard references in seconds with one-click clipboard copying." },
  { icon: <FileText size={22} />, title: "Paper Analysis", desc: "Upload research PDFs and get structured breakdowns of problem statements, methodology, and findings." },
  { icon: <Lightbulb size={22} />, title: "Research Gap Detection", desc: "Identify potential unexplored areas, limitations, and future research directions automatically." },
  { icon: <GitBranch size={22} />, title: "Paper Comparison", desc: "Compare multiple research papers side-by-side across datasets, algorithms, performance, and gaps." },
];

const STEPS = [
  { num: "01", title: "Scan or Upload", desc: "Scan a physical book barcode with your camera or drag-and-drop a research PDF." },
  { num: "02", title: "Automated AI Analysis", desc: "RefScan parses the document structure, extracts citations, and identifies methods." },
  { num: "03", title: "Explore Scientific Gaps", desc: "Review algorithmic limitations and unexplored problems discovered across literature." },
  { num: "04", title: "Generate & Export", desc: "Export compliant citations and format your bibliography for publication." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-[var(--primary)] selection:text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-30 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-2xs">
            <Microscope size={17} />
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">RefScan</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate("/login")} 
            className="text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate("/register")} 
            className="text-xs sm:text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3.5 py-1.5 rounded-lg transition-all font-medium shadow-2xs cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 sm:px-8 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[var(--surface-soft)] border border-[var(--border)] rounded-full px-3.5 py-1 text-xs text-[var(--text-secondary)] font-medium mb-6">
          <Sparkles size={14} className="text-[var(--primary)]" /> AI-Powered Academic Research & Citation Workspace
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5 tracking-tight text-[var(--text-primary)]">
          Turn Books & Research Papers<br />
          <span className="text-[var(--primary)]">
            Into Structured Knowledge
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
          Scan physical books, catalog references, generate compliant IEEE/APA citations, extract deep methodologies, and uncover high-impact research gaps in a unified minimal workspace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button 
            onClick={() => navigate("/scan")} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium px-5 py-2.5 rounded-lg transition-all text-sm shadow-2xs cursor-pointer min-h-[40px]"
          >
            <ScanLine size={16} /> Start Scanning Books
          </button>
          <button 
            onClick={() => navigate("/papers")} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] font-medium px-5 py-2.5 rounded-lg transition-all border border-[var(--border)] hover:border-[var(--border-strong)] text-sm cursor-pointer min-h-[40px]"
          >
            <FileText size={16} className="text-[var(--text-muted)]" /> Analyze Research Paper
          </button>
        </div>

        {/* Workflow visual */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14">
          {[
            { label: "Book Barcode", sub: "Camera or manual scan", icon: <BookOpen size={16} /> },
            { label: "Retrieve Data", sub: "Auto-fill metadata", icon: <ArrowRight size={16} /> },
            { label: "Verify Details", sub: "Confirm publisher & year", icon: <CheckCircle2 size={16} /> },
            { label: "Instant Citation", sub: "IEEE, APA, MLA, Harvard", icon: <Quote size={16} /> },
          ].map((w) => (
            <div key={w.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--border-strong)] transition-all">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-2">
                {w.icon}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{w.label}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{w.sub}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            { label: "Upload Paper", sub: "Drag & drop PDF", icon: <FileText size={16} /> },
            { label: "AI Analysis", sub: "Methods & dataset parsing", icon: <Cpu size={16} /> },
            { label: "Analyze Results", sub: "Limitations extracted", icon: <Lightbulb size={16} /> },
            { label: "Identify Gaps", sub: "Future research directions", icon: <GitBranch size={16} /> },
          ].map((w) => (
            <div key={w.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--border-strong)] transition-all">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-2">
                {w.icon}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{w.label}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{w.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16 border-t border-[var(--border)]">
        <h2 className="text-xl sm:text-3xl font-bold text-center mb-10 tracking-tight text-[var(--text-primary)]">
          Everything You Need for Academic Productivity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-all">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-1 text-sm text-[var(--text-primary)]">{f.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16 border-t border-[var(--border)]">
        <h2 className="text-xl sm:text-3xl font-bold text-center mb-10 tracking-tight text-[var(--text-primary)]">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-primary)] font-mono font-semibold text-xs flex items-center justify-center mx-auto mb-3">
                {s.num}
              </div>
              <h3 className="font-semibold mb-1 text-sm text-[var(--text-primary)]">{s.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-16 text-center">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 shadow-2xs">
          <h2 className="text-xl sm:text-3xl font-bold mb-2.5 tracking-tight text-[var(--text-primary)]">
            Accelerate Your Research Journey
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 leading-relaxed max-w-lg mx-auto">
            Join students, researchers, and professors using RefScan to manage citations, analyze literature, and discover unexplored research directions.
          </p>
          <button 
            onClick={() => navigate("/register")} 
            className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium px-5 py-2.5 rounded-lg transition-all text-xs sm:text-sm shadow-2xs cursor-pointer"
          >
            Get Started Free <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)]">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <Microscope size={15} className="text-[var(--primary)]" />
          <span className="font-semibold text-sm text-[var(--text-primary)]">RefScan</span>
        </div>
        <p className="leading-relaxed">Smart Reference & Research Assistant · Academic Research Workspace</p>
      </footer>
    </div>
  );
}
