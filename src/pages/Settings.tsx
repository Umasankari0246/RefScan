import { useState, useRef, useEffect } from "react";
import { 
  User, Quote, Palette, Bell, Database, Camera, Check, 
  Settings as SettingsIcon, Download, Upload, Trash2, 
  RefreshCw, Server, AlertTriangle, ShieldCheck 
} from "lucide-react";
import { Card, Button, Input, Select, Tabs, Modal, Badge } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { generateBatchBibliography, downloadCitationFile } from "../services/citationService";
import { apiClient } from "../services/apiClient";

export default function Settings() {
  const { references, addReference, backendStatus, backendHealth, checkBackendHealth } = useRefScan();

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("refscan_profile");
    return saved ? JSON.parse(saved) : { name: "Dr. Elena Vance", email: "elena.vance@mit.edu", title: "Principal Academic Researcher" };
  });

  const [citStyle, setCitStyle] = useState(() => {
    return localStorage.getItem("refscan_default_style") || "IEEE";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("refscan_theme_mode") || "System";
  });
  const [notifs, setNotifs] = useState({ analysisComplete: true, newGap: true, weeklyDigest: false });
  const [saved, setSaved] = useState(false);
  
  // Backend ping state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: string; count: number; time: string; dbMode?: string } | null>(null);

  // Clear modal state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("refscan_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("refscan_default_style", citStyle);
  }, [citStyle]);

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    localStorage.setItem("refscan_theme_mode", selectedTheme);
    if (selectedTheme === "Dark") {
      document.documentElement.classList.add("dark");
    } else if (selectedTheme === "Light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System mode: remove explicit class to let prefers-color-scheme media query handle it automatically
      document.documentElement.classList.remove("dark");
    }
  };

  const save = () => {
    setSaved(true);
    setToastMsg("All workspace preferences updated successfully.");
    setTimeout(() => {
      setSaved(false);
      setToastMsg("");
    }, 3000);
  };

  const handleExportData = (format: "bib" | "json" | "csv" | "ris") => {
    if (references.length === 0) {
      alert("No references found in library to export.");
      return;
    }
    const content = generateBatchBibliography(references, citStyle as any, format);
    const ext = format === "bib" ? ".bib" : format === "json" ? ".json" : format === "csv" ? ".csv" : ".ris";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `refscan_backup_${Date.now()}${ext}`, mime);
    setToastMsg(`Exported library as ${format.toUpperCase()} successfully.`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          let count = 0;
          parsed.forEach((item: any) => {
            if (item.title && item.type) {
              addReference(item);
              count++;
            }
          });
          setToastMsg(`Successfully imported ${count} references from backup file!`);
          setTimeout(() => setToastMsg(""), 4000);
        } else {
          alert("Invalid backup format. Expected an array of references.");
        }
      } catch {
        alert("Failed to parse JSON file. Please ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    localStorage.removeItem("refscan_references");
    localStorage.removeItem("refscan_notifications");
    localStorage.removeItem("refscan_staged_references");
    localStorage.removeItem("refscan_citation_papers");
    localStorage.setItem("refscan_references", JSON.stringify([]));
    setClearModalOpen(false);
    setToastMsg("Workspace library cleared.");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleTestBackend = async () => {
    setPinging(true);
    try {
      const health = await apiClient.checkHealth();
      await checkBackendHealth();
      setPingResult({
        status: health.status,
        count: health.libraryCount,
        time: new Date().toLocaleTimeString(),
        dbMode: health.database?.status === "connected" 
          ? `MongoDB Active (${health.database.databaseName || "refscan"} @ ${health.database.host || "127.0.0.1:27017"})` 
          : "In-Memory Store (Fallback)"
      });
      setToastMsg(
        health.database?.status === "connected"
          ? "MongoDB Server & RefScan API connection verified: Online ✓"
          : "Backend API online in In-Memory fallback mode."
      );
    } catch {
      setPingResult({
        status: "offline",
        count: 0,
        time: new Date().toLocaleTimeString(),
        dbMode: "Offline"
      });
    } finally {
      setPinging(false);
      setTimeout(() => setToastMsg(""), 3500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
          <SettingsIcon size={15} /> Workspace Preferences
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
          Manage your research profile, citation defaults, workspace preferences, and data.
        </p>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> {toastMsg}
        </div>
      )}

      {/* Profile */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[var(--primary)] flex items-center justify-center">
            <User size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Researcher Profile</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-base font-semibold shadow-2xs">
            {profile.name ? profile.name[0] : "R"}
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--text-primary)] block">{profile.name}</span>
            <span className="text-xs text-[var(--text-muted)] block">{profile.title}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Input label="Full Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
          <Input label="Email Address" type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
          <div className="sm:col-span-2">
            <Input label="Academic Affiliation / Title" value={profile.title} onChange={(v) => setProfile({ ...profile, title: v })} />
          </div>
        </div>
      </Card>

      {/* Citation */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[var(--primary)] flex items-center justify-center">
            <Quote size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Citation Preferences</h3>
        </div>
        <div className="max-w-md">
          <Select 
            label="Default Citation Style" 
            options={[
              { label: "IEEE Style", value: "IEEE" }, 
              { label: "APA 7th Edition", value: "APA" }, 
              { label: "MLA 9th Edition", value: "MLA" }, 
              { label: "Harvard Style", value: "Harvard" }
            ]} 
            value={citStyle} 
            onChange={setCitStyle} 
          />
        </div>
      </Card>

      {/* Backend & MongoDB Connection Diagnostics */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#172554]">Backend & MongoDB Database Status</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Persistent database connection, REST API endpoints, and collection metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={backendHealth?.database?.status === "connected" ? "success" : backendStatus === "online" ? "indigo" : "warning"} 
              className="text-xs font-semibold"
            >
              {backendHealth?.database?.status === "connected" 
                ? "MongoDB Connected ✓" 
                : backendStatus === "online" 
                ? "API Online (In-Memory)" 
                : "Offline"}
            </Badge>
          </div>
        </div>

        <div className="p-4 bg-[#F8F7FF] rounded-2xl border border-[#E6E9F8] space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">Database Mode:</span>
            <span className={`font-semibold px-2.5 py-0.5 rounded-lg border text-xs ${
              backendHealth?.database?.status === "connected"
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-amber-700 bg-amber-50 border-amber-200"
            }`}>
              {backendHealth?.database?.status === "connected" ? "MongoDB Server (Active & Persistent)" : "In-Memory Fallback"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">Connection Host:</span>
            <span className="font-mono text-[#172554] font-semibold">{backendHealth?.database?.host || "127.0.0.1:27017"}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">Database Name:</span>
            <span className="font-mono text-[#5B4BDB] font-bold">{backendHealth?.database?.databaseName || "refscan"}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">MongoDB Collections:</span>
            <div className="flex gap-2 font-mono text-xs">
              <span className="bg-white px-2 py-0.5 rounded border border-[#E6E9F8] text-[#172554]">
                references: <strong>{backendHealth?.database?.collections?.references ?? references.length}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-[#E6E9F8] text-[#172554]">
                papers: <strong>{backendHealth?.database?.collections?.papers ?? 0}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-[#E6E9F8] text-[#172554]">
                citations: <strong>{backendHealth?.database?.collections?.citationPapers ?? 0}</strong>
              </span>
            </div>
          </div>

          {pingResult && (
            <div className="flex justify-between pt-2 border-t border-[#E6E9F8] text-emerald-700 font-medium">
              <span>Last Verified Ping:</span>
              <span className="font-mono">{pingResult.time} ({pingResult.status}) - {pingResult.dbMode}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button 
            onClick={handleTestBackend} 
            variant="outline" 
            size="sm" 
            disabled={pinging}
            className="font-semibold text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${pinging ? "animate-spin" : ""}`} />
            {pinging ? "Testing Connection..." : "Test Database Connection"}
          </Button>
          <span className="text-[11px] text-[#64748B]">Connection String: <code className="text-[#5B4BDB] font-mono">mongodb://127.0.0.1:27017/refscan</code></span>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-[var(--primary)] flex items-center justify-center">
            <Palette size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Interface Theme</h3>
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl">
          <span className="w-3 h-3 rounded-full bg-[#5B4BDB]" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Premium Colorful Academic Workspace</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">High-clarity light theme optimized for academic reading, citation analysis, and literature discovery.</p>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[var(--primary)] flex items-center justify-center">
            <Bell size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Notifications & Alerts</h3>
        </div>
        <div className="space-y-3.5 divide-y divide-[var(--border)]">
          {([
            ["analysisComplete", "Analysis Complete Notifications", "Alert when uploaded paper AI analysis is ready"],
            ["newGap", "Research Gap Detection Alerts", "Notify when a high-confidence research gap is identified"],
            ["weeklyDigest", "Weekly Research Digest", "Receive an aggregated weekly summary of your library activity"],
          ] as const).map(([key, label, sub], i) => (
            <div key={key} className={`flex items-center justify-between gap-4 ${i > 0 ? "pt-3.5" : ""}`}>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>
              </div>
              <button 
                onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))} 
                className={`w-11 h-6 rounded-full transition-colors ${notifs[key] ? "bg-[var(--primary)]" : "bg-[var(--border)]"} relative flex-shrink-0 cursor-pointer`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform ${notifs[key] ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[var(--primary)] flex items-center justify-center">
            <Database size={18} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Data & Backup Management</h3>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJsonFile}
          accept=".json"
          className="hidden"
        />

        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => handleExportData("bib")} variant="outline" size="sm" className="font-semibold text-xs">
            <Download size={14} className="mr-1.5" /> Export BibTeX (.bib)
          </Button>
          <Button onClick={() => handleExportData("json")} variant="outline" size="sm" className="font-semibold text-xs">
            <Download size={14} className="mr-1.5" /> Export JSON Backup
          </Button>
          <Button onClick={() => handleExportData("csv")} variant="outline" size="sm" className="font-semibold text-xs">
            <Download size={14} className="mr-1.5" /> Export CSV Spreadsheet
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" className="font-semibold text-xs">
            <Upload size={14} className="mr-1.5" /> Import JSON Backup
          </Button>
        </div>

        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-400">Clear Workspace Data</p>
            <p className="text-xs text-[var(--text-muted)]">Reset your local library to original default sample state</p>
          </div>
          <Button onClick={() => setClearModalOpen(true)} variant="danger" size="sm" className="font-semibold text-xs">
            <Trash2 size={14} className="mr-1.5" /> Reset Library
          </Button>
        </div>
      </Card>

      <div className="flex justify-end pt-3">
        <Button onClick={save} variant="primary" size="md" className="font-semibold">Save Changes</Button>
      </div>

      {/* Clear Modal */}
      <Modal open={clearModalOpen} onClose={() => setClearModalOpen(false)} title="Reset Workspace Library?">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-rose-950 dark:text-rose-200 text-xs sm:text-sm">
            <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <p>
              This will reset your local reference database and load the initial default demo papers and books.
            </p>
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="md" onClick={() => setClearModalOpen(false)}>Cancel</Button>
            <Button onClick={handleClearData} variant="danger" size="md">Confirm Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
