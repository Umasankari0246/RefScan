export type CitationStyle = "IEEE" | "APA" | "MLA" | "Harvard" | "BibTeX" | "RIS";

export type ReferenceType = "BOOK" | "PAPER" | "WEBSITE";

export type ReferenceTypeCategory = 
  | "Journal Article" 
  | "Conference Paper" 
  | "Book" 
  | "Book Chapter" 
  | "Website" 
  | "Thesis" 
  | "Report" 
  | "Other";

export interface SourceEvidence {
  pageNumber: number;
  originalText: string;
  interpretation: string;
}

export interface ReferenceBase {
  id: string;
  type: ReferenceType;
  dateAdded: string;
  saved?: boolean;
  
  // Provenance & Source Metadata
  sourceDocumentName?: string;
  sourceDocumentId?: string;
  sourcePdfPageNumber?: number;
  originalReferenceText?: string;
  extractionMethod?: string;
  extractedAt?: string;
  referenceTypeCategory?: ReferenceTypeCategory;
}

export interface BookReference extends ReferenceBase {
  type: "BOOK";
  title: string;
  subtitle?: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  publisher: string;
  publisherInfo?: string;
  publicationDate?: string;
  year: number;
  edition?: string;
  language: string;
  pages?: number;
  category: string;
  description?: string;
  coverImage?: string;
  coverColor: string;
  source: string; // e.g. "Google Books", "Open Library", "Manual entry"
  citationStyle: CitationStyle;
  status: "verified" | "pending";
}

export interface PaperReference extends ReferenceBase {
  type: "PAPER";
  title: string;
  authors: string[];
  affiliations?: string[];
  abstract: string;
  keywords: string[];
  publicationYear: number;
  journal?: string;
  conference?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  citationCount?: number;
  references: string[];
  sourceUrl?: string;
  source: string;
  fileName?: string;
  fileSize?: string;
  pageCount?: number;
  
  // Structured Real Paper Sections with Source Evidence
  introduction?: string;
  introductionEvidence?: SourceEvidence;

  problemStatement?: string;
  problemStatementEvidence?: SourceEvidence;

  objectives?: string;
  objectivesEvidence?: SourceEvidence;

  existingMethod?: string;
  existingMethodEvidence?: SourceEvidence;

  proposedMethod?: string;
  proposedMethodEvidence?: SourceEvidence;

  methodology?: string;
  methodologyEvidence?: SourceEvidence;

  algorithmsList?: Array<{ name: string; roleOrUse: string; evidence?: SourceEvidence }>;
  toolsAndTechList?: Array<{ name: string; purpose?: string; evidence?: SourceEvidence }>;
  
  datasetInfo?: {
    name?: string;
    size?: string;
    details?: string;
    evidence?: SourceEvidence;
  };

  experimentalSetup?: string;
  experimentalSetupEvidence?: SourceEvidence;

  resultsAndFindingsList?: Array<{
    text: string;
    metric?: string;
    value?: string;
    evidence?: SourceEvidence;
  }>;

  limitationsList?: Array<{ text: string; evidence?: SourceEvidence }>;

  researchGapsList?: Array<{
    title: string;
    description: string;
    category: "Mentioned by authors" | "Derived from stated limitations" | "Not clearly identified in the paper";
    evidence?: SourceEvidence;
  }>;

  conclusion?: string;
  conclusionEvidence?: SourceEvidence;

  futureScopeList?: Array<{ text: string; evidence?: SourceEvidence }>;

  // Raw Page Text & Scanned Detection
  rawTextByPage?: Array<{ pageNumber: number; text: string }>;
  isScannedOrImageBased?: boolean;
  extractionError?: string;

  // Legacy fallback compatibility
  researchProblem?: string;
  researchObjective?: string;
  technologies?: string[];
  algorithms?: string[];
  keyFindings?: string[];
  limitations?: string[];
  researchGaps?: ResearchGap[];
  futureScope?: string[];
  dataset?: {
    name?: string;
    size?: string;
    source?: string;
    features?: string[];
    details?: string;
  };
  evaluationMetrics?: string[];
  results?: string;
  analysisStatus: "pending" | "processing" | "complete" | "failed";
  citationStyle: CitationStyle;
}

export interface WebsiteReference extends ReferenceBase {
  type: "WEBSITE";
  title: string; // site title
  pageTitle: string;
  author?: string;
  organization?: string;
  url: string;
  domain: string;
  publicationDate?: string;
  accessDate: string;
  description?: string;
  citationStyle: CitationStyle;
}

export type Reference = BookReference | PaperReference | WebsiteReference;

export interface ResearchGap {
  id: string;
  title: string;
  description: string;
  strength?: "strong" | "moderate" | "emerging";
  type?: "unexplored" | "improvement" | "novelty" | "limitation";
  category?: "Mentioned by authors" | "Derived from stated limitations" | "Not clearly identified in the paper";
  confidence?: string;
  whyIsGap?: string;
  possibleProjectIdea?: string;
  evidence?: SourceEvidence;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "info" | "warning";
}

export interface ExtractedReferenceItem {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venueOrPublisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  isbn?: string;
  referenceType: ReferenceTypeCategory;
  originalText: string;
  sourceDocumentName: string;
  sourceDocumentId?: string;
  sourcePdfPageNumber?: number;
  extractionMethod: string;
  extractedAt: string;
  status: "new" | "already_saved" | "incomplete";
  existingReferenceId?: string;
  selected: boolean;
}

export interface CitationPaper {
  id: string;
  title: string;
  subtitle?: string;
  referenceIds: string[];
  citationStyle: CitationStyle;
  createdAt: string;
  generatedAt?: string;
  referenceCount?: number;
  formattedText?: string;
  references: Reference[];
  customNotes?: string;
}
