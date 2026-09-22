import React from "react";
import { NavLink } from "react-router";
import { LayoutDashboard, ScanLine, BookMarked, FileText, User } from "lucide-react";
import { useRefScan } from "../../context/RefScanContext";

export function MobileBottomNav() {
  const { references } = useRefScan();
  const papersCount = references.filter((r) => r.type === "PAPER").length;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 md:hidden shadow-lg select-none">
      <div className="flex items-center justify-around">
        {/* 1. Dashboard / Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] min-h-[46px] py-1 px-1.5 rounded-xl transition-colors cursor-pointer ${
              isActive ? "text-[var(--primary)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span className="text-[11px] mt-1 font-semibold leading-none">Home</span>
        </NavLink>

        {/* 2. References Library */}
        <NavLink
          to="/references"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] min-h-[46px] py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer ${
              isActive ? "text-[var(--primary)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`
          }
        >
          <div className="relative">
            <BookMarked size={20} />
            {references.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                {references.length}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 font-semibold leading-none">Library</span>
        </NavLink>

        {/* 3. CENTER PROMINENT SCAN BUTTON (Touch-optimized 48px) */}
        <NavLink
          to="/scan"
          className={() =>
            `flex flex-col items-center justify-center -mt-5 cursor-pointer group`
          }
          aria-label="Scan Book Barcode"
        >
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 border-2 border-[var(--surface)] group-active:scale-95 transition-transform">
            <ScanLine size={22} />
          </div>
          <span className="text-[10.5px] font-bold text-[var(--primary)] mt-1 leading-none">
            Scan
          </span>
        </NavLink>

        {/* 4. Research Papers */}
        <NavLink
          to="/papers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] min-h-[46px] py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer ${
              isActive ? "text-[var(--primary)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`
          }
        >
          <div className="relative">
            <FileText size={20} />
            {papersCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                {papersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 font-semibold leading-none">Papers</span>
        </NavLink>

        {/* 5. More / Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] min-h-[46px] py-1 px-1.5 rounded-xl transition-colors cursor-pointer ${
              isActive ? "text-[var(--primary)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`
          }
        >
          <User size={20} />
          <span className="text-[11px] mt-1 font-semibold leading-none">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
