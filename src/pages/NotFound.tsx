import { useNavigate } from "react-router";
import { Microscope, ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-[var(--text-primary)]">
      <div className="text-center max-w-md bg-[var(--surface)] border border-[var(--border)] p-7 sm:p-9 rounded-xl shadow-sm">
        <div className="w-12 h-12 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)] shadow-2xs">
          <Microscope size={22} />
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--primary)] mb-1 tracking-tight">404</h1>
        <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">Resource Not Found</h2>
        <p className="text-[var(--text-secondary)] mb-6 text-xs sm:text-sm leading-relaxed">The page or resource you are looking for does not exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => navigate("/dashboard")} variant="primary" size="md" className="flex items-center justify-center gap-1.5 text-xs font-semibold">
            <Home size={14} /> Back to Dashboard
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline" size="md" className="flex items-center justify-center gap-1.5 text-xs font-semibold">
            <ArrowLeft size={14} /> Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
