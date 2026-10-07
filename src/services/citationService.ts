/**
 * RefScan - Citation Service
 * Generates standards-compliant academic citations (IEEE, APA 7th, MLA 9th, Harvard)
 * using verified metadata from Books, Research Papers, and Websites.
 */

import type { Reference, BookReference, PaperReference, WebsiteReference, CitationStyle } from "../types/index.ts";

export function formatAuthorsIEEE(authors: string[]): string {
  if (!authors || authors.length === 0) return "Anon.";
  
  const formatted = authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map((p) => p[0].toUpperCase() + ".").join(" ");
    return `${initials} ${lastName}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length > 3) return `${formatted[0]} et al.`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

export function formatAuthorsAPA(authors: string[]): string {
  if (!authors || authors.length === 0) return "Anonymous";

  const formatted = authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map((p) => p[0].toUpperCase() + ".").join(" ");
    return `${lastName}, ${initials}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  if (formatted.length > 20) return `${formatted.slice(0, 19).join(", ")}, ... ${formatted[formatted.length - 1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

export function formatAuthorsMLA(authors: string[]): string {
  if (!authors || authors.length === 0) return "Anonymous";

  const formatted = authors.map((author, idx) => {
    if (idx === 0) {
      const parts = author.trim().split(/\s+/);
      if (parts.length === 1) return parts[0];
      const lastName = parts[parts.length - 1];
      const firstNames = parts.slice(0, parts.length - 1).join(" ");
      return `${lastName}, ${firstNames}`;
    }
    return author.trim();
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, and ${formatted[1]}`;
  return `${formatted[0]}, et al.`;
}

export function formatAuthorsHarvard(authors: string[]): string {
  if (!authors || authors.length === 0) return "Anon.";

  const formatted = authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map((p) => p[0].toUpperCase() + ".").join("");
    return `${lastName}, ${initials}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length > 3) return `${formatted[0]} et al.`;
  return `${formatted.slice(0, -1).join(", ")} and ${formatted[formatted.length - 1]}`;
}

export function generateCitationHTML(ref: Reference, style: CitationStyle): string {
  if (!ref) return "";

  if (ref.type === "BOOK") {
    const book = ref as BookReference;
    const authIEEE = formatAuthorsIEEE(book.authors);
    const authAPA = formatAuthorsAPA(book.authors);
    const authMLA = formatAuthorsMLA(book.authors);
    const authHarvard = formatAuthorsHarvard(book.authors);

    const editionStr = book.edition ? `${book.edition} ed., ` : "";
    const pubCity = book.publisherInfo ? `${book.publisherInfo}: ` : "";

    switch (style) {
      case "IEEE":
        return `${authIEEE}, <em>${book.title}</em>, ${editionStr}${pubCity}${book.publisher}, ${book.year}.`;
      case "APA":
        return `${authAPA} (${book.year}). <em>${book.title}</em> (${editionStr ? editionStr.replace(", ", "") : "1st ed."}). ${book.publisher}.`;
      case "MLA":
        return `${authMLA}. <em>${book.title}</em>. ${editionStr}${book.publisher}, ${book.year}.`;
      case "Harvard":
        return `${authHarvard} (${book.year}) <em>${book.title}</em>. ${editionStr}${pubCity}${book.publisher}.`;
      default:
        return `${authIEEE}, <em>${book.title}</em>, ${book.publisher}, ${book.year}.`;
    }
  }

  if (ref.type === "PAPER") {
    const paper = ref as PaperReference;
    const authIEEE = formatAuthorsIEEE(paper.authors);
    const authAPA = formatAuthorsAPA(paper.authors);
    const authMLA = formatAuthorsMLA(paper.authors);
    const authHarvard = formatAuthorsHarvard(paper.authors);
    const journalName = paper.journal || paper.conference || "Conference Proceedings";
    const volIssuePagesIEEE = [
      paper.volume ? `vol. ${paper.volume}` : "",
      paper.issue ? `no. ${paper.issue}` : "",
      paper.pages ? `pp. ${paper.pages}` : ""
    ].filter(Boolean).join(", ");

    switch (style) {
      case "IEEE":
        return `${authIEEE}, "${paper.title}," <em>${journalName}</em>, ${volIssuePagesIEEE ? volIssuePagesIEEE + ", " : ""}${paper.publicationYear}.`;
      case "APA": {
        const volIssueAPA = paper.volume ? `${paper.volume}${paper.issue ? `(${paper.issue})` : ""}` : "";
        const pagesAPA = paper.pages ? `, ${paper.pages}` : "";
        const doiAPA = paper.doi ? ` https://doi.org/${paper.doi}` : paper.sourceUrl ? ` ${paper.sourceUrl}` : "";
        return `${authAPA} (${paper.publicationYear}). ${paper.title}. <em>${journalName}</em>, ${volIssueAPA}${pagesAPA}.${doiAPA}`;
      }
      case "MLA": {
        const volIssueMLA = [
          paper.volume ? `vol. ${paper.volume}` : "",
          paper.issue ? `no. ${paper.issue}` : ""
        ].filter(Boolean).join(", ");
        return `${authMLA}. "${paper.title}." <em>${journalName}</em>, ${volIssueMLA ? volIssueMLA + ", " : ""}${paper.publicationYear}, ${paper.pages ? "pp. " + paper.pages + "." : ""}`;
      }
      case "Harvard": {
        const volIssueHarv = paper.volume ? `${paper.volume}${paper.issue ? `(${paper.issue})` : ""}` : "";
        return `${authHarvard} (${paper.publicationYear}) '${paper.title}', <em>${journalName}</em>, ${volIssueHarv}${paper.pages ? `, pp. ${paper.pages}` : ""}.`;
      }
      default:
        return `${authIEEE}, "${paper.title}," <em>${journalName}</em>, ${paper.publicationYear}.`;
    }
  }

  // WEBSITE
  const web = ref as WebsiteReference;
  const creatorIEEE = web.author ? formatAuthorsIEEE([web.author]) : (web.organization || "n.a.");
  const creatorAPA = web.author ? formatAuthorsAPA([web.author]) : (web.organization || "n.a.");
  const creatorMLA = web.author ? formatAuthorsMLA([web.author]) : (web.organization || "n.a.");
  const creatorHarvard = web.author ? formatAuthorsHarvard([web.author]) : (web.organization || "Anon.");

  const pubDate = web.publicationDate || "";
  const pubYear = pubDate ? pubDate.split("-")[0] : "n.d.";

  switch (style) {
    case "IEEE":
      return `${creatorIEEE}, "${web.pageTitle}," <em>${web.title}</em>, ${pubDate ? pubDate + ". " : ""}[Online]. Available: ${web.url}. [Accessed: ${web.accessDate}].`;
    case "APA": {
      const dateAPA = pubDate ? pubDate.replace(/-/g, ", ") : "n.d.";
      return `${creatorAPA} (${dateAPA}). <em>${web.pageTitle}</em>. ${web.title}. ${web.url}`;
    }
    case "MLA":
      return `${creatorMLA}. "${web.pageTitle}." <em>${web.title}</em>, ${pubDate ? pubDate + ", " : ""}${web.url}. Accessed ${web.accessDate}.`;
    case "Harvard":
      return `${creatorHarvard} (${pubYear}) <em>${web.pageTitle}</em>, <em>${web.title}</em>. Available at: ${web.url} (Accessed: ${web.accessDate}).`;
    default:
      return `${creatorIEEE}, "${web.pageTitle}," ${web.url}`;
  }
}

export function generateCitationPlainText(ref: Reference, style: CitationStyle): string {
  const html = generateCitationHTML(ref, style);
  return html.replace(/<[^>]*>/g, "");
}

export function generateCitation(ref: Reference, style: CitationStyle): string {
  return generateCitationHTML(ref, style);
}

/**
 * Generate In-Text Citation (e.g. [1], (Vaswani et al., 2017))
 */
export function generateInTextCitation(ref: Reference, style: CitationStyle, index: number = 1): string {
  if (!ref) return "";
  
  const getFirstAuthorLastName = (authors?: string[]): string => {
    if (!authors || authors.length === 0) return "Anonymous";
    const first = authors[0].trim();
    const parts = first.split(/\s+/);
    return parts[parts.length - 1] || first;
  };

  if (ref.type === "BOOK") {
    const b = ref as BookReference;
    const lName = getFirstAuthorLastName(b.authors);
    const yr = b.year || "n.d.";
    switch (style) {
      case "IEEE": return `[${index}]`;
      case "APA": return b.authors.length > 2 ? `(${lName} et al., ${yr})` : b.authors.length === 2 ? `(${lName} & ${getFirstAuthorLastName([b.authors[1]])}, ${yr})` : `(${lName}, ${yr})`;
      case "MLA": return `(${lName} ${b.pages ? b.pages : ""})`.trim() + ")";
      case "Harvard": return b.authors.length > 2 ? `(${lName} et al. ${yr})` : `(${lName} ${yr})`;
      default: return `[${index}]`;
    }
  }

  if (ref.type === "PAPER") {
    const p = ref as PaperReference;
    const lName = getFirstAuthorLastName(p.authors);
    const yr = p.publicationYear || "n.d.";
    switch (style) {
      case "IEEE": return `[${index}]`;
      case "APA": return p.authors.length > 2 ? `(${lName} et al., ${yr})` : p.authors.length === 2 ? `(${lName} & ${getFirstAuthorLastName([p.authors[1]])}, ${yr})` : `(${lName}, ${yr})`;
      case "MLA": return `(${lName}${p.pages ? " " + p.pages.split("-")[0] : ""})`;
      case "Harvard": return p.authors.length > 2 ? `(${lName} et al. ${yr})` : `(${lName} ${yr})`;
      default: return `[${index}]`;
    }
  }

  // Website
  const w = ref as WebsiteReference;
  const authorName = w.author ? getFirstAuthorLastName([w.author]) : (w.organization || w.domain || "Web");
  const yr = w.publicationDate ? w.publicationDate.split("-")[0] : "n.d.";
  switch (style) {
    case "IEEE": return `[${index}]`;
    case "APA": return `(${authorName}, ${yr})`;
    case "MLA": return `("${w.pageTitle.slice(0, 20)}...")`;
    case "Harvard": return `(${authorName} ${yr})`;
    default: return `[${index}]`;
  }
}

/**
 * Generate BibTeX citation entry
 */
export function generateBibTeX(ref: Reference): string {
  if (!ref) return "";
  const citeKey = (ref.title.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "") + "_" + (ref.type === "BOOK" ? (ref as BookReference).year : ref.type === "PAPER" ? (ref as PaperReference).publicationYear : "web")).toLowerCase();

  if (ref.type === "BOOK") {
    const b = ref as BookReference;
    return `@book{${citeKey},
  author    = {${b.authors.join(" and ")}},
  title     = {${b.title}},
  publisher = {${b.publisher || "Unknown"}},
  year      = {${b.year}},
  isbn      = {${b.isbn13 || b.isbn10 || ""}},
  address   = {${b.publisherInfo || ""}}
}`;
  }

  if (ref.type === "PAPER") {
    const p = ref as PaperReference;
    return `@article{${citeKey},
  author    = {${p.authors.join(" and ")}},
  title     = {${p.title}},
  journal   = {${p.journal || p.conference || "Academic Repository"}},
  year      = {${p.publicationYear}},
  volume    = {${p.volume || ""}},
  number    = {${p.issue || ""}},
  pages     = {${p.pages || ""}},
  doi       = {${p.doi || ""}},
  url       = {${p.sourceUrl || ""}}
}`;
  }

  const w = ref as WebsiteReference;
  return `@misc{${citeKey},
  author       = {${w.author || w.organization || "n.a."}},
  title        = {${w.pageTitle}},
  howpublished = {\\url{${w.url}}},
  year         = {${w.publicationDate ? w.publicationDate.split("-")[0] : "n.d."}},
  note         = {Accessed: ${w.accessDate}}
}`;
}

/**
 * Generate RIS (Research Information Systems) file format
 */
export function generateRIS(ref: Reference): string {
  if (!ref) return "";
  const lines: string[] = [];

  if (ref.type === "BOOK") {
    const b = ref as BookReference;
    lines.push("TY  - BOOK");
    lines.push(`TI  - ${b.title}`);
    b.authors.forEach((a) => lines.push(`AU  - ${a}`));
    lines.push(`PB  - ${b.publisher}`);
    lines.push(`PY  - ${b.year}`);
    if (b.isbn13 || b.isbn10) lines.push(`SN  - ${b.isbn13 || b.isbn10}`);
    lines.push("ER  - ");
  } else if (ref.type === "PAPER") {
    const p = ref as PaperReference;
    lines.push("TY  - JOUR");
    lines.push(`TI  - ${p.title}`);
    p.authors.forEach((a) => lines.push(`AU  - ${a}`));
    lines.push(`JO  - ${p.journal || p.conference || "Journal"}`);
    lines.push(`PY  - ${p.publicationYear}`);
    if (p.volume) lines.push(`VL  - ${p.volume}`);
    if (p.issue) lines.push(`IS  - ${p.issue}`);
    if (p.pages) lines.push(`SP  - ${p.pages}`);
    if (p.doi) lines.push(`DO  - ${p.doi}`);
    if (p.sourceUrl) lines.push(`UR  - ${p.sourceUrl}`);
    lines.push("ER  - ");
  } else {
    const w = ref as WebsiteReference;
    lines.push("TY  - ELEC");
    lines.push(`TI  - ${w.pageTitle}`);
    if (w.author) lines.push(`AU  - ${w.author}`);
    if (w.organization) lines.push(`PB  - ${w.organization}`);
    lines.push(`UR  - ${w.url}`);
    lines.push(`Y2  - ${w.accessDate}`);
    lines.push("ER  - ");
  }

  return lines.join("\n");
}

/**
 * Batch generate bibliography export
 */
export function generateBatchBibliography(refs: Reference[], style: CitationStyle = "IEEE", format: "bib" | "txt" | "ris" | "json" | "csv" = "bib"): string {
  if (format === "json") {
    return JSON.stringify(refs, null, 2);
  }

  if (format === "csv") {
    const header = ["ID", "Type", "Title", "Authors / Organization", "Year", "Publisher / Journal", "Identifier (ISBN/DOI/URL)", "Style"];
    const rows = refs.map((r) => {
      let authors = "";
      let year = "";
      let venue = "";
      let idNum = "";

      if (r.type === "BOOK") {
        const b = r as BookReference;
        authors = b.authors.join("; ");
        year = String(b.year);
        venue = b.publisher;
        idNum = b.isbn13 || b.isbn10 || "";
      } else if (r.type === "PAPER") {
        const p = r as PaperReference;
        authors = p.authors.join("; ");
        year = String(p.publicationYear);
        venue = p.journal || p.conference || "";
        idNum = p.doi || "";
      } else {
        const w = r as WebsiteReference;
        authors = w.author || w.organization || "";
        year = w.publicationDate ? w.publicationDate.split("-")[0] : "";
        venue = w.domain;
        idNum = w.url;
      }

      return [
        `"${r.id}"`,
        `"${r.type}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${authors.replace(/"/g, '""')}"`,
        `"${year}"`,
        `"${venue.replace(/"/g, '""')}"`,
        `"${idNum.replace(/"/g, '""')}"`,
        `"${r.citationStyle || style}"`
      ].join(",");
    });
    return [header.join(","), ...rows].join("\n");
  }

  if (format === "ris") {
    return refs.map((r) => generateRIS(r)).join("\n\n");
  }

  if (format === "bib") {
    return refs.map((r) => generateBibTeX(r)).join("\n\n");
  }

  // Plain Text formatted bibliography
  return refs.map((r, i) => {
    const num = `[${i + 1}] `;
    const text = generateCitationPlainText(r, style);
    return style === "IEEE" ? `${num}${text}` : text;
  }).join("\n\n");
}

/**
 * Cross-platform blob save helper.
 * Uses Web Share API on mobile devices where direct download of blobs can be blocked,
 * or standard HTML5 anchor download on desktop.
 */
export async function saveBlobFile(blob: Blob, fileName: string, mimeType: string = "application/octet-stream"): Promise<void> {
  // 1. Try Web Share API (native save sheet on Android WebView & iOS Safari)
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `RefScan export: ${fileName}`,
        });
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // User dismissed share sheet
      }
      console.warn("[saveBlobFile] Web Share API failed, falling back to anchor download:", err);
    }
  }

  // 2. Standard Blob URL download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Keep URL alive for 60 seconds so mobile WebViews can finish writing the file
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error("[saveBlobFile] Blob download failed:", err);
  }
}

/**
 * Trigger file download in browser or mobile app
 */
export function downloadCitationFile(content: string, fileName: string, mimeType: string = "text/plain"): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  saveBlobFile(blob, fileName, mimeType);
}

