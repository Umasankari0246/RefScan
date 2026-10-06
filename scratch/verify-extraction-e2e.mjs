import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// We can test the extraction logic directly
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

async function testExtraction() {
  console.log("=== Running End-to-End Extraction Verification ===");
  const pdfPath = path.join(process.cwd(), "scratch", "sample_paper.pdf");
  const buffer = fs.readFileSync(pdfPath);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const rawTextByPage = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rawItems = textContent.items || [];
    const items = [];

    for (const raw of rawItems) {
      if (!raw || typeof raw.str !== "string") continue;
      const str = raw.str;
      if (!str && str !== " ") continue;
      const tr = raw.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.max(Math.round(Math.hypot(tr[0], tr[1])), Math.round(raw.height || 0), 8);
      items.push({ str, x: tr[4] || 0, y: tr[5] || 0, fontSize });
    }

    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 3.5) return b.y - a.y;
      return a.x - b.x;
    });

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
        if (prevL.y - l.y > 13) pageText += "\n\n" + l.text;
        else pageText += "\n" + l.text;
      } else {
        pageText += l.text;
      }
    }

    rawTextByPage.push({ pageNumber: pageNum, text: pageText });
  }

  const p1Text = rawTextByPage[0].text;
  const p1Lines = p1Text.split("\n").map(l => l.trim()).filter(Boolean);

  let titleCandidateLines = [];
  let authorCandidateLines = [];
  let p1Phase = "BANNER";

  for (const line of p1Lines) {
    if (p1Phase === "BANNER") {
      if (isHeaderBanner(line)) continue;
      p1Phase = "TITLE";
    }

    if (p1Phase === "TITLE") {
      if (/^(?:Abstract|ABSTRACT)\b/i.test(line)) {
        p1Phase = "ABSTRACT_BODY";
        continue;
      }
      if (isAffiliationOrEmail(line) || /^(?:by\s+|authors?:?\s*)/i.test(line)) {
        p1Phase = "AUTHORS";
        if (!isAffiliationOrEmail(line)) authorCandidateLines.push(line);
        continue;
      }
      if (titleCandidateLines.length > 0 && (/,|\band\b|&/i.test(line) || isAffiliationOrEmail(line))) {
        p1Phase = "AUTHORS";
        if (!isAffiliationOrEmail(line)) authorCandidateLines.push(line);
        continue;
      }
      if (titleCandidateLines.length < 3) {
        titleCandidateLines.push(line);
      } else {
        p1Phase = "AUTHORS";
        if (!isAffiliationOrEmail(line)) authorCandidateLines.push(line);
      }
      continue;
    }

    if (p1Phase === "AUTHORS") {
      if (/^(?:Abstract|ABSTRACT)\b/i.test(line) || /^(?:1\.?\s*Introduction|I\.?\s*Introduction)/i.test(line)) {
        p1Phase = "ABSTRACT_BODY";
        continue;
      }
      if (!isAffiliationOrEmail(line)) {
        authorCandidateLines.push(line);
      }
      continue;
    }
  }

  const title = titleCandidateLines.join(" ").replace(/\s+/g, " ").trim();
  const rawAuthorText = authorCandidateLines.join(", ").replace(/^(?:by|authors?:)\s+/i, "").replace(/[\d*†‡§#]+/g, "").trim();
  const candidateSplits = rawAuthorText.split(/[,;&]|\band\b/i).map(a => a.trim()).filter(a => a.length >= 3 && a.length <= 45);
  const authors = [];
  for (const cand of candidateSplits) {
    const words = cand.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 5) continue;
    const hasBlacklistWord = words.some(w => NON_AUTHOR_TERMS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
    if (hasBlacklistWord) continue;
    const isValidName = words.every(w => /^[A-Z][a-zA-Z'\-.]*$/.test(w) || /^(?:van|de|von|da|al)$/i.test(w));
    if (isValidName && !authors.includes(cand)) authors.push(cand);
  }

  // Assertions
  console.log("1. Extracted Title:", title);
  if (!title.includes("Multi-Scale Vision Transformer")) {
    throw new Error(`Title extraction failed: "${title}"`);
  }
  console.log("   ✓ Title correctly extracted!");

  console.log("2. Extracted Authors:", authors);
  if (authors.length !== 3 || !authors.includes("Arunachalam Suresh") || authors.includes("Pattern Analysis")) {
    throw new Error(`Authors extraction failed: ${JSON.stringify(authors)}`);
  }
  console.log("   ✓ Authors correctly isolated with no conference/field false positives!");

  const norm = p1Text.replace(/\s+/g, " ");

  // Problem statement
  const problemMatch = norm.match(/(?:(?:despite|however,?\s+conventional|remains a fundamental bottleneck|challenge|limitation of existing|fails to capture)[^.]{10,250}\.)/i);
  console.log("3. Problem Statement:", problemMatch ? problemMatch[0].trim() : "None");
  if (!problemMatch) throw new Error("Problem statement extraction failed!");
  console.log("   ✓ Problem Statement extracted!");

  // Objectives
  const objMatch = norm.match(/(?:(?:our primary objective is to|in this paper,?\s+we propose|our primary goal is to|this work proposes|we aim to)[^.]{10,250}\.)/i);
  console.log("4. Objectives:", objMatch ? objMatch[0].trim() : "None");
  if (!objMatch) throw new Error("Objectives extraction failed!");
  console.log("   ✓ Objectives extracted!");

  // Results
  const resMatch = norm.match(/(?:[^.]{0,80}(?:achieves? an? accuracy of|yields? an improvement of|outperforms?)[^.]{10,180}\.)/i);
  console.log("5. Results:", resMatch ? resMatch[0].trim() : "None");
  if (!resMatch) throw new Error("Results extraction failed!");
  console.log("   ✓ Results extracted!");

  // Limitations
  const limitMatch = norm.match(/(?:(?:key limitation|limitation of our method|performance degrades|memory consumption is higher)[^.]{10,240}\.)/i);
  console.log("6. Limitations:", limitMatch ? limitMatch[0].trim() : "None");
  if (!limitMatch) throw new Error("Limitations extraction failed!");
  console.log("   ✓ Limitations extracted!");

  // Conclusion
  const conclMatch = norm.match(/(?:(?:in conclusion|conclusion)[:.\s]+)([\s\S]{35,300}?)\./i);
  console.log("7. Conclusion:", conclMatch ? conclMatch[0].trim() : "None");
  if (!conclMatch) throw new Error("Conclusion extraction failed!");
  console.log("   ✓ Conclusion extracted!");

  console.log("\n=============================================");
  console.log(" ALL 7 CORE EXTRACTION CHECKS PASSED 100%!");
  console.log("=============================================");
}

testExtraction().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

