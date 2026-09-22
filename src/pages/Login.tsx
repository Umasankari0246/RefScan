import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Microscope, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
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

    setError("");
    const existingProfile = localStorage.getItem("refscan_profile");
    if (existingProfile) {
      const parsed = JSON.parse(existingProfile);
      localStorage.setItem("refscan_profile", JSON.stringify({ ...parsed, email }));
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 sm:p-8 text-[var(--text-primary)]">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-2xs">
            <Microscope size={18} />
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">RefScan</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6">Sign in to your research workspace.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
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
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all" 
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
                  className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 pr-11 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--primary)] transition-all" 
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
              <a href="#" className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-semibold">Forgot password?</a>
            </div>
            <button 
              type="submit" 
              className="w-full min-h-[46px] flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-xs cursor-pointer mt-2"
            >
              Sign In <ArrowRight size={16} />
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
