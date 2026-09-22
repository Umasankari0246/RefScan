/**
 * RefScan - Barcode & QR Code Scanning Engine
 * Powered by ZXing (Zebra Crossing) + Native BarcodeDetector API.
 * Supports QR Codes, EAN-13 (Book ISBNs), EAN-8, UPC-A, UPC-E, Code-128, Code-39, ITF, DataMatrix, PDF-417, and Aztec.
 */

import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  BinaryBitmap,
  BrowserMultiFormatReader,
} from "@zxing/library";

// Hints configured for all 1D barcode and 2D QR Code formats
const supportedFormats = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.AZTEC,
  BarcodeFormat.PDF_417,
  BarcodeFormat.ITF,
];

const hints = new Map<DecodeHintType, any>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, supportedFormats);
hints.set(DecodeHintType.TRY_HARDER, true);

const multiFormatReader = new MultiFormatReader();
multiFormatReader.setHints(hints);

const browserReader = new BrowserMultiFormatReader(hints);

let nativeDetector: any = null;
if (typeof window !== "undefined" && typeof (window as any).BarcodeDetector === "function") {
  try {
    nativeDetector = new (window as any).BarcodeDetector({
      formats: [
        "qr_code",
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "code_39",
        "itf",
        "data_matrix",
        "aztec",
        "pdf417",
      ],
    });
  } catch (err) {
    console.warn("Native BarcodeDetector init failed, using ZXing engine:", err);
  }
}

/**
 * Decodes barcode / QR code from Canvas context using ZXing RGBLuminanceSource & HybridBinarizer.
 */
export function decodeFromCanvas(
  canvas: HTMLCanvasElement,
  crop?: { sx: number; sy: number; sw: number; sh: number }
): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    const sx = crop ? Math.max(0, Math.floor(crop.sx)) : 0;
    const sy = crop ? Math.max(0, Math.floor(crop.sy)) : 0;
    const sw = crop ? Math.min(canvas.width - sx, Math.floor(crop.sw)) : canvas.width;
    const sh = crop ? Math.min(canvas.height - sy, Math.floor(crop.sh)) : canvas.height;

    if (sw <= 0 || sh <= 0) return null;

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const int32Data = new Int32Array(imgData.data.buffer);
    const lumSource = new RGBLuminanceSource(int32Data, sw, sh);

    // Pass 1: HybridBinarizer (adaptive local thresholding)
    try {
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
      const result = multiFormatReader.decode(binaryBitmap);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch (err) {
      // Continue to GlobalHistogram fallback
    }

    // Pass 2: GlobalHistogramBinarizer (global thresholding fallback for low contrast)
    try {
      const globalBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(lumSource));
      const result = multiFormatReader.decode(globalBitmap);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch (err) {
      // Not found
    }
  } catch (err) {
    // Expected when no code present in frame
  }

  return null;
}

/**
 * Decodes barcode or QR code from an HTMLVideoElement frame using multi-engine detection.
 */
export async function decodeFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;

  // 1. Native Hardware BarcodeDetector
  if (nativeDetector) {
    try {
      const barcodes = await nativeDetector.detect(video);
      if (barcodes && barcodes.length > 0) {
        const raw = barcodes[0].rawValue;
        if (raw) return raw.trim();
      }
    } catch (err) {
      // Fallback
    }
  }

  // 2. Offscreen Canvas Frame Sync
  if (canvas.width !== vWidth || canvas.height !== vHeight) {
    canvas.width = vWidth;
    canvas.height = vHeight;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, vWidth, vHeight);

  // Pass A: Center target area crop (enhanced focus for reticle box)
  const cropW = Math.floor(vWidth * 0.75);
  const cropH = Math.floor(vHeight * 0.6);
  const cropX = Math.floor((vWidth - cropW) / 2);
  const cropY = Math.floor((vHeight - cropH) / 2);

  const centerResult = decodeFromCanvas(canvas, {
    sx: cropX,
    sy: cropY,
    sw: cropW,
    sh: cropH,
  });

  if (centerResult) {
    return centerResult;
  }

  // Pass B: Full frame canvas scan
  const fullResult = decodeFromCanvas(canvas);
  if (fullResult) {
    return fullResult;
  }

  // Pass C: BrowserMultiFormatReader direct video decode
  try {
    const browserResult = browserReader.decode(video);
    if (browserResult && browserResult.getText()) {
      return browserResult.getText().trim();
    }
  } catch (err) {
    // NotFound
  }

  return null;
}

/**
 * Decodes barcode or QR code from an image element or uploaded photo.
 */
export async function decodeFromImage(img: HTMLImageElement): Promise<string | null> {
  // 1. Native BarcodeDetector
  if (nativeDetector) {
    try {
      const barcodes = await nativeDetector.detect(img);
      if (barcodes && barcodes.length > 0) {
        const raw = barcodes[0].rawValue;
        if (raw) return raw.trim();
      }
    } catch (err) {
      // fallback
    }
  }

  // 2. Canvas Pass
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const canvasResult = decodeFromCanvas(canvas);
      if (canvasResult) return canvasResult;
    }
  } catch (err) {
    // fallback
  }

  // 3. ZXing BrowserMultiFormatReader
  try {
    const result = await browserReader.decodeFromImageElement(img);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch (err) {
    // NotFound
  }

  return null;
}

/**
 * Synthesizes a crisp, pleasing audio chime on successful code detection.
 */
export function playScanSuccessBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    // Audio playback error or blocked by autoplay
  }
}
