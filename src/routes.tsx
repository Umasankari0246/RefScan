import { createBrowserRouter, Navigate, useRouteError } from "react-router";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ScanBook from "./pages/ScanBook";
import BookDetails from "./pages/BookDetails";
import References from "./pages/References";
import ReferenceDetails from "./pages/ReferenceDetails";
import ReferenceCollection from "./pages/ReferenceCollection";
import CitationGenerator from "./pages/CitationGenerator";
import SavedCitationPapers from "./pages/SavedCitationPapers";
import ResearchPapers from "./pages/ResearchPapers";
import PaperUpload from "./pages/PaperUpload";
import PaperAnalysis from "./pages/PaperAnalysis";
import ResearchGaps from "./pages/ResearchGaps";
import ResearchSites from "./pages/ResearchSites";
import ComparePapers from "./pages/ComparePapers";
import SavedPapers from "./pages/SavedPapers";
import ResearchInsights from "./pages/ResearchInsights";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

function RouteErrorBoundary() {
  const error: any = useRouteError();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-md space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto font-bold text-xl">
          !
        </div>
        <h2 className="text-lg font-bold">Something went wrong loading this view</h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {error?.message || "An unexpected rendering error occurred."}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-semibold hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Landing />, errorElement: <RouteErrorBoundary /> },
  { path: "/login", element: <Login />, errorElement: <RouteErrorBoundary /> },
  { path: "/register", element: <Register />, errorElement: <RouteErrorBoundary /> },
  { path: "/404", element: <NotFound /> },
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/scan", element: <ScanBook /> },
      { path: "/book/:id", element: <BookDetails /> },
      { path: "/references", element: <References /> },
      { path: "/references/:id", element: <ReferenceDetails /> },
      { path: "/collection", element: <ReferenceCollection /> },
      { path: "/citations", element: <CitationGenerator /> },
      { path: "/saved-citations", element: <SavedCitationPapers /> },
      { path: "/papers", element: <ResearchPapers /> },
      { path: "/upload", element: <PaperUpload /> },
      { path: "/analysis", element: <Navigate to="/papers" replace /> },
      { path: "/analysis/:id", element: <PaperAnalysis /> },
      { path: "/gaps", element: <ResearchGaps /> },
      { path: "/sites", element: <ResearchSites /> },
      { path: "/compare", element: <ComparePapers /> },
      { path: "/saved", element: <SavedPapers /> },
      { path: "/insights", element: <ResearchInsights /> },
      { path: "/settings", element: <Settings /> },
      { path: "/help", element: <Help /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
