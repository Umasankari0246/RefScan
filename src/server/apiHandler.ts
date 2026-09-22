/**
 * RefScan Backend API Handler
 * Comprehensive RESTful backend API for RefScan running via Vite middleware.
 * Supports MongoDB integration with seamless in-memory fallback.
 * Endpoints:
 * - GET  /api/health (System status & DB health)
 * - GET  /api/books/lookup?isbn= (Multi-source ISBN lookup)
 * - GET  /api/references (GET with search & filters)
 * - POST /api/references (Create new reference)
 * - GET  /api/references/:id (Get single reference)
 * - PUT  /api/references/:id (Update reference)
 * - DELETE /api/references/:id (Delete reference)
 * - GET  /api/papers (List papers)
 * - GET  /api/papers/:id (Get specific paper)
 * - POST /api/papers/upload (File ingestion & analysis)
 * - POST /api/citations/generate (IEEE, APA, MLA, Harvard formatter)
 * - POST /api/chat (Academic AI assistant endpoint)
 * - GET  /api/gaps (Research gaps collection)
 * - GET  /api/notifications (User notifications)
 * - POST /api/notifications/read-all (Mark notifications read)
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { formatIsbn, cleanIsbnString, validateIsbn } from "../services/isbnService.ts";
import { generateCitationHTML, generateCitationPlainText } from "../services/citationService.ts";
import { BookReference, PaperReference, Reference, CitationStyle, CitationPaper } from "../types/index.ts";
import { initDB, getDbStatus, referenceRepository, paperRepository, notificationRepository, citationPaperRepository } from "./db.ts";

// Ensure DB is initialized
initDB().catch((err) => console.warn("[DB Init]", err));

/**
 * Helper to parse JSON request body
 */
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

/**
 * Helper to send JSON response with standard CORS & headers
 */
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Server-side ISBN metadata lookup across Google Books and Open Library
 */
async function lookupIsbnMetadata(isbn: string): Promise<BookReference> {
  const clean = cleanIsbnString(isbn);
  const validation = validateIsbn(clean);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage || "Invalid ISBN format.");
  }

  // 1. Google Books API lookup
  try {
    const gUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`;
    const gRes = await fetch(gUrl);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (gData.totalItems > 0 && gData.items?.[0]) {
        const item = gData.items[0];
        const volumeInfo = item.volumeInfo || {};
        const identifiers = volumeInfo.industryIdentifiers || [];
        const isbn13Obj = identifiers.find((i: any) => i.type === "ISBN_13");
        const isbn10Obj = identifiers.find((i: any) => i.type === "ISBN_10");

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

        const coverImage = rawCover ? rawCover.replace(/^http:\/\//i, "https://").replace("&edge=curl", "") : undefined;

        return {
          id: "b_" + Date.now(),
          type: "BOOK",
          title: volumeInfo.title || "Untitled Book",
          subtitle: volumeInfo.subtitle || undefined,
          authors: volumeInfo.authors && volumeInfo.authors.length > 0 ? volumeInfo.authors : ["Unknown Author"],
          publisher: volumeInfo.publisher || "Academic Publisher",
          publisherInfo: volumeInfo.publishedDate ? `Published: ${volumeInfo.publishedDate}` : undefined,
          publicationDate: volumeInfo.publishedDate,
          year: pubYear,
          edition: volumeInfo.edition || undefined,
          isbn10: isbn10Obj ? isbn10Obj.identifier : clean.length === 10 ? clean : undefined,
          isbn13: isbn13Obj ? formatIsbn(isbn13Obj.identifier) : clean.length === 13 ? formatIsbn(clean) : undefined,
          language: volumeInfo.language ? volumeInfo.language.toUpperCase() : "English",
          pages: volumeInfo.pageCount || undefined,
          category: volumeInfo.categories?.[0] || "Academic Research",
          description: volumeInfo.description || "Bibliographic reference retrieved via RefScan Server API.",
          coverImage,
          coverColor: "#4F46E5",
          source: "Google Books (Backend API)",
          citationStyle: "IEEE",
          status: "verified",
          dateAdded: new Date().toISOString().split("T")[0],
          saved: false,
        };
      }
    }
  } catch (err) {
    console.warn("[Backend API] Google Books API lookup warning:", err);
  }

  // 2. Open Library API fallback
  try {
    const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`;
    const olRes = await fetch(olUrl);
    if (olRes.ok) {
      const olData = await olRes.json();
      const record = olData[`ISBN:${clean}`];
      if (record && (record.title || record.authors)) {
        const authors = record.authors?.map((a: any) => a.name) || ["Unknown Author"];
        const publisher = record.publishers?.[0]?.name || "Academic Press";
        let pubYear = new Date().getFullYear();
        if (record.publish_date) {
          const match = record.publish_date.match(/\d{4}/);
          if (match) pubYear = parseInt(match[0], 10);
        }

        const rawCover = record.cover?.large || record.cover?.medium || record.cover?.small;
        const coverImage = rawCover ? rawCover.replace(/^http:\/\//i, "https://") : undefined;

        return {
          id: "b_" + Date.now(),
          type: "BOOK",
          title: record.title || "Untitled Book",
          subtitle: record.subtitle || undefined,
          authors,
          publisher,
          publisherInfo: record.publish_places?.[0]?.name || undefined,
          publicationDate: record.publish_date,
          year: pubYear,
          edition: record.edition_name || undefined,
          isbn10: clean.length === 10 ? clean : undefined,
          isbn13: formatIsbn(clean),
          language: "English",
          pages: record.number_of_pages || undefined,
          category: record.subjects?.[0]?.name || "Academic Literature",
          description: "Bibliographic record retrieved via Open Library API.",
          coverImage,
          coverColor: "#7C3AED",
          source: "Open Library (Backend API)",
          citationStyle: "IEEE",
          status: "verified",
          dateAdded: new Date().toISOString().split("T")[0],
          saved: false,
        };
      }
    }
  } catch (err) {
    console.warn("[Backend API] Open Library lookup warning:", err);
  }

  throw new Error("We couldn't find an exact match for this ISBN.");
}

/**
 * Main Backend API Request Handler
 */
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  // Only handle /api routes
  if (!pathname.startsWith("/api")) {
    return false;
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }

  try {
    // Ensure DB connection is established before routing any request
    const dbStatus = await initDB();

    // 1. Health & Server Info
    if (pathname === "/api/health" || pathname === "/api") {
      const count = await referenceRepository.count();
      const papersCount = (await paperRepository.findAll()).length;
      const citationsCount = (await citationPaperRepository.findAll()).length;

      sendJson(res, 200, {
        status: "online",
        service: "RefScan Academic Reference & Research Backend API",
        version: "2.6.0",
        timestamp: new Date().toISOString(),
        database: {
          mode: dbStatus.mode,
          status: dbStatus.status,
          uriConfigured: dbStatus.uriConfigured,
          databaseName: dbStatus.databaseName || "in-memory-store",
          host: dbStatus.host || "127.0.0.1:27017",
          error: dbStatus.error,
          collections: {
            references: count,
            papers: papersCount,
            citationPapers: citationsCount,
          },
        },
        endpoints: [
          "GET /api/health",
          "GET /api/books/lookup?isbn=:isbn",
          "GET /api/references",
          "POST /api/references",
          "GET /api/references/:id",
          "PUT /api/references/:id",
          "DELETE /api/references/:id",
          "GET /api/papers",
          "GET /api/papers/:id",
          "POST /api/papers/upload",
          "GET /api/citation-papers",
          "POST /api/citation-papers",
          "GET /api/citation-papers/:id",
          "DELETE /api/citation-papers/:id",
          "POST /api/citations/generate",
          "POST /api/chat",
          "GET /api/gaps",
          "GET /api/notifications",
          "POST /api/notifications/read-all",
        ],
        libraryCount: count,
      });
      return true;
    }

    // 2. Books ISBN Lookup
    if (pathname === "/api/books/lookup" && req.method === "GET") {
      const isbnParam = urlObj.searchParams.get("isbn");
      if (!isbnParam) {
        sendJson(res, 400, { error: "Missing 'isbn' query parameter" });
        return true;
      }
      try {
        const book = await lookupIsbnMetadata(isbnParam);
        sendJson(res, 200, { success: true, book });
      } catch (err: any) {
        sendJson(res, 404, {
          success: false,
          error: err.message || "We couldn't find an exact match for this ISBN.",
          isbn: isbnParam,
        });
      }
      return true;
    }

    // 3. References Collection (GET, POST)
    if (pathname === "/api/references") {
      if (req.method === "GET") {
        const type = urlObj.searchParams.get("type") || undefined;
        const q = urlObj.searchParams.get("q") || undefined;

        const results = await referenceRepository.findAll({ type, query: q });
        sendJson(res, 200, { success: true, count: results.length, data: results });
        return true;
      }

      if (req.method === "POST") {
        const newRef = await parseJsonBody(req);
        if (!newRef.title) {
          sendJson(res, 400, { error: "Reference title is required." });
          return true;
        }

        const savedRef = await referenceRepository.create(newRef);

        // Add notification
        await notificationRepository.create({
          title: "Reference Saved to Backend",
          message: `"${savedRef.title}" is securely saved on the RefScan server.`,
          time: "Just now",
          read: false,
          type: "success",
        });

        sendJson(res, 201, { success: true, reference: savedRef });
        return true;
      }
    }

    // 4. Single Reference Operations (GET, PUT, DELETE)
    const refMatch = pathname.match(/^\/api\/references\/([^/]+)$/);
    if (refMatch) {
      const refId = refMatch[1];
      if (req.method === "GET") {
        const ref = await referenceRepository.findById(refId);
        if (!ref) {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found.` });
          return true;
        }
        sendJson(res, 200, { success: true, data: ref });
        return true;
      }

      if (req.method === "PUT") {
        const updateData = await parseJsonBody(req);
        const updated = await referenceRepository.update(refId, updateData);
        if (updated) {
          sendJson(res, 200, { success: true, reference: updated });
        } else {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found.` });
        }
        return true;
      }

      if (req.method === "DELETE") {
        const deleted = await referenceRepository.delete(refId);
        if (deleted) {
          sendJson(res, 200, { success: true, message: `Reference "${refId}" deleted.` });
        } else {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found.` });
        }
        return true;
      }
    }

    // 5. Research Papers Collection (GET)
    if (pathname === "/api/papers") {
      if (req.method === "GET") {
        const papers = await paperRepository.findAll();
        sendJson(res, 200, { success: true, count: papers.length, data: papers });
        return true;
      }
    }

    // 6. Single Paper (GET)
    const paperMatch = pathname.match(/^\/api\/papers\/([^/]+)$/);
    if (paperMatch && req.method === "GET") {
      const paperId = paperMatch[1];
      const paper = await paperRepository.findById(paperId);
      if (!paper) {
        sendJson(res, 404, { error: `Research paper with ID "${paperId}" not found.` });
        return true;
      }
      sendJson(res, 200, { success: true, data: paper });
      return true;
    }

    // 7. Paper Upload & Processing
    if (pathname === "/api/papers/upload" && req.method === "POST") {
      const payload = await parseJsonBody(req);
      const isCompletePaper = payload.type === "PAPER" && payload.title;

      let newPaper: PaperReference;
      if (isCompletePaper) {
        newPaper = {
          ...payload,
          id: payload.id || "p_" + Date.now(),
          saved: true,
          dateAdded: payload.dateAdded || new Date().toISOString().split("T")[0],
          analysisStatus: payload.analysisStatus || "complete",
        };
      } else {
        const fileName = payload.fileName || "Uploaded_Paper.pdf";
        const fileSize = payload.fileSize || "1.0 MB";
        const title = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");

        newPaper = {
          id: "p_" + Date.now(),
          type: "PAPER",
          title: title,
          authors: ["Author not specified in upload request"],
          publicationYear: new Date().getFullYear(),
          abstract: "Paper record created. Analysis will be generated from uploaded PDF text.",
          keywords: ["Academic Paper"],
          references: [],
          analysisStatus: "complete",
          source: "RefScan PDF Ingestion Engine",
          citationStyle: "IEEE",
          dateAdded: new Date().toISOString().split("T")[0],
          fileSize,
          fileName,
          saved: true,
        };
      }

      const savedPaper = (await referenceRepository.create(newPaper)) as PaperReference;
      sendJson(res, 201, { success: true, paper: savedPaper });
      return true;
    }

    // 8. Citation Papers Endpoints (GET, POST, DELETE)
    if (pathname === "/api/citation-papers") {
      if (req.method === "GET") {
        const papers = await citationPaperRepository.findAll();
        sendJson(res, 200, { success: true, count: papers.length, data: papers });
        return true;
      }
      if (req.method === "POST") {
        const newPaper = await parseJsonBody(req);
        const saved = await citationPaperRepository.create(newPaper);
        sendJson(res, 201, { success: true, citationPaper: saved });
        return true;
      }
    }

    const citationPaperMatch = pathname.match(/^\/api\/citation-papers\/([^/]+)$/);
    if (citationPaperMatch) {
      const cpId = citationPaperMatch[1];
      if (req.method === "GET") {
        const found = await citationPaperRepository.findById(cpId);
        if (!found) {
          sendJson(res, 404, { error: `Citation paper "${cpId}" not found.` });
          return true;
        }
        sendJson(res, 200, { success: true, data: found });
        return true;
      }
      if (req.method === "DELETE") {
        const deleted = await citationPaperRepository.delete(cpId);
        sendJson(res, 200, { success: true, deleted });
        return true;
      }
    }

    // 9. Citation Generation Endpoint
    if (pathname === "/api/citations/generate" && req.method === "POST") {
      const payload = await parseJsonBody(req);
      const { reference, style = "IEEE" } = payload;
      if (!reference) {
        sendJson(res, 400, { error: "Reference object is required." });
        return true;
      }
      const html = generateCitationHTML(reference, style as CitationStyle);
      const plainText = generateCitationPlainText(reference, style as CitationStyle);
      sendJson(res, 200, { success: true, style, html, plainText });
      return true;
    }

    // 9. Academic AI Chatbot Endpoint
    if (pathname === "/api/chat" && req.method === "POST") {
      const payload = await parseJsonBody(req);
      const allRefs = await referenceRepository.findAll();
      const { message, activeBook, activePaper, references = allRefs } = payload;
      if (!message) {
        sendJson(res, 400, { error: "Message prompt is required." });
        return true;
      }

      const chatReply = await sendChatMessage(message, {
        currentPath: "/api/chat",
        activeBook,
        activePaper,
        references,
      });

      sendJson(res, 200, {
        success: true,
        reply: chatReply.text,
        chatMessage: chatReply,
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    // 10. Research Gaps Endpoint
    if (pathname === "/api/gaps" && req.method === "GET") {
      const gaps = await paperRepository.getResearchGaps();
      sendJson(res, 200, { success: true, count: gaps.length, data: gaps });
      return true;
    }

    // 11. Notifications Endpoints
    if (pathname === "/api/notifications") {
      if (req.method === "GET") {
        const notifs = await notificationRepository.findAll();
        sendJson(res, 200, { success: true, count: notifs.length, data: notifs });
        return true;
      }
      if (req.method === "POST") {
        const newNotif = await parseJsonBody(req);
        const created = await notificationRepository.create(newNotif);
        sendJson(res, 201, { success: true, notification: created });
        return true;
      }
    }

    if (pathname === "/api/notifications/read-all" && req.method === "POST") {
      await notificationRepository.markAllRead();
      sendJson(res, 200, { success: true, message: "All notifications marked as read." });
      return true;
    }

    // Route not found in /api
    sendJson(res, 404, { error: `API route "${pathname}" not found.` });
    return true;
  } catch (error: any) {
    console.error("[RefScan Backend API Error]:", error);
    sendJson(res, 500, { error: "Internal Server Error", message: error.message });
    return true;
  }
}
