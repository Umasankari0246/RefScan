import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveBlobFile } from "./citationService";

export interface ExportPdfOptions {
  filename?: string;
  title?: string;
}

/**
 * Exports a specific HTML DOM element (e.g. A4 Citation Paper sheet) directly as a PDF.
 * Generates exact A4 portrait dimensions (210mm x 297mm) with high DPI resolution.
 */
export async function exportElementAsPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!element) {
    throw new Error("Element to export as PDF was not found.");
  }

  const filename = options.filename || "refscan_citation_paper.pdf";

  // Temporarily ensure element styles are optimal for capture
  const originalBoxShadow = element.style.boxShadow;
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  element.style.boxShadow = "none";
  element.style.transform = "none";
  element.style.transformOrigin = "initial";

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale ensures crisp 300+ DPI text rendering
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // Standard A4 dimensions in millimeters
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    // Subsequent pages if citations exceed 1 page
    while (heightLeft > 2) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    const pdfBlob = pdf.output("blob");
    await saveBlobFile(pdfBlob, finalFilename, "application/pdf");
  } finally {
    element.style.boxShadow = originalBoxShadow;
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
  }
}

