/**
 * RefScan - Book & Academic Metadata Service
 * Fetches verified bibliographic metadata from reliable book metadata APIs (Google Books, Open Library, CrossRef).
 * Supports exact ISBN lookup, QR code payload resolution, title search, and multi-API fallback.
 */

import { BookReference } from "../types";
import { cleanIsbnString, formatIsbn, validateIsbn, extractFromScannedContent } from "./isbnService";

export interface BookLookupResult {
  book: BookReference;
  source: "Google Books" | "Open Library" | "Manual Entry";
}

/**
 * Normalizes image thumbnail URLs to secure HTTPS and higher resolution if possible.
 */
function normalizeCoverUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let secure = url.replace(/^http:\/\//i, "https://");
  if (secure.includes("books.google.com")) {
    secure = secure.replace("&edge=curl", "");
  }
  return secure;
}

/**
 * Maps Google Books API volume data to RefScan BookReference.
 */
function mapGoogleBooksToBook(item: any, requestedIsbn?: string): BookReference {
  const volumeInfo = item.volumeInfo || {};
  const identifiers: { type: string; identifier: string }[] = volumeInfo.industryIdentifiers || [];

  const isbn13Obj = identifiers.find((i) => i.type === "ISBN_13");
  const isbn10Obj = identifiers.find((i) => i.type === "ISBN_10");

  const fallbackIsbn = requestedIsbn && (requestedIsbn.length === 13 || requestedIsbn.length === 10) ? requestedIsbn : undefined;

  const isbn13 = isbn13Obj
    ? formatIsbn(isbn13Obj.identifier)
    : fallbackIsbn && fallbackIsbn.length === 13
    ? formatIsbn(fallbackIsbn)
    : undefined;

  const isbn10 = isbn10Obj
    ? isbn10Obj.identifier
    : fallbackIsbn && fallbackIsbn.length === 10
    ? fallbackIsbn
    : undefined;

  let pubYear = new Date().getFullYear();
  if (volumeInfo.publishedDate) {
    const parsedYear = parseInt(volumeInfo.publishedDate.substring(0, 4), 10);
    if (!isNaN(parsedYear)) pubYear = parsedYear;
  }

  const rawCover =
    volumeInfo.imageLinks?.extraLarge ||
    volumeInfo.imageLinks?.large ||
    volumeInfo.imageLinks?.medium ||
    volumeInfo.imageLinks?.thumbnail ||
    volumeInfo.imageLinks?.smallThumbnail;

  const colorPalette = ["#4F46E5", "#7C3AED", "#0284C7", "#059669", "#D97706", "#DC2626"];
  const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

  const authors =
    volumeInfo.authors && volumeInfo.authors.length > 0
      ? volumeInfo.authors
      : ["Unknown Author"];

  const category =
    volumeInfo.categories && volumeInfo.categories.length > 0
      ? volumeInfo.categories[0]
      : "Academic Literature";

  return {
    id: "b_" + Date.now(),
    type: "BOOK",
    title: volumeInfo.title || "Untitled Book",
    subtitle: volumeInfo.subtitle || undefined,
    authors,
    publisher: volumeInfo.publisher || "Academic Publisher",
    publisherInfo: volumeInfo.publishedDate ? `Published: ${volumeInfo.publishedDate}` : undefined,
    publicationDate: volumeInfo.publishedDate,
    year: pubYear,
    edition: volumeInfo.edition || undefined,
    isbn10,
    isbn13: isbn13 || (isbn10 ? formatIsbn(isbn10) : undefined),
    language: volumeInfo.language ? volumeInfo.language.toUpperCase() : "English",
    pages: volumeInfo.pageCount || undefined,
    category,
    description:
      volumeInfo.description ||
      "Bibliographic reference retrieved from Google Books database.",
    coverImage: normalizeCoverUrl(rawCover),
    coverColor: randomColor,
    source: "Google Books",
    citationStyle: "IEEE",
    status: "verified",
    dateAdded: new Date().toISOString().split("T")[0],
    saved: false,
  };
}

/**
 * Maps Open Library API data to RefScan BookReference.
 */
function mapOpenLibraryToBook(olData: any, requestedIsbn?: string): BookReference {
  const bookKey = requestedIsbn ? `ISBN:${requestedIsbn}` : "";
  const record = (bookKey && olData[bookKey]) || olData;
  if (!record || (!record.title && !record.authors && !record.author_name)) {
    throw new Error("No valid record in Open Library");
  }

  let authors: string[] = ["Unknown Author"];
  if (record.authors && Array.isArray(record.authors)) {
    authors = record.authors.map((a: any) =>
      typeof a === "string" ? a : a.name || "Unknown Author"
    );
  } else if (record.author_name && Array.isArray(record.author_name)) {
    authors = record.author_name;
  }

  let publisher = "Academic Press";
  if (record.publishers && record.publishers.length > 0) {
    publisher =
      typeof record.publishers[0] === "string"
        ? record.publishers[0]
        : record.publishers[0].name || "Academic Press";
  } else if (record.publisher && Array.isArray(record.publisher)) {
    publisher = record.publisher[0] || "Academic Press";
  }

  let pubYear = new Date().getFullYear();
  if (record.publish_date) {
    const match = String(record.publish_date).match(/\d{4}/);
    if (match) pubYear = parseInt(match[0], 10);
  } else if (record.first_publish_year) {
    pubYear = record.first_publish_year;
  }

  const coverUrl =
    record.cover?.large ||
    record.cover?.medium ||
    (requestedIsbn ? `https://covers.openlibrary.org/b/isbn/${requestedIsbn}-L.jpg` : undefined);

  const category =
    record.subjects && record.subjects.length > 0
      ? typeof record.subjects[0] === "string"
        ? record.subjects[0]
        : record.subjects[0].name || "General Science"
      : "Academic Research";

  return {
    id: "b_" + Date.now(),
    type: "BOOK",
    title: record.title || "Academic Reference",
    subtitle: record.subtitle || undefined,
    authors,
    publisher,
    year: pubYear,
    isbn10: requestedIsbn && requestedIsbn.length === 10 ? requestedIsbn : undefined,
    isbn13: requestedIsbn ? formatIsbn(requestedIsbn) : undefined,
    language: "English",
    pages: record.number_of_pages || undefined,
    category,
    description:
      typeof record.description === "string"
        ? record.description
        : record.description?.value ||
          "Bibliographic reference retrieved from Open Library database.",
    coverImage: coverUrl,
    coverColor: "#7C3AED",
    source: "Open Library",
    citationStyle: "APA",
    status: "verified",
    dateAdded: new Date().toISOString().split("T")[0],
    saved: false,
  };
}

/**
 * Primary function to retrieve verified book metadata for ANY ISBN.
 */
export async function getBookByISBN(rawIsbn: string): Promise<BookReference> {
  const cleanIsbn = cleanIsbnString(rawIsbn);
  const validation = validateIsbn(cleanIsbn);

  if (!validation.isValid && cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
    throw new Error(validation.errorMessage || "Invalid ISBN format.");
  }

  // 1. Try Google Books API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data.totalItems > 0 && data.items && data.items.length > 0) {
        const exactMatch =
          data.items.find((item: any) => {
            const ids: { type: string; identifier: string }[] =
              item.volumeInfo?.industryIdentifiers || [];
            return ids.some((id) => cleanIsbnString(id.identifier) === cleanIsbn);
          }) || data.items[0];

        if (exactMatch) {
          return mapGoogleBooksToBook(exactMatch, cleanIsbn);
        }
      }
    }
  } catch (err: any) {
    console.warn("Google Books API query failed or timed out:", err.message);
  }

  // 2. Try Open Library Books API as fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const olData = await response.json();
      const bookKey = `ISBN:${cleanIsbn}`;
      if (olData[bookKey]) {
        return mapOpenLibraryToBook(olData, cleanIsbn);
      }
    }
  } catch (err: any) {
    console.warn("Open Library Books API query failed:", err.message);
  }

  // 3. Try Open Library JSON direct endpoint as secondary fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const olJson = await response.json();
      if (olJson && olJson.title) {
        return mapOpenLibraryToBook(olJson, cleanIsbn);
      }
    }
  } catch (err: any) {
    console.warn("Open Library direct ISBN lookup failed:", err.message);
  }

  // Exact ISBN could not be found
  throw new Error(`We couldn't find an exact match for this ISBN (${formatIsbn(cleanIsbn)}).`);
}

/**
 * Universal metadata resolver for ANY scanned QR code or Barcode.
 */
export async function fetchBookMetadata(rawInput: string): Promise<BookReference> {
  const parsed = extractFromScannedContent(rawInput);

  // 1. If parsed as ISBN -> exact ISBN lookup
  if (parsed.type === "isbn") {
    return await getBookByISBN(parsed.value);
  }

  // 2. If parsed as DOI -> construct reference / search
  if (parsed.type === "doi") {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(parsed.value)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const msg = data.message || {};
        return {
          id: "p_" + Date.now(),
          type: "PAPER",
          title: (msg.title && msg.title[0]) || `Research Paper (${parsed.value})`,
          authors: (msg.author || []).map((a: any) => `${a.given || ""} ${a.family || ""}`.trim() || "Author"),
          publisher: msg.publisher || "Academic Publisher",
          year: msg.created?.["date-parts"]?.[0]?.[0] || new Date().getFullYear(),
          doi: parsed.value,
          sourceUrl: `https://doi.org/${parsed.value}`,
          source: "CrossRef",
          citationStyle: "IEEE",
          status: "verified",
          dateAdded: new Date().toISOString().split("T")[0],
          saved: false,
        } as any;
      }
    } catch (err) {
      console.warn("CrossRef DOI lookup failed:", err);
    }
  }

  // 3. If parsed as title or text from QR code -> search Open Library & Google Books
  const searchQuery = parsed.type === "title" || parsed.type === "text" ? parsed.value : rawInput;

  // Search Open Library Search API
  try {
    const olSearchRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1`
    );
    if (olSearchRes.ok) {
      const olSearchData = await olSearchRes.json();
      if (olSearchData.docs && olSearchData.docs.length > 0) {
        const doc = olSearchData.docs[0];
        const docIsbn = doc.isbn ? doc.isbn[0] : undefined;
        return mapOpenLibraryToBook(doc, docIsbn);
      }
    }
  } catch (err) {
    console.warn("Open Library search failed:", err);
  }

  // Search Google Books API
  try {
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1`
    );
    if (gbRes.ok) {
      const gbData = await gbRes.json();
      if (gbData.items && gbData.items.length > 0) {
        return mapGoogleBooksToBook(gbData.items[0]);
      }
    }
  } catch (err) {
    console.warn("Google Books search failed:", err);
  }

  // 4. If URL -> create website reference
  if (parsed.type === "url" || rawInput.startsWith("http")) {
    try {
      const urlObj = new URL(rawInput);
      return {
        id: "w_" + Date.now(),
        type: "WEBSITE",
        title: urlObj.hostname.replace(/^www\./, ""),
        pageTitle: urlObj.pathname.split("/").pop() || "Online Academic Resource",
        author: "",
        organization: urlObj.hostname,
        url: rawInput,
        domain: urlObj.hostname,
        publicationDate: new Date().toISOString().split("T")[0],
        accessDate: new Date().toISOString().split("T")[0],
        description: `Scanned web reference from QR code: ${rawInput}`,
        citationStyle: "IEEE",
        dateAdded: new Date().toISOString().split("T")[0],
        saved: false,
      } as any;
    } catch (e) {
      // ignore
    }
  }

  // Fallback error
  throw new Error(`Could not find bibliographic metadata for scanned code: "${rawInput}"`);
}

/**
 * Creates a template for manual book entry when an ISBN is unknown.
 */
export function createManualBookEntry(rawIsbn?: string): BookReference {
  const clean = rawIsbn ? cleanIsbnString(rawIsbn) : "";
  return {
    id: "b_" + Date.now(),
    type: "BOOK",
    title: "",
    subtitle: "",
    authors: [""],
    publisher: "",
    publisherInfo: "",
    publicationDate: "",
    year: new Date().getFullYear(),
    edition: "",
    isbn10: clean.length === 10 ? clean : undefined,
    isbn13: clean.length === 13 ? formatIsbn(clean) : undefined,
    language: "English",
    pages: undefined,
    category: "",
    description: "",
    coverColor: "#4F46E5",
    source: "Manual Entry",
    citationStyle: "IEEE",
    status: "pending",
    dateAdded: new Date().toISOString().split("T")[0],
    saved: false,
  };
}
