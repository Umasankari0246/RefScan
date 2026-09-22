import { createBrowserRouter, Navigate, useParams } from "react-router";
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

function AnalysisRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/references/${id}` : "/references"} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/404", element: <NotFound /> },
  {
    element: <AppLayout />,
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
