/**
 * RefScan - ISBN & Code Parsing Utilities
 * Handles ISBN-10, ISBN-13 checksum validation, QR Code parsing, DOIs, URLs, and JSON decoding.
 */

export interface IsbnValidationResult {
  isValid: boolean;
  cleanIsbn: string;
  type?: "ISBN-10" | "ISBN-13";
  formattedIsbn?: string;
  errorMessage?: string;
}

export interface ScannedCodePayload {
  type: "isbn" | "doi" | "url" | "title" | "text" | "unknown";
  value: string;
  extra?: any;
}

/**
 * Strips all non-alphanumeric characters (hyphens, spaces) and converts to uppercase.
 */
export function cleanIsbnString(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[^0-9X]/gi, "").toUpperCase().trim();
}

/**
 * Universal content parser for QR Codes and Barcodes.
 * Handles ISBNs, DOIs, URLs, JSON objects, and titles.
 */
export function extractFromScannedContent(raw: string): ScannedCodePayload {
  if (!raw) return { type: "unknown", value: "" };
  const trimmed = raw.trim();

  // 1. JSON payload (e.g. from academic QR codes)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      const possibleIsbn = obj.isbn || obj.isbn13 || obj.isbn10 || obj.ISBN;
      if (possibleIsbn) {
        return {
          type: "isbn",
          value: String(possibleIsbn).replace(/[^0-9X]/gi, "").toUpperCase(),
          extra: obj,
        };
      }
      if (obj.doi) {
        return { type: "doi", value: String(obj.doi), extra: obj };
      }
      if (obj.title) {
        return { type: "title", value: obj.title, extra: obj };
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. DOI string or DOI URL (e.g. https://doi.org/10.1109/...)
  const doiMatch =
    trimmed.match(/(?:doi\.org\/|doi:\s*)(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i) ||
    trimmed.match(/^(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)$/i);
  if (doiMatch) {
    return { type: "doi", value: doiMatch[1] };
  }

  // 3. ISBN-13 with prefix or standard format (e.g. 978-0-13-235088-4 or ISBN: 9780132350884)
  const isbn13Match = trimmed.match(
    /(?:ISBN(?:-13)?:?\s*)?(97[89][-\s]?\d[-\s]?\d{2,6}[-\s]?\d{2,6}[-\s]?\d)/i
  );
  if (isbn13Match) {
    const clean13 = isbn13Match[1].replace(/[^0-9]/g, "");
    if (clean13.length === 13) {
      return { type: "isbn", value: clean13 };
    }
  }

  // 4. ISBN-10 with prefix or standard format
  const isbn10Match = trimmed.match(
    /(?:ISBN(?:-10)?:?\s*)?(\d[-\s]?\d{2,5}[-\s]?\d{2,5}[-\s]?[\dX])/i
  );
  if (isbn10Match) {
    const clean10 = isbn10Match[1].replace(/[^0-9X]/gi, "").toUpperCase();
    if (clean10.length === 10) {
      return { type: "isbn", value: clean10 };
    }
  }

  // 5. URL containing ISBN in path/query or general academic link
  if (/^https?:\/\//i.test(trimmed)) {
    const urlDigits = trimmed.match(/(97[89]\d{10})/);
    if (urlDigits) {
      return { type: "isbn", value: urlDigits[1] };
    }
    return { type: "url", value: trimmed };
  }

  // 6. Direct numeric clean fallback
  const digitsOnly = trimmed.replace(/[^0-9X]/gi, "").toUpperCase();
  if (digitsOnly.length === 13 || digitsOnly.length === 10) {
    return { type: "isbn", value: digitsOnly };
  }

  // 7. Plain text / title fallback
  return { type: "text", value: trimmed };
}

/**
 * Extracts candidate ISBN-10 or ISBN-13 from barcode or QR content.
 */
export function extractIsbnFromBarcode(raw: string): string {
  const parsed = extractFromScannedContent(raw);
  if (parsed.type === "isbn") {
    return parsed.value;
  }
  return cleanIsbnString(raw);
}

/**
 * Validates ISBN-10 using Modulo 11 check digit algorithm.
 */
export function validateIsbn10(isbn10: string): boolean {
  const clean = cleanIsbnString(isbn10);
  if (clean.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(clean[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }

  const lastChar = clean[9];
  const lastVal = lastChar === "X" ? 10 : parseInt(lastChar, 10);
  if (isNaN(lastVal)) return false;

  sum += lastVal * 1;
  return sum % 11 === 0;
}

/**
 * Validates ISBN-13 using Modulo 10 check digit algorithm.
 */
export function validateIsbn13(isbn13: string): boolean {
  const clean = cleanIsbnString(isbn13);
  if (clean.length !== 13) return false;

  if (!clean.startsWith("978") && !clean.startsWith("979")) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(clean[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  return sum % 10 === 0;
}

/**
 * Converts a valid ISBN-10 to an ISBN-13.
 */
export function convertIsbn10To13(isbn10: string): string | null {
  const clean = cleanIsbnString(isbn10);
  if (!validateIsbn10(clean)) return null;

  const core = "978" + clean.substring(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : (10 - remainder) % 10;

  return core + checkDigit;
}

/**
 * Hyphenates standard ISBN-13 into readable blocks (e.g. 978-0-13-235088-4).
 */
export function formatIsbn(isbn: string): string {
  const clean = cleanIsbnString(isbn);
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 12)}-${clean.slice(12)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 4)}-${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  return isbn;
}

/**
 * Universal ISBN validation function.
 */
export function validateIsbn(raw: string): IsbnValidationResult {
  const parsed = extractFromScannedContent(raw);
  const clean = parsed.type === "isbn" ? parsed.value : cleanIsbnString(raw);

  if (!clean) {
    return {
      isValid: false,
      cleanIsbn: "",
      errorMessage: "Please enter or scan a valid code.",
    };
  }

  if (clean.length === 13) {
    const isValid = validateIsbn13(clean);
    return {
      isValid,
      cleanIsbn: clean,
      type: "ISBN-13",
      formattedIsbn: formatIsbn(clean),
      errorMessage: isValid ? undefined : "Invalid ISBN-13 checksum. Please check the code digits.",
    };
  }

  if (clean.length === 10) {
    const isValid = validateIsbn10(clean);
    return {
      isValid,
      cleanIsbn: clean,
      type: "ISBN-10",
      formattedIsbn: formatIsbn(clean),
      errorMessage: isValid ? undefined : "Invalid ISBN-10 checksum.",
    };
  }

  return {
    isValid: false,
    cleanIsbn: clean,
    errorMessage: "ISBN must be 10 or 13 digits (EAN-13).",
  };
}
