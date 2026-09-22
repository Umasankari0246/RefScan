import { useState } from "react";
import { SearchBar, Card } from "../components/ui";
import { ChevronDown, ChevronUp, ScanLine, FileText, Quote, Lightbulb, MessageCircle, HelpCircle } from "lucide-react";

const FAQ = [
  { q: "How do I scan a book?", a: "Navigate to 'Scan Book' in the sidebar. Click 'Start Scanning' to activate the camera and point it at the barcode on the back cover. You can also enter the ISBN manually." },
  { q: "Which citation styles are supported?", a: "RefScan supports IEEE, APA, MLA, and Harvard citation styles. You can set your default style in Settings." },
  { q: "How does research paper analysis work?", a: "Upload a PDF research paper. RefScan extracts the text and uses AI to identify the research problem, methodology, limitations, and potential research gaps." },
  { q: "What is a Research Gap?", a: "A research gap is an area or question that has not been fully explored in existing literature. RefScan identifies these as 'potential' gaps — you should validate them with your own literature review." },
  { q: "Can I compare multiple papers?", a: "Yes. Navigate to 'Compare Papers' and select 2–3 papers to view a side-by-side comparison of their research problems, methods, technologies, and gaps." },
  { q: "Is my data stored securely?", a: "RefScan processes documents securely with local indexed storage and connected backend intelligence. Your literature records remain private to your session." },
];

const GUIDES = [
  { icon: <ScanLine size={20} />, title: "How to Scan a Book", steps: ["Go to Scan Book in the sidebar", "Click Start Scanning to activate the camera", "Point at the ISBN barcode on the back cover", "Wait for ISBN detection, then verify book details", "Click Save Reference to add to your library"] },
  { icon: <FileText size={20} />, title: "How to Upload & Analyze a Paper", steps: ["Go to Research Papers", "Drag and drop your PDF or click Choose PDF", "Wait for the analysis to complete (7 stages)", "View the full analysis including research gaps", "Explore potential research directions"] },
  { icon: <Quote size={20} />, title: "Generating Citations", steps: ["Go to Citation Generator", "Select an existing reference OR enter details manually", "Choose your citation style (IEEE / APA / MLA / Harvard)", "Copy the generated citation", "Use it in your assignment, paper, or report"] },
  { icon: <Lightbulb size={20} />, title: "Understanding Research Gaps", steps: ["Upload and analyze at least one research paper", "Navigate to Research Gaps to see identified gaps", "Each gap has a strength indicator (Strong / Moderate / Emerging)", "Use gaps as starting points for your own literature review", "Always verify gaps through independent research"] },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaq = FAQ.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
          <HelpCircle size={15} /> Knowledge Center
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Help & Documentation</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
          Find answers to common questions and learn how to get the most out of RefScan.
        </p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search help guides and questions…" />

      {/* Guides */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-4 tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
          How-to Guides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {GUIDES.map((g) => (
            <Card key={g.title} className="p-5 sm:p-6 space-y-3 hover:border-[var(--primary)] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                  {g.icon}
                </div>
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)]">{g.title}</p>
              </div>
              <ol className="space-y-2 pt-1">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-4 tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          Frequently Asked Questions
        </h3>
        <div className="space-y-2.5">
          {filteredFaq.map((f, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)} 
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">{f.q}</p>
                {openFaq === i ? <ChevronUp size={16} className="text-[var(--primary)] flex-shrink-0" /> : <ChevronDown size={16} className="text-[var(--text-muted)] flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-[var(--border)]">
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{f.a}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Contact */}
      <Card className="p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
            <MessageCircle size={16} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Contact Support</h3>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Can't find what you're looking for or need help with a custom citation format or research workflow? Get in touch with our team.
        </p>
        <a 
          href="mailto:support@refscan.app" 
          className="inline-block text-xs sm:text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] underline"
        >
          support@refscan.app
        </a>
      </Card>
    </div>
  );
}
