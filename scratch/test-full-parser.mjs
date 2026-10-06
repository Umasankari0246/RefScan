import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Load test PDF
const pdfPath = path.join(process.cwd(), "scratch", "sample_paper.pdf");
const buffer = fs.readFileSync(pdfPath);

const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  useSystemFonts: true,
});

const pdfDoc = await loadingTask.promise;
const meta = await pdfDoc.getMetadata().catch(() => null);

// Group items into lines with coordinates and font sizes
const pageCount = pdfDoc.numPages;
const rawTextByPage = [];

for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
  const page = await pdfDoc.getPage(pageNum);
  const textContent = await page.getTextContent();

  const items = [];
  for (const raw of textContent.items) {
    if (!raw || typeof raw.str !== "string") continue;
    const str = raw.str;
    if (!str && str !== " ") continue;
    const tr = raw.transform || [1, 0, 0, 1, 0, 0];
    const fontSize = Math.max(Math.round(Math.hypot(tr[0], tr[1])), Math.round(raw.height || 0), 8);
    items.push({
      str,
      x: tr[4] || 0,
      y: tr[5] || 0,
      fontSize,
    });
  }

  // Sort items: Top-to-Bottom (Y descending), Left-to-Right (X ascending)
  items.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3.5) {
      return b.y - a.y; // High Y is top of page
    }
    return a.x - b.x;
  });

  // Group into lines
  const lines = [];
  let currentLine = null;

  for (const item of items) {
    if (!currentLine) {
      currentLine = { parts: [item.str], y: item.y, fontSizes: [item.fontSize] };
    } else if (Math.abs(currentLine.y - item.y) <= 3.5) {
      currentLine.parts.push(item.str);
      currentLine.fontSizes.push(item.fontSize);
    } else {
      const lineText = currentLine.parts.join(" ").replace(/\s+/g, " ").trim();
      if (lineText) {
        const avgFont = Math.round(currentLine.fontSizes.reduce((a, b) => a + b, 0) / currentLine.fontSizes.length);
        lines.push({ text: lineText, y: currentLine.y, fontSize: avgFont });
      }
      currentLine = { parts: [item.str], y: item.y, fontSizes: [item.fontSize] };
    }
  }
  if (currentLine) {
    const lineText = currentLine.parts.join(" ").replace(/\s+/g, " ").trim();
    if (lineText) {
      const avgFont = Math.round(currentLine.fontSizes.reduce((a, b) => a + b, 0) / currentLine.fontSizes.length);
      lines.push({ text: lineText, y: currentLine.y, fontSize: avgFont });
    }
  }

  let pageText = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (i > 0) {
      const prevL = lines[i - 1];
      const gap = prevL.y - l.y;
      if (gap > 14) {
        pageText += "\n\n" + l.text;
      } else {
        pageText += "\n" + l.text;
      }
    } else {
      pageText += l.text;
    }
  }

  rawTextByPage.push({ pageNumber: pageNum, text: pageText, lines });
}

console.log("=== Page 1 Lines Extracted ===");
rawTextByPage[0].lines.forEach((l, idx) => {
  console.log(`Line ${idx} [${l.fontSize}pt]: "${l.text}"`);
});

// Non-author keyword blacklist
const NON_AUTHOR_TERMS = new Set([
  "pattern", "analysis", "machine", "intelligence", "artificial", "computer", "science",
  "engineering", "technology", "vision", "learning", "deep", "neural", "networks", "network",
  "systems", "system", "review", "transactions", "proceedings", "international", "conference",
  "journal", "article", "research", "information", "processing", "natural", "language",
  "methodology", "approach", "model", "models", "framework", "abstract", "introduction",
  "department", "university", "institute", "division", "section", "faculty", "school",
  "author", "authors", "corresponding", "paper", "manuscript", "preprint", "technical",
  "report", "communication", "letters", "communications", "data", "algorithm", "algorithms",
  "detection", "classification", "recognition", "optimization", "design", "study", "performance",
  "evaluation", "proposed", "existing", "vol", "volume", "issue", "ieee", "acm", "springer", "elsevier"
]);

function isHeaderBanner(text) {
  const t = text.trim();
  if (!t) return false;
  return /^(?:(?:IEEE|ACM|Springer|Elsevier|Nature|Science|Wiley|MDPI)\b|Transactions on|Proceedings of|Conference on|Journal of|arXiv:\d|bioRxiv|medRxiv|Volume\s+\d+|Vol\.\s*\d+|Issue\s+\d+|ISSN\s+[\d\-Xx]+|DOI:\s*10\.|https?:\/\/|www\.|Open Access|Accepted|Published in|Received\s+\d|Copyright\s+©|\d+\s*\|\s*P\s*a\s*g\s*e)/i.test(t);
}

function isAffiliationOrEmail(text) {
  const t = text.trim();
  if (!t) return false;
  if (/@|email|mail:|https?:\/\/|www\./i.test(t)) return true;
  return /(?:University|College|Institute|Department|School|Faculty|Laboratory|Center|Centre|Hospital|Corporation|Inc\.|Ltd\.|Company|Research Lab|Stanford|MIT|Berkeley|Harvard|Cambridge|Oxford|Google|Microsoft|USA|UK|China|India|Germany|Canada|France|Japan|Australia)/i.test(t);
}

// 1. Title Extraction
const p1Lines = rawTextByPage[0].lines;
let titleCandidateLines = [];
let authorCandidateLines = [];
let p1Phase = "BANNER"; // BANNER -> TITLE -> AUTHORS -> ABSTRACT_BODY

for (let i = 0; i < p1Lines.length; i++) {
  const line = p1Lines[i];
  const t = line.text;

  if (p1Phase === "BANNER") {
    if (isHeaderBanner(t)) {
      continue;
    }
    p1Phase = "TITLE";
  }

  if (p1Phase === "TITLE") {
    // Check if line marks start of abstract or authors
    if (/^(?:Abstract|ABSTRACT)\b/i.test(t)) {
      p1Phase = "ABSTRACT_BODY";
      continue;
    }
    if (isAffiliationOrEmail(t) || /^(?:by\s+|Authors?:?\s*)/i.test(t)) {
      p1Phase = "AUTHORS";
      if (!isAffiliationOrEmail(t)) authorCandidateLines.push(line);
      continue;
    }
    // Check if font is significantly smaller than previous title line or looks like author
    if (titleCandidateLines.length > 0) {
      const prevLine = titleCandidateLines[titleCandidateLines.length - 1];
      if (line.fontSize < prevLine.fontSize * 0.85 || /,|\band\b|&/i.test(t)) {
        p1Phase = "AUTHORS";
        authorCandidateLines.push(line);
        continue;
      }
    }
    titleCandidateLines.push(line);
    continue;
  }

  if (p1Phase === "AUTHORS") {
    if (/^(?:Abstract|ABSTRACT)\b/i.test(t) || /^(?:1\.?\s*Introduction|I\.?\s*Introduction)/i.test(t)) {
      p1Phase = "ABSTRACT_BODY";
      continue;
    }
    if (!isAffiliationOrEmail(t)) {
      authorCandidateLines.push(line);
    }
    continue;
  }
}

const extractedTitle = titleCandidateLines.map(l => l.text).join(" ").trim();
console.log("\n=== Extracted Title ===");
console.log(extractedTitle);

// 2. Author Extraction
const rawAuthorText = authorCandidateLines.map(l => l.text).join(", ");
console.log("\nRaw author candidates text:", rawAuthorText);

// Clean superscripts, numbers, asterisks
const cleanedAuthorText = rawAuthorText
  .replace(/^(?:by|authors?:)\s+/i, "")
  .replace(/[\d*†‡§#]+/g, "")
  .trim();

// Split by commas, "and", "&"
const potentialAuthors = cleanedAuthorText
  .split(/[,;&]|\band\b/i)
  .map(a => a.trim())
  .filter(a => a.length >= 3 && a.length <= 40);

const extractedAuthors = [];
for (const cand of potentialAuthors) {
  const words = cand.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) continue;
  
  // Check if any primary word is in blacklist
  const hasBlacklistWord = words.some(w => NON_AUTHOR_TERMS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  if (hasBlacklistWord) continue;

  // Check capitalization of each name part
  const isValidName = words.every(w => /^[A-Z][a-zA-Z'\-.]*$/.test(w) || /^(?:van|de|von|da|al)$/i.test(w));
  if (isValidName) {
    if (!extractedAuthors.includes(cand)) {
      extractedAuthors.push(cand);
    }
  }
}

console.log("\n=== Extracted Authors ===");
console.log(extractedAuthors);

// 3. Affiliations
const fullP1Text = rawTextByPage[0].text;
const affMatches = fullP1Text.match(/(?:Department of|School of|Faculty of|Institute of|University|College|Laboratory|Research Center)[^\n.,;]+/gi);
const extractedAffiliations = affMatches ? Array.from(new Set(affMatches.map(a => a.trim()))) : [];
console.log("\n=== Extracted Affiliations ===");
console.log(extractedAffiliations);

// 4. DOI & Year
const doiMatch = fullP1Text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i);
console.log("\n=== Extracted DOI ===");
console.log(doiMatch ? doiMatch[1] : "None");

const yearMatches = fullP1Text.match(/\b(20[0-2][0-9]|19[89][0-9])\b/g);
console.log("\n=== Extracted Year ===");
console.log(yearMatches ? yearMatches[0] : "None");

// 5. Abstract
let abstract = "";
const absMatch = fullP1Text.match(/(?:abstract|ABSTRACT)[:.\s\n]+([\s\S]{80,2500}?)(?:\n\s*(?:(?:[1I]\.?\s*)?introduction|index terms|keywords|key words))/i);
if (absMatch) {
  abstract = absMatch[1].replace(/\s+/g, " ").trim();
}
console.log("\n=== Extracted Abstract ===");
console.log(abstract);

// 6. Keywords
let keywords = [];
const kwMatch = fullP1Text.match(/(?:keywords|index terms|key words)[:.\s\n]+([^\n.]{6,250})/i);
if (kwMatch) {
  keywords = kwMatch[1].split(/[,;•—|]/).map(k => k.trim()).filter(k => k.length > 2 && k.length < 50);
}
console.log("\n=== Extracted Keywords ===");
console.log(keywords);

// 7. Introduction
let introduction = "";
const introMatch = fullP1Text.match(/(?:(?:1|I)\.?\s*Introduction[:.\s\n]+)([\s\S]{80,1200}?)(?:\n\s*(?:(?:2|II)\.|\b\w+\b:))/i);
if (introMatch) {
  introduction = introMatch[1].replace(/\s+/g, " ").trim();
}
console.log("\n=== Extracted Introduction ===");
console.log(introduction);

// Test sentence extraction on normalized text
const normP1Text = fullP1Text.replace(/\s+/g, " ");

// 8. Problem Statement
let problemStatement = "";
const probMatch = normP1Text.match(/(?:(?:despite|however,?\s+conventional|remains a fundamental bottleneck|challenge|bottleneck|limitation of existing|fails to capture)[^.]{10,250}\.)/i);
if (probMatch) {
  problemStatement = probMatch[0].trim();
}
console.log("\n=== Extracted Problem Statement ===");
console.log(problemStatement);

// 9. Objectives
let objectives = "";
const objMatch = normP1Text.match(/(?:(?:our primary objective is to|in this paper,?\s+we propose|our primary goal is to|this work proposes|we aim to)[^.]{10,250}\.)/i);
if (objMatch) {
  objectives = objMatch[0].trim();
}
console.log("\n=== Extracted Objectives ===");
console.log(objectives);

// 10. Proposed Method
let proposedMethod = "";
const propMatch = normP1Text.match(/(?:(?:the proposed (?:framework|method|architecture|model)|we propose|our approach integrates)[^.]{10,250}\.)/i);
if (propMatch) {
  proposedMethod = propMatch[0].trim();
}
console.log("\n=== Extracted Proposed Method ===");
console.log(proposedMethod);

// 11. Algorithms
const algorithmCatalog = [
  "Convolutional Neural Network", "CNN", "YOLO", "YOLOv8", "YOLOv5", "Transformer", "Vision Transformer",
  "BERT", "ResNet", "Support Vector Machine", "SVM", "Random Forest", "Decision Tree",
  "K-Means", "LSTM", "GRU", "Adam Optimizer", "SGD", "Genetic Algorithm", "Graph Neural Network",
  "Diffusion Model", "Gradient Boosting", "XGBoost", "Deep Q-Network", "Non-Maximum Suppression"
];
const algorithmsList = [];
for (const algo of algorithmCatalog) {
  const reg = new RegExp(`([^.]{0,80}\\b${algo}\\b[^.]{0,120}\\.)`, "i");
  const m = normP1Text.match(reg);
  if (m && !algorithmsList.some(a => a.name.toLowerCase() === algo.toLowerCase())) {
    algorithmsList.push({ name: algo, role: m[0].trim(), pageNumber: 1 });
  }
}
console.log("\n=== Extracted Algorithms ===");
console.log(algorithmsList);

// 12. Results
let results = "";
const resMatch = normP1Text.match(/(?:(?:achieves? an? accuracy of|yields? an improvement of|outperforms?)[^.]{10,250}\.)/i);
if (resMatch) {
  results = resMatch[0].trim();
}
console.log("\n=== Extracted Results ===");
console.log(results);


// 14. Limitations
let limitations = [];
const limitMatches = fullP1Text.match(/(?:(?:key limitation|limitation of our method|performance degrades|memory consumption is higher)[^.\n]{20,250}\.)/gi);
if (limitMatches) {
  limitations = limitMatches.map(l => l.replace(/\s+/g, " ").trim());
}
console.log("\n=== Extracted Limitations ===");
console.log(limitations);

// 15. Conclusion
let conclusion = "";
const conclMatch = fullP1Text.match(/(?:(?:in conclusion|conclusion)[:.\s\n]+)([\s\S]{40,300}?)\./i);
if (conclMatch) {
  conclusion = conclMatch[1].replace(/\s+/g, " ").trim();
}
console.log("\n=== Extracted Conclusion ===");
console.log(conclusion);

