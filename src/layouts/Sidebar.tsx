import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, ScanLine, BookMarked, Quote, FileText,
  FlaskConical, Lightbulb, Bookmark, BookmarkCheck, BarChart3, Settings,
  HelpCircle, LogOut, Microscope,
  Globe, Layers, Database, X, PanelLeftClose, PanelLeftOpen, CheckSquare
} from "lucide-react";
import { useRefScan } from "../context/RefScanContext";
import { PaperReference } from "../types";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onToggle, isMobile, onCloseMobile }: Props) {
  const navigate = useNavigate();
  const { references, stagedReferences, citationPapers, currentUser, logout } = useRefScan();

  const papersCount = references.filter((r) => r.type === "PAPER").length;
  const stagedCount = stagedReferences.length;
  const citationPapersCount = citationPapers.length;
  const gapsCount = references.filter((r) => r.type === "PAPER").reduce(
    (acc, r) => acc + ((r as PaperReference).researchGaps?.length || 0), 
    0
  );

  const navGroups = [
    {
      group: "Workspace",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/scan", icon: ScanLine, label: "Scan Book" },
        { to: "/collection", icon: CheckSquare, label: "Reference Collection", count: stagedCount },
        { to: "/references", icon: BookMarked, label: "Reference Library", count: references.length },
        { to: "/citations", icon: Quote, label: "Citation Studio" },
        { to: "/saved-citations", icon: BookmarkCheck, label: "Saved Citations", count: citationPapersCount },
      ]
    },
    {
      group: "Research Lab",
      items: [
        { to: "/papers", icon: FileText, label: "Research Papers", count: papersCount },
        { to: "/gaps", icon: Lightbulb, label: "Research Gaps", count: gapsCount, isGapBadge: true },
        { to: "/compare", icon: Layers, label: "Compare Papers" },
        { to: "/sites", icon: Globe, label: "Research Portals" },
        { to: "/saved", icon: Bookmark, label: "Saved Papers" },
        { to: "/insights", icon: BarChart3, label: "Research Insights" },
      ]
    },
    {
      group: "System",
      items: [
        { to: "/settings", icon: Settings, label: "Settings" },
        { to: "/help", icon: HelpCircle, label: "Documentation" },
      ]
    }
  ];

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`flex flex-col h-full bg-[#F8F7FF] border-r border-[#E6E9F8] transition-all duration-200 ease-in-out flex-shrink-0 select-none relative z-30 ${
        isMobile ? "w-[280px] max-w-[85vw]" : collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* ── Brand Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E6E9F8] flex-shrink-0 bg-white/60 backdrop-blur-xs">
        {!collapsed || isMobile ? (
          <div 
            onClick={() => {
              navigate("/dashboard");
              handleLinkClick();
            }}
            className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1"
          >
            <div className="w-8 h-8 rounded-xl bg-[#5B4BDB] flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Microscope size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#172554] font-bold text-base tracking-tight">RefScan</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE]">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] font-medium truncate">Academic Workspace</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={onToggle}
            className="w-9 h-9 rounded-xl bg-[#5B4BDB] flex items-center justify-center mx-auto text-white shadow-sm shadow-indigo-500/20 cursor-pointer hover:opacity-90 transition-opacity"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <Microscope size={18} />
          </button>
        )}

        {/* Toggle / Close Buttons */}
        {isMobile ? (
          <button 
            onClick={onCloseMobile}
            className="w-11 h-11 rounded-xl text-[#64748B] hover:text-[#172554] hover:bg-white active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Close menu"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        ) : !collapsed ? (
          <button 
            onClick={onToggle} 
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#5B4BDB] hover:bg-white transition-colors cursor-pointer flex items-center justify-center"
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        ) : null}
      </div>

      {/* ── Collapsed Quick Expand Bar ────────────────────────────────────────── */}
      {collapsed && !isMobile && (
        <div className="px-2 pt-2">
          <button
            onClick={onToggle}
            className="w-full py-1.5 rounded-lg text-[#64748B] hover:text-[#5B4BDB] hover:bg-white flex items-center justify-center transition-colors cursor-pointer"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation Items ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3.5 px-3 flex flex-col gap-4 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {(!collapsed || isMobile) && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-2 mb-1.5">
                {group.group}
              </p>
            )}
            
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, icon: Icon, label, count, isGapBadge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-150 group relative min-h-[44px] ${
                      isActive
                        ? "bg-[#EEF0FF] text-[#5B4BDB] font-semibold border-l-[3px] border-[#5B4BDB] shadow-xs pl-2.5"
                        : "text-[#475569] hover:text-[#172554] hover:bg-white font-medium active:bg-[#EEF0FF]/50"
                    } ${collapsed && !isMobile ? "justify-center px-0 py-2.5 min-h-[38px]" : ""}`
                  }
                  title={collapsed && !isMobile ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0 transition-colors group-hover:text-[#5B4BDB]" />
                  
                  {(!collapsed || isMobile) && (
                    <span className="truncate flex-1">{label}</span>
                  )}

                  {(!collapsed || isMobile) && count !== undefined && count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${
                      isGapBadge 
                        ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" 
                        : "bg-white text-[#5B4BDB] border-[#DDD8FE]"
                    }`}>
                      {count}
                    </span>
                  )}

                  {/* Minimal Floating Tooltip in Collapsed Mode */}
                  {collapsed && !isMobile && (
                    <div className="fixed left-[76px] ml-1.5 hidden group-hover:flex items-center z-50 pointer-events-none animate-in fade-in duration-100">
                      <div className="bg-[#172554] text-white border border-[#334155] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2">
                        <span>{label}</span>
                        {count !== undefined && count > 0 && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">({count})</span>
                        )}
                      </div>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Workspace Storage Sync Indicator */}
        {(!collapsed || isMobile) && (
          <div className="mt-auto px-1 pt-2">
            <div className="bg-white border border-[#E6E9F8] rounded-xl p-3 text-[#475569] space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#172554] font-semibold">
                  <Database size={13} className="text-[#5B4BDB]" /> Storage Sync
                </span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B]">
                {references.length} bibliographic records saved
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* ── Footer / Profile ───────────────────────────────────────── */}
      <div className="p-3 border-t border-[#E6E9F8] flex-shrink-0 bg-white/40">
        <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-[#E6E9F8] bg-white shadow-2xs ${collapsed && !isMobile ? "justify-center px-0" : ""}`}>
          <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE] flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase">
            {currentUser?.name ? currentUser.name[0] : "U"}
          </div>

          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-[#172554] truncate">{currentUser?.name || "Researcher"}</p>
                {currentUser?.role === "admin" && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email || "user@refscan.app"}</p>
            </div>
          )}

          {(!collapsed || isMobile) && (
            <button 
              onClick={async () => {
                await logout();
                navigate("/login");
              }} 
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
