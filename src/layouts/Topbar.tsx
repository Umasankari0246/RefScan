import { useState } from "react";
import { Bell, Search, Menu, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRefScan } from "../context/RefScanContext";

interface Props {
  title?: string;
  breadcrumb?: string[];
  collapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
}

export default function Topbar({ breadcrumb, collapsed, onToggleSidebar, onOpenMobileMenu }: Props) {
  const { notifications, markAllNotificationsRead, backendStatus } = useRefScan();
  const [showNotif, setShowNotif] = useState(false);
  const [search, setSearch] = useState("");
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-15 flex items-center justify-between px-5 sm:px-7 border-b border-[#E2E8F0] bg-white flex-shrink-0 z-20 sticky top-0 shadow-2xs">
      {/* Left: Sidebar Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Menu Button */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-[#64748B] hover:text-[#172554] hover:bg-[#F3F5FF] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Open Navigation Menu"
          >
            <Menu size={19} />
          </button>
        )}

        {/* Desktop Sidebar Collapse/Expand Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-xl text-[#64748B] hover:text-[#5B4BDB] hover:bg-[#F3F5FF] transition-colors cursor-pointer items-center justify-center"
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 text-sm font-medium text-[#64748B] truncate">
          <span className="text-[#172554] font-bold tracking-tight text-[14px]">RefScan</span>
          {breadcrumb && breadcrumb.length > 0 && (
            <>
              <ChevronRight size={14} className="text-[#94A3B8] flex-shrink-0" />
              {breadcrumb.map((crumb, idx) => (
                <span key={crumb} className="flex items-center gap-2 truncate">
                  <span className={idx === breadcrumb.length - 1 ? "text-[#5B4BDB] font-semibold truncate" : "text-[#64748B] truncate"}>
                    {crumb}
                  </span>
                  {idx < breadcrumb.length - 1 && <ChevronRight size={14} className="text-[#94A3B8] flex-shrink-0" />}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Live Backend Connection Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{backendStatus === "online" ? "API Live Connected" : "Local Prototype Mode"}</span>
        </div>

        {/* Search Box */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Quick search library, ISBN, DOI..." 
            className="pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#E2E8F0] bg-[#F3F5FF] text-[#172554] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]/20 focus:border-[#5B4BDB] focus:bg-white w-44 lg:w-60 min-h-[36px] transition-all" 
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotif((p) => !p)} 
            className="relative p-2 rounded-xl text-[#64748B] hover:text-[#5B4BDB] hover:bg-[#F3F5FF] transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-[#E2E8F0]"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#5B4BDB] rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden text-[#172554] animate-in fade-in duration-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8F7FF]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#172554]">Notifications</span>
                  {unread > 0 && (
                    <span className="text-[11px] bg-[#EEF0FF] text-[#5B4BDB] font-bold px-2 py-0.2 rounded-full border border-[#DDD8FE]">
                      {unread} new
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-[#5B4BDB] hover:underline font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9] custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#94A3B8]">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-[#F8F7FF] transition-colors flex items-start gap-3 ${
                        !n.read ? "bg-[#F3F5FF]/60" : ""
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#5B4BDB] mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#172554] leading-snug">{n.title}</p>
                        <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-[#94A3B8] mt-1 block">{n.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
