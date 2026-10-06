import { useState, useRef, useEffect, useCallback } from "react";
import { 
  User, Quote, Palette, Database, Check, 
  Settings as SettingsIcon, Download, Upload, Trash2, 
  RefreshCw, Server, ShieldCheck, Users, Search, Edit, AlertCircle, ShieldAlert
} from "lucide-react";
import { Card, Button, Input, Select, Modal, Badge } from "../components/ui";
import { useRefScan } from "../context/RefScanContext";
import { generateBatchBibliography, downloadCitationFile } from "../services/citationService";
import { apiClient } from "../services/apiClient";
import { SafeUser, UserRole } from "../types";

export default function Settings() {
  const { references, addReference, deleteReference, backendStatus, backendHealth, checkBackendHealth, currentUser, refreshUserData } = useRefScan();

  const [profile, setProfile] = useState({
    name: currentUser?.name || "Researcher",
    email: currentUser?.email || "researcher@refscan.app",
    title: currentUser?.title || "Academic Researcher",
    institution: currentUser?.institution || "Academic Research Institution",
  });

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || "",
        email: currentUser.email || "",
        title: currentUser.title || "",
        institution: currentUser.institution || "",
      });
    }
  }, [currentUser]);

  const [citStyle, setCitStyle] = useState(() => {
    return localStorage.getItem("refscan_default_style") || "IEEE";
  });

  const [saved, setSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  
  // Backend ping state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: string; count: number; time: string; dbMode?: string } | null>(null);

  // Clear modal state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Admin Users Management State ──────────────────────────────────────────
  const [usersList, setUsersList] = useState<SafeUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userError, setUserError] = useState("");
  const [editModalUser, setEditModalUser] = useState<SafeUser | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<SafeUser | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; institution: string; role: UserRole }>({
    title: "",
    institution: "",
    role: "researcher",
  });

  const fetchUsers = useCallback(async (query?: string) => {
    if (currentUser?.role !== "admin") return;
    setUsersLoading(true);
    setUserError("");
    try {
      const res = await apiClient.getUsers(query);
      setUsersList(res.users);
    } catch (err: any) {
      setUserError(err.message || "Failed to load registered users from MongoDB.");
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers(userSearch);
    }
  }, [currentUser?.role, fetchUsers, userSearch]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    try {
      await apiClient.updateUser(currentUser.id, {
        name: profile.name,
        title: profile.title,
        institution: profile.institution,
      });
      await refreshUserData();
      setToastMsg("Researcher profile updated successfully in MongoDB.");
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    }
  };

  const handleOpenEditUser = (u: SafeUser) => {
    setEditModalUser(u);
    setEditForm({
      title: u.title || "",
      institution: u.institution || "",
      role: u.role || "researcher",
    });
  };

  const handleConfirmEditUser = async () => {
    if (!editModalUser) return;
    try {
      await apiClient.updateUser(editModalUser.id, {
        title: editForm.title,
        institution: editForm.institution,
        role: editForm.role,
      });
      setToastMsg(`User "${editModalUser.email}" updated successfully.`);
      setEditModalUser(null);
      await fetchUsers(userSearch);
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err: any) {
      alert("Failed to update user: " + err.message);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    try {
      await apiClient.deleteUser(deleteModalUser.id);
      setToastMsg(`User "${deleteModalUser.email}" and their workspace data were removed from MongoDB.`);
      setDeleteModalUser(null);
      await fetchUsers(userSearch);
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err: any) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const handleExportData = (format: "bib" | "json" | "csv" | "ris") => {
    if (references.length === 0) {
      alert("No references found in your workspace library to export.");
      return;
    }
    const content = generateBatchBibliography(references, citStyle as any, format);
    const ext = format === "bib" ? ".bib" : format === "json" ? ".json" : format === "csv" ? ".csv" : ".ris";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadCitationFile(content, `refscan_export_${Date.now()}${ext}`, mime);
    setToastMsg(`Exported ${references.length} references as ${format.toUpperCase()} successfully.`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          let count = 0;
          for (const item of parsed) {
            if (item.title && item.type) {
              await addReference(item);
              count++;
            }
          }
          setToastMsg(`Successfully imported ${count} references into your private MongoDB library!`);
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

  const handleClearWorkspace = async () => {
    setClearModalOpen(false);
    const ids = references.map((r) => r.id);
    await Promise.all(ids.map((id) => deleteReference(id).catch(() => {})));
    setToastMsg("Workspace library cleared from MongoDB.");
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleTestBackend = async () => {
    setPinging(true);
    try {
      const health = await apiClient.checkHealth();
      await checkBackendHealth();
      setPingResult({
        status: health.status,
        count: references.length,
        time: new Date().toLocaleTimeString(),
        dbMode: health.database?.status === "connected" 
          ? `MongoDB Active (${health.database.databaseName || "refscan"} @ ${health.database.host || "127.0.0.1:27017"})` 
          : "Database Offline"
      });
      setToastMsg(
        health.database?.status === "connected"
          ? "MongoDB Server & RefScan API connection verified: Online ✓"
          : "MongoDB connection is offline. Please ensure mongod service is running."
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
          <SettingsIcon size={15} /> Workspace Preferences & Administration
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
          Manage your research profile, citation defaults, persistent MongoDB status, and user directory.
        </p>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> {toastMsg}
        </div>
      )}

      {/* ── Researcher Profile ────────────────────────────────────────── */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[var(--primary)] flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Researcher Profile</h3>
              <p className="text-xs text-[var(--text-secondary)]">Authenticated account stored persistently in MongoDB</p>
            </div>
          </div>
          {currentUser?.role === "admin" && (
            <Badge variant="warning" className="text-xs font-bold uppercase tracking-wider">
              System Admin
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-lg font-bold shadow-2xs uppercase">
            {profile.name ? profile.name[0] : "R"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">{profile.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                {currentUser?.role || "Researcher"}
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] block">{profile.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Input label="Full Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
          <Input label="Email Address" type="email" value={profile.email} disabled />
          <Input label="Academic Title / Position" value={profile.title} onChange={(v) => setProfile({ ...profile, title: v })} />
          <Input label="Affiliation / Institution" value={profile.institution} onChange={(v) => setProfile({ ...profile, institution: v })} />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveProfile} variant="primary" size="sm">
            Save Profile Changes
          </Button>
        </div>
      </Card>

      {/* ── User Accounts Directory (ADMIN ONLY) ─────────────────────────── */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#172554]">MongoDB Users Directory</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-[#64748B]">Real user documents stored in MongoDB with secure bcrypt password hashing</p>
            </div>
          </div>
          {currentUser?.role === "admin" && (
            <Button 
              onClick={() => fetchUsers(userSearch)} 
              variant="outline" 
              size="sm" 
              disabled={usersLoading}
              className="text-xs"
            >
              <RefreshCw size={13} className={`mr-1.5 ${usersLoading ? "animate-spin" : ""}`} /> Refresh Users
            </Button>
          )}
        </div>

        {currentUser?.role !== "admin" ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
            <ShieldAlert size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Directory Access Restricted</p>
              <p className="text-slate-600 mt-0.5">
                You are authenticated as <strong>{currentUser?.role || "researcher"}</strong>. The full registered Users table is restricted to System Administrators for multi-user privacy.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input 
                type="text" 
                placeholder="Search registered users by name, email, or institution..." 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E6E9F8] bg-[#F8F7FF] text-[#172554] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5B4BDB]"
              />
            </div>

            {userError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} /> {userError}
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-[#E6E9F8]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7FF] text-[#64748B] font-semibold uppercase tracking-wider border-b border-[#E6E9F8]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Title & Affiliation</th>
                    <th className="px-4 py-3">Registered Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9F8] bg-white">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                        <RefreshCw size={18} className="animate-spin inline-block mr-2 text-[#5B4BDB]" />
                        Loading registered users from MongoDB...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                        No registered users found matching the query.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5B4BDB] font-bold text-xs flex items-center justify-center uppercase">
                              {u.name ? u.name[0] : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-[#172554]">{u.name}</p>
                              <p className="text-[11px] text-[#64748B]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === "admin" 
                              ? "bg-amber-100 text-amber-800 border border-amber-200" 
                              : u.role === "faculty"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          <p className="font-medium truncate max-w-[180px]">{u.title || "Researcher"}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate max-w-[180px]">{u.institution || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3 text-[#64748B] text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#5B4BDB] hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit size={14} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => setDeleteModalUser(u)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={16} className="text-emerald-600" />
                MongoDB Persistence Active: Passwords securely hashed with bcryptjs. Raw hashes are never exposed.
              </span>
              <span className="font-bold">{usersList.length} Total Registered Users</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Citation Preferences ────────────────────────────────────────── */}
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
            onChange={(v) => {
              setCitStyle(v);
              localStorage.setItem("refscan_default_style", v);
            }} 
          />
        </div>
      </Card>

      {/* ── Backend & MongoDB Connection Diagnostics ────────────────────── */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#172554]">Backend & MongoDB Status</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Direct connection to MongoDB Community Server on port 27017</p>
            </div>
          </div>
          <Badge 
            variant={backendHealth?.database?.status === "connected" ? "success" : "warning"} 
            className="text-xs font-semibold"
          >
            {backendHealth?.database?.status === "connected" ? "MongoDB Connected ✓" : "Offline"}
          </Badge>
        </div>

        <div className="p-4 bg-[#F8F7FF] rounded-2xl border border-[#E6E9F8] space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[#64748B]">Persistence Mode:</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs">
              Strict MongoDB Storage (In-Memory Fallback Disabled)
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
            <span className="text-[#64748B]">Your Isolated Bibliographic Records:</span>
            <span className="font-bold text-[#172554] bg-white px-2.5 py-0.5 rounded border border-[#E6E9F8]">
              {references.length} references
            </span>
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
          <span className="text-[11px] text-[#64748B]">URI: <code className="text-[#5B4BDB] font-mono">mongodb://127.0.0.1:27017/refscan</code></span>
        </div>
      </Card>

      {/* ── Data Management & Export ──────────────────────────────────────── */}
      <Card className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-[#5B4BDB] flex items-center justify-center">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Data Export & Backup</h3>
            <p className="text-xs text-[var(--text-secondary)]">Export your isolated bibliographic library</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <Button onClick={() => handleExportData("bib")} variant="outline" size="sm" className="w-full text-xs font-semibold">
            <Download size={13} className="mr-1.5" /> Export BibTeX
          </Button>
          <Button onClick={() => handleExportData("json")} variant="outline" size="sm" className="w-full text-xs font-semibold">
            <Download size={13} className="mr-1.5" /> Export JSON
          </Button>
          <Button onClick={() => handleExportData("csv")} variant="outline" size="sm" className="w-full text-xs font-semibold">
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>
          <Button onClick={() => handleExportData("ris")} variant="outline" size="sm" className="w-full text-xs font-semibold">
            <Download size={13} className="mr-1.5" /> Export RIS
          </Button>
        </div>

        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Import References</p>
            <p className="text-xs text-[var(--text-muted)]">Import previously exported JSON references into your account</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="text-xs font-semibold">
            <Upload size={14} className="mr-1.5" /> Import JSON
          </Button>
        </div>
      </Card>

      {/* ── Edit User Modal (Admin) ─────────────────────────────────────── */}
      <Modal
        open={Boolean(editModalUser)}
        onClose={() => setEditModalUser(null)}
        title="Edit User Profile (Admin)"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditModalUser(null)} variant="outline" size="sm">Cancel</Button>
            <Button onClick={handleConfirmEditUser} variant="primary" size="sm">Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="text-xs font-semibold text-[#64748B] block mb-1">User Email</label>
            <input type="text" value={editModalUser?.email || ""} disabled className="w-full px-3 py-2 rounded-lg border border-[#E6E9F8] bg-[#F1F5F9] text-[#64748B] font-mono text-xs" />
          </div>
          <Input label="Academic Title" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
          <Input label="Institution / Affiliation" value={editForm.institution} onChange={(v) => setEditForm({ ...editForm, institution: v })} />
          <div>
            <label className="text-xs font-semibold text-[#64748B] block mb-1">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 rounded-lg border border-[#E6E9F8] bg-white text-[#172554] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="researcher">Researcher</option>
              <option value="admin">Administrator</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Delete User Confirmation Modal (Admin) ──────────────────────── */}
      <Modal
        open={Boolean(deleteModalUser)}
        onClose={() => setDeleteModalUser(null)}
        title="Confirm User Deletion"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleteModalUser(null)} variant="outline" size="sm">Cancel</Button>
            <Button onClick={handleConfirmDeleteUser} variant="danger" size="sm">Delete User Account</Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs sm:text-sm text-[#475569]">
          <p>
            Are you sure you want to permanently delete user <strong>{deleteModalUser?.name}</strong> (<code>{deleteModalUser?.email}</code>)?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <strong>Warning:</strong> All references, papers, citations, and notifications owned by this user in MongoDB will also be permanently deleted.
          </div>
        </div>
      </Modal>
    </div>
  );
}
