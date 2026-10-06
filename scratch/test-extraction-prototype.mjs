import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = path.join(process.cwd(), "scratch", "sample_paper.pdf");
const buffer = fs.readFileSync(pdfPath);

const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  useSystemFonts: true,
});

const pdfDoc = await loadingTask.promise;
console.log("Num pages:", pdfDoc.numPages);

const page = await pdfDoc.getPage(1);
const textContent = await page.getTextContent();

console.log("Total text items:", textContent.items.length);
// Let's inspect raw items
for (let i = 0; i < Math.min(15, textContent.items.length); i++) {
  const item = textContent.items[i];
  console.log(`Item ${i}: str="${item.str}", y=${item.transform[5]}, x=${item.transform[4]}, fontHeight=${item.height || item.transform[0]}`);
}

