import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useRefScan } from "../context/RefScanContext";
import { RefScanLogo } from "../components/common/RefScanLogo";
import { PageThemeBackground } from "../components/common/PageThemeBackground";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, isAuthChecking } = useRefScan();

  const isJustRegistered = location.state?.registered || searchParams.get("registered") === "true";
  const incomingEmail = location.state?.email || searchParams.get("email") || "";

  const [email, setEmail] = useState(incomingEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    isJustRegistered ? "Account created successfully! Please enter your password to sign in." : ""
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthChecking && isAuthenticated && !isJustRegistered) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, isJustRegistered, navigate]);

  useEffect(() => {
    if (incomingEmail && !email) {
      setEmail(incomingEmail);
    }
  }, [incomingEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 text-[var(--text-primary)]">
      {/* ── Page Theme Background ─────────────────────────────────────────── */}
      <PageThemeBackground />

      <div className="w-full max-w-md space-y-5 my-8 relative z-10">
        {/* Brand Logo Header */}
        <div 
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2.5 cursor-pointer group"
          title="Return to RefScan Home"
        >
          <RefScanLogo size={36} rounded="xl" showGlow className="group-hover:scale-105 transition-transform" />
          <span className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">RefScan</span>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-[#172554] mb-1 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[#64748B] mb-5">Sign in to your isolated research workspace.</p>

          {/* Success banner when redirected from successful account registration */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => { setEmail(e.target.value); setError(""); }} 
                placeholder="you@university.edu" 
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all disabled:opacity-50" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input 
                  type={showPwd ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => { setPassword(e.target.value); setError(""); }} 
                  placeholder="••••••••" 
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
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)} 
                  className="w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]" 
                />
                <span className="text-xs text-[var(--text-secondary)] font-medium">Remember me</span>
              </label>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full min-h-[46px] flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-xs cursor-pointer mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-bold underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
