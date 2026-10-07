import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useRefScan } from "../context/RefScanContext";
import { RefScanLogo } from "../components/common/RefScanLogo";
import { PageThemeBackground } from "../components/common/PageThemeBackground";

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isAuthChecking } = useRefScan();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", institution: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthChecking && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, navigate]);

  const f = (k: string) => (v: string) => {
    setForm({ ...form, [k]: v });
    setError("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.email.includes("@") || !form.email.includes(".")) {
      setError("Please enter a valid academic email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Register new user without auto-logging in
      await register(
        {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          title: "Academic Researcher",
          institution: form.institution.trim() || "Academic Research Institution",
        },
        false
      );

      // Redirect to login page with registered flag and pre-filled email
      navigate(`/login?registered=true&email=${encodeURIComponent(form.email.trim())}`, {
        state: { registered: true, email: form.email.trim() },
      });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 text-[var(--text-primary)]">
      {/* ── Page Theme Background ─────────────────────────────────────────── */}
      <PageThemeBackground />

      <div className="w-full max-w-md space-y-5 my-8 relative z-10">
        <div 
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2.5 cursor-pointer group"
          title="Return to RefScan Home"
        >
          <RefScanLogo size={36} rounded="xl" showGlow className="group-hover:scale-105 transition-transform" />
          <span className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">RefScan</span>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-[#172554] mb-1 tracking-tight">Create Your Account</h2>
          <p className="text-xs text-[#64748B] mb-5">Start organizing references and analyzing literature.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { label: "Full Name", key: "name", placeholder: "Dr. Jane Smith", type: "text" },
              { label: "Email Address", key: "email", placeholder: "you@university.edu", type: "email" },
              { label: "Affiliation / Institution (Optional)", key: "institution", placeholder: "e.g. Stanford University", type: "text" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>
                <input 
                  type={type} 
                  value={(form as any)[key]} 
                  onChange={(e) => f(key)(e.target.value)} 
                  placeholder={placeholder} 
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all disabled:opacity-50" 
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input 
                  type={showPwd ? "text" : "password"} 
                  value={form.password} 
                  onChange={(e) => f("password")(e.target.value)} 
                  placeholder="Min. 6 characters" 
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 pr-11 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all disabled:opacity-50" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Confirm Password</label>
              <input 
                type="password" 
                value={form.confirm} 
                onChange={(e) => f("confirm")(e.target.value)} 
                placeholder="••••••••" 
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all disabled:opacity-50" 
              />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => { setAgreed(e.target.checked); setError(""); }} 
                disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]" 
              />
              <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                I agree to the <a href="#" className="text-[var(--primary)] hover:underline font-semibold">Terms of Service</a> and <a href="#" className="text-[var(--primary)] hover:underline font-semibold">Privacy Policy</a>
              </span>
            </label>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full min-h-[46px] flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-xs cursor-pointer mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-bold underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
