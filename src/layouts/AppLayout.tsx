import { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Menu, Microscope, Search, ScanLine, Plus } from "lucide-react";
import Sidebar from "./Sidebar";
import { MobileBottomNav } from "../components/common/MobileBottomNav";
import { RefScanChatbot } from "../components/chat/RefScanChatbot";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("refscan_sidebar_collapsed");
    return saved === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("refscan_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Dynamic mobile header title
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path.startsWith("/scan")) return "Scan Book";
    if (path.startsWith("/collection")) return "Collection";
    if (path.startsWith("/references/") && path !== "/references") return "Reference Details";
    if (path.startsWith("/references")) return "Library";
    if (path.startsWith("/citations")) return "Citation Studio";
    if (path.startsWith("/saved-citations")) return "Saved Citations";
    if (path.startsWith("/papers")) return "Research Papers";
    if (path.startsWith("/gaps")) return "Research Gaps";
    if (path.startsWith("/compare")) return "Compare Papers";
    if (path.startsWith("/sites")) return "Research Portals";
    if (path.startsWith("/saved")) return "Saved Papers";
    if (path.startsWith("/insights")) return "Insights";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/help")) return "Documentation";
    if (path.startsWith("/book/")) return "Book Details";
    if (path.startsWith("/upload")) return "Upload PDF";
    return "RefScan";
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200 no-print" 
          onClick={() => setMobileOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* Sidebar: Desktop collapsible & Mobile drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 md:relative md:flex md:flex-col transition-all duration-300 ease-out no-print ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar 
          collapsed={collapsed} 
          onToggle={toggleSidebar} 
          isMobile={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg-primary)]">
        {/* Mobile Header with Safe Area support (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between px-3 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] flex-shrink-0 z-20 no-print">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-11 h-11 rounded-xl text-[#64748B] hover:text-[#172554] hover:bg-[#F3F5FF] active:scale-95 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
            <div 
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 min-w-0 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#5B4BDB] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Microscope size={15} />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 truncate">
                <span className="text-[#172554] font-bold text-sm tracking-tight flex-shrink-0">RefScan</span>
                <span className="text-[#CBD5E1] text-xs">/</span>
                <span className="text-xs font-semibold text-[#64748B] truncate">{pageTitle}</span>
              </div>
            </div>
          </div>

          {/* Contextual Quick Action */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {location.pathname !== "/scan" && (
              <button
                onClick={() => navigate("/scan")}
                className="w-10 h-10 rounded-xl text-[#5B4BDB] hover:bg-[#EEF0FF] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Scan Book Barcode"
                aria-label="Scan Book Barcode"
              >
                <ScanLine size={18} />
              </button>
            )}
            {location.pathname !== "/references" && (
              <button
                onClick={() => navigate("/references")}
                className="w-10 h-10 rounded-xl text-[#64748B] hover:text-[#172554] hover:bg-[#F3F5FF] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Search Library"
                aria-label="Search Library"
              >
                <Search size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Content Area with dynamic bottom clearance for Mobile Bottom Nav */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-7 lg:p-9 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 custom-scrollbar overflow-x-hidden">
          <Outlet />
        </main>

        {/* Global Floating AI Academic Chatbot */}
        <div className="no-print">
          <RefScanChatbot />
        </div>

        {/* Mobile Fixed Bottom Nav Bar */}
        <div className="no-print">
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
