import React, { useState, useRef } from "react";
import { Check, Copy, X, AlertCircle, CheckCircle2, Info, ChevronDown, Loader2 } from "lucide-react";

// ── Badge ──────────────────────────────────────────────────────────────────
export type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple" | "cyan" | "outline" | "indigo";

export function Badge({ 
  children, 
  variant = "default", 
  className = "" 
}: { 
  children: React.ReactNode; 
  variant?: BadgeVariant; 
  className?: string 
}) {
  const map: Record<BadgeVariant, string> = {
    default: "bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border border-[var(--badge-indigo-border)]",
    indigo: "bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border border-[var(--badge-indigo-border)]",
    success: "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border border-[var(--badge-emerald-border)]",
    warning: "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border border-[var(--badge-amber-border)]",
    error: "bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border border-[var(--badge-rose-border)]",
    info: "bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] border border-[var(--badge-sky-border)]",
    purple: "bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border border-[var(--badge-purple-border)]",
    cyan: "bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] border border-[var(--badge-sky-border)]",
    outline: "border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface)]",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-medium tracking-normal ${map[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ── GapStrengthBadge ────────────────────────────────────────────────────────
export function GapBadge({ strength }: { strength: "strong" | "moderate" | "emerging" }) {
  const map = { 
    strong: "bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border border-[var(--badge-rose-border)]", 
    moderate: "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border border-[var(--badge-amber-border)]", 
    emerging: "bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border border-[var(--badge-purple-border)]" 
  };
  const label = strength === "strong" ? "Strong Potential" : strength === "moderate" ? "Moderate Potential" : "Emerging Area";
  return (
    <span className={`text-[11.5px] font-medium px-2.5 py-0.5 rounded-md border ${map[strength]}`}>
      💡 {label}
    </span>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────
export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "gradient";
export type BtnSize = "sm" | "md" | "lg";

export function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  className = "", 
  disabled, 
  loading,
  onClick, 
  type = "button" 
}: { 
  children: React.ReactNode; 
  variant?: BtnVariant; 
  size?: BtnSize; 
  className?: string; 
  disabled?: boolean; 
  loading?: boolean;
  onClick?: () => void; 
  type?: "button" | "submit" | "reset" 
}) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-2xs border border-transparent active:scale-[0.99] font-medium",
    gradient: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-2xs border border-transparent active:scale-[0.99] font-medium",
    secondary: "bg-[var(--primary-soft)] text-[var(--primary-soft-text)] hover:opacity-90 border border-[var(--primary-soft-border)] active:scale-[0.99] font-medium",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium",
    danger: "bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] hover:opacity-90 border border-[var(--badge-rose-border)] active:scale-[0.99] font-medium",
    outline: "border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] bg-[var(--surface)] active:scale-[0.99] font-medium",
  };

  const s: Record<BtnSize, string> = { 
    sm: "text-xs px-3 py-1.5 min-h-[36px] sm:min-h-[32px] gap-1.5 rounded-lg", 
    md: "text-sm px-4 py-2 min-h-[44px] sm:min-h-[38px] gap-2 rounded-xl", 
    lg: "text-sm sm:text-base px-5 py-2.5 min-h-[48px] sm:min-h-[42px] gap-2.5 rounded-xl font-semibold" 
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled || loading} 
      className={`inline-flex items-center justify-center transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation ${v[variant]} ${s[size]} ${className}`}
    >
      {loading && <Loader2 size={15} className="animate-spin mr-1.5" />}
      {children}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ 
  children, 
  className = "", 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void 
}) {
  const hasPadding = /p-\d|py-\d|px-\d|p-0/.test(className);
  const paddingClass = hasPadding ? "" : "p-5 sm:p-6";
  
  return (
    <div 
      onClick={onClick} 
      className={`bg-[var(--surface)] backdrop-blur-md text-[var(--text-primary)] rounded-xl border border-[var(--border)] shadow-xs transition-all duration-150 ${paddingClass} ${
        onClick ? "cursor-pointer hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:shadow-sm" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = "text", 
  icon, 
  required,
  className = "" 
}: { 
  label?: string; 
  placeholder?: string; 
  value?: string; 
  onChange?: (v: string) => void; 
  type?: string; 
  icon?: React.ReactNode; 
  required?: boolean; 
  className?: string 
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-[var(--text-primary)] tracking-normal flex items-center gap-1.5">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full min-h-[44px] sm:min-h-[38px] rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 text-base sm:text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors ${
            icon ? "pl-10" : ""
          }`}
        />
      </div>
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────
export function Textarea({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  rows = 4, 
  required,
  className = "" 
}: { 
  label?: string; 
  placeholder?: string; 
  value?: string; 
  onChange?: (v: string) => void; 
  rows?: number; 
  required?: boolean; 
  className?: string; 
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-[var(--text-primary)] tracking-normal flex items-center gap-1.5">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}
      <textarea 
        rows={rows} 
        value={value} 
        onChange={(e) => onChange?.(e.target.value)} 
        placeholder={placeholder} 
        required={required}
        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3.5 text-base sm:text-sm text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] resize-none transition-colors leading-relaxed min-h-[90px]" 
      />
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({ 
  label, 
  options, 
  value, 
  onChange, 
  className = "" 
}: { 
  label?: string; 
  options: { label: string; value: string }[]; 
  value: string; 
  onChange: (v: string) => void; 
  className?: string 
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-[13px] font-medium text-[var(--text-primary)]">{label}</label>}
      <div className="relative">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full min-h-[44px] sm:min-h-[38px] appearance-none rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 pr-9 text-base sm:text-sm font-medium text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] cursor-pointer transition-colors"
        >
          {options.map((o, idx) => (
            <option key={`${o.value}_${idx}`} value={o.value} className="bg-[var(--surface)] text-[var(--text-primary)]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
      </div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────
export function Tabs({ 
  tabs, 
  active, 
  onChange 
}: { 
  tabs: string[]; 
  active: string; 
  onChange: (t: string) => void 
}) {
  return (
    <div className="flex gap-4 sm:gap-6 border-b border-[var(--border)] w-full mb-5 overflow-x-auto select-none">
      {tabs.map((t) => (
        <button 
          key={t} 
          type="button"
          onClick={() => onChange(t)} 
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap cursor-pointer ${
            active === t 
              ? "border-[var(--primary)] text-[var(--primary)] font-semibold" 
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── CopyBox ────────────────────────────────────────────────────────────────
export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const cleanText = text.replace(/<[^>]+>/g, "");
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group bg-[var(--surface-soft)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] leading-relaxed font-mono">
      <div dangerouslySetInnerHTML={{ __html: text }} />
      <button 
        onClick={copy} 
        className="absolute top-3 right-3 p-1.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
        title="Copy citation"
      >
        {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }: { message: string; type?: "success" | "error" | "info"; onClose: () => void }) {
  const icons = { 
    success: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />, 
    error: <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />, 
    info: <Info size={16} className="text-[var(--primary)]" /> 
  };
  return (
    <div className="flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border)] shadow-md rounded-lg px-3.5 py-2.5 min-w-[260px] text-[var(--text-primary)] text-sm font-medium">
      {icons[type]}
      <span className="flex-1 text-[13.5px]">{message}</span>
      <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X size={14} /></button>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-11 h-11 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ── StatCard (Premium Academic Overview KPI Card) ──────────────────────────
export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "indigo" | "violet" | "blue" | "amber" | "emerald";
  color?: string;
  trend?: string;
  badge?: string;
  subtext?: string;
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon, 
  accent = "indigo",
  badge,
  subtext,
  trend,
  className = ""
}: StatCardProps) {
  const accentTopBorder = {
    indigo: "border-t-[3px] border-t-[#5B4BDB]",
    violet: "border-t-[3px] border-t-[#8B5CF6]",
    blue: "border-t-[3px] border-t-[#3B82F6]",
    amber: "border-t-[3px] border-t-[#F59E0B]",
    emerald: "border-t-[3px] border-t-[#10B981]",
  };

  const iconBg = {
    indigo: "bg-[#EEF0FF] text-[#5B4BDB] border border-[#DDD8FE]",
    violet: "bg-[#F5F3FF] text-[#7C3AED] border border-[#E9D5FF]",
    blue: "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]",
    amber: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]",
    emerald: "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]",
  };

  return (
    <div className={`rounded-[18px] bg-[var(--surface)] backdrop-blur-md border border-[var(--border)] ${accentTopBorder[accent]} p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between h-full ${className}`}>
      {/* Top row: Label & Icon Container */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs sm:text-[13px] font-semibold text-[var(--text-secondary)] tracking-normal">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${iconBg[accent]}`}>
          {icon}
        </div>
      </div>

      {/* Main Value */}
      <div className="my-1.5">
        <div className="text-2xl sm:text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>

      {/* Bottom Meta Link / Badge */}
      {(trend || badge) && (
        <div className="pt-2.5 mt-2.5 border-t border-[var(--border-soft)] flex items-center justify-between text-xs">
          {badge && (
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-md border border-[var(--border)]">
              {badge}
            </span>
          )}
          {trend && (
            <span className="text-[12px] font-semibold text-[var(--primary)] group-hover:underline flex items-center gap-1 transition-colors ml-auto">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ 
  open, 
  isOpen,
  onClose, 
  title, 
  maxWidth,
  className = "",
  children 
}: { 
  open?: boolean; 
  isOpen?: boolean;
  onClose: () => void; 
  title: string; 
  maxWidth?: string;
  className?: string;
  children: React.ReactNode 
}) {
  const isVisible = open !== undefined ? open : !!isOpen;
  if (!isVisible) return null;
  const widthClass = maxWidth || "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 select-none safe-top safe-bottom">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-2xs" onClick={onClose} />
      <div className={`relative bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl shadow-2xl w-full max-w-[calc(100vw-1.25rem)] ${widthClass} max-h-[88vh] overflow-y-auto border border-[var(--border)] animate-in zoom-in-95 duration-100 ${className}`}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-soft)] sticky top-0 z-10">
          <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate pr-2">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

// ── BookCover ──────────────────────────────────────────────────────────────
export function BookCover({ title, color, size = "md" }: { title: string; color: string; size?: "sm" | "md" | "lg" }) {
  const s = { 
    sm: "w-10 h-13 rounded border border-black/10", 
    md: "w-14 h-20 rounded-md border border-black/10", 
    lg: "w-20 h-28 rounded-lg border border-black/10" 
  };
  const initials = title.split(" ").filter(w => w.length > 3).slice(0, 2).map(w => w[0]).join("") || title.slice(0, 2).toUpperCase();
  return (
    <div 
      className={`${s[size]} flex flex-col justify-between p-1.5 text-white font-medium flex-shrink-0 border-l-[3px] border-white/20 relative overflow-hidden select-none`} 
      style={{ background: `linear-gradient(135deg, ${color}, ${color}ee)` }}
    >
      <span className={`block font-semibold break-all leading-tight ${size === "sm" ? "text-[8px]" : size === "lg" ? "text-xs" : "text-[9.5px]"}`}>
        {initials}
      </span>
      <div className="flex justify-end">
        <span className="w-1 h-1.5 bg-white/30 rounded-2xs" />
      </div>
    </div>
  );
}

// ── FileDropzone ───────────────────────────────────────────────────────────
export function FileDropzone({ onFile, accept = ".pdf", label = "Drag & drop research paper here" }: { onFile: (f: File) => void; accept?: string; label?: string }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`border border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-colors ${
        drag 
          ? "border-[var(--primary)] bg-[var(--primary-soft)]" 
          : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="w-11 h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center mx-auto mb-2.5 text-[var(--primary)] shadow-2xs">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">or tap to select from device storage — PDF up to 50MB</p>
    </div>
  );
}

// ── SearchBar ──────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full min-h-[44px] sm:min-h-[38px] pl-10 pr-3.5 py-2 text-base sm:text-sm rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors" 
      />
    </div>
  );
}

// ── TagList ────────────────────────────────────────────────────────────────
export function TagList({ 
  tags = [], 
  color = "indigo" 
}: { 
  tags?: string[]; 
  color?: "indigo" | "violet" | "emerald" | "amber" | "sky" 
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border border-[var(--badge-indigo-border)]",
    violet: "bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border border-[var(--badge-purple-border)]",
    emerald: "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border border-[var(--badge-emerald-border)]",
    amber: "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border border-[var(--badge-amber-border)]",
    sky: "bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] border border-[var(--badge-sky-border)]",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className={`text-xs font-medium px-2 py-0.5 rounded-md ${colorMap[color] || colorMap.indigo}`}>
          {t}
        </span>
      ))}
    </div>
  );
}
