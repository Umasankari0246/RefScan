/**
 * RefScan Backend API Handler
 * RESTful backend API for RefScan with real MongoDB persistence, JWT authentication,
 * and strict multi-user data isolation.
 *
 * Endpoints:
 * Public:
 * - GET  /api/health (System & DB connection health)
 * - GET  /api/books/lookup?isbn= (Public ISBN bibliographic lookup)
 * - POST /api/citations/generate (Pure citation formatting utility)
 *
 * Authentication:
 * - POST /api/auth/register (Register new MongoDB user, password hashed with bcryptjs)
 * - POST /api/auth/login (Authenticate against MongoDB, returns JWT token)
 * - GET  /api/auth/me (Get current authenticated user profile)
 * - POST /api/auth/logout (Session termination)
 *
 * User Management (Admin Protected):
 * - GET    /api/users (List all registered users from MongoDB)
 * - GET    /api/users/:id (Get single user profile)
 * - PUT    /api/users/:id (Update user profile/role)
 * - DELETE /api/users/:id (Delete user and cascade delete user's data)
 *
 * Scoped User Workspace (Requires Bearer JWT, scoped by req.user.id):
 * - GET    /api/references
 * - POST   /api/references
 * - GET    /api/references/:id
 * - PUT    /api/references/:id
 * - DELETE /api/references/:id
 * - GET    /api/papers
 * - GET    /api/papers/:id
 * - POST   /api/papers/upload
 * - GET    /api/citation-papers
 * - POST   /api/citation-papers
 * - GET    /api/citation-papers/:id
 * - DELETE /api/citation-papers/:id
 * - GET    /api/gaps
 * - GET    /api/notifications
 * - POST   /api/notifications/read-all
 * - POST   /api/chat
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { formatIsbn, cleanIsbnString, validateIsbn } from "../services/isbnService.ts";
import { generateCitationHTML, generateCitationPlainText } from "../services/citationService.ts";
import { sendChatMessage } from "../services/chatbotService.ts";
import { BookReference, PaperReference, CitationStyle, SafeUser } from "../types/index.ts";
import {
  initDB,
  getDbStatus,
  DatabaseUnavailableError,
  referenceRepository,
  paperRepository,
  notificationRepository,
  citationPaperRepository,
  userRepository,
} from "./db.ts";
import { verifyToken } from "./models/User.ts";

// Initialize DB on server startup
initDB().catch((err) => console.warn("[DB Init Startup]", err.message));

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
 * Extract authenticated user from Authorization: Bearer <token>
 */
async function getAuthenticatedUser(req: IncomingMessage): Promise<SafeUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;

  try {
    const user = await userRepository.findById(payload.id);
    return user;
  } catch (err) {
    console.warn("[Auth Middleware] Could not fetch user from DB:", err);
    return null;
  }
}

/**
 * Require valid authenticated user or send 401 Unauthorized
 */
async function requireAuth(req: IncomingMessage, res: ServerResponse): Promise<SafeUser | null> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    sendJson(res, 401, {
      error: "Unauthorized",
      message: "A valid Bearer authentication token is required to access this resource.",
    });
    return null;
  }
  return user;
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
  let pathname = urlObj.pathname;

  // Seamlessly normalize duplicate /api/api/ if sent by client
  if (pathname.startsWith("/api/api/")) {
    pathname = pathname.replace(/^\/api\/api\//, "/api/");
  }

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
    // Ensure DB connection is initialized
    const dbStatus = await initDB();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. PUBLIC: Health & Server Info
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/health" || pathname === "/api") {
      let usersCount = 0;
      if (dbStatus.status === "connected") {
        try {
          usersCount = await userRepository.count();
        } catch {
          // Non fatal
        }
      }

      sendJson(res, 200, {
        status: dbStatus.status === "connected" ? "online" : "degraded",
        service: "RefScan Academic Reference & Research Backend API",
        version: "3.0.0",
        timestamp: new Date().toISOString(),
        database: {
          mode: dbStatus.mode,
          status: dbStatus.status,
          uriConfigured: dbStatus.uriConfigured,
          databaseName: dbStatus.databaseName,
          host: dbStatus.host,
          error: dbStatus.error,
          registeredUsers: usersCount,
        },
        security: {
          multiUserIsolation: true,
          passwordHashing: "bcryptjs",
          sessionAuth: "JWT Bearer",
          inMemoryFallback: false,
        },
      });
      return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PUBLIC: Books ISBN Lookup
    // ──────────────────────────────────────────────────────────────────────────
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

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PUBLIC: Citation Generation Utility
    // ──────────────────────────────────────────────────────────────────────────
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

    // ──────────────────────────────────────────────────────────────────────────
    // 4. AUTHENTICATION ENDPOINTS
    // ──────────────────────────────────────────────────────────────────────────

    // POST /api/auth/register
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { name, email, password, title, institution, role } = body;

      if (!name || typeof name !== "string" || !name.trim()) {
        sendJson(res, 400, { error: "Validation Error", message: "Full name is required." });
        return true;
      }
      if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
        sendJson(res, 400, { error: "Validation Error", message: "A valid email address is required." });
        return true;
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        sendJson(res, 400, { error: "Validation Error", message: "Password must be at least 6 characters long." });
        return true;
      }

      try {
        const { user, token } = await userRepository.create({
          name,
          email,
          password,
          title,
          institution,
          role,
        });

        // Create a welcome notification for this newly registered user in MongoDB
        try {
          await notificationRepository.create(
            {
              title: "Welcome to RefScan!",
              message: `Your academic workspace is set up and protected with multi-user isolation.`,
              time: "Just now",
              read: false,
              type: "success",
            },
            user.id
          );
        } catch {
          // Non-fatal
        }

        sendJson(res, 201, {
          success: true,
          message: "Registration successful. Welcome to RefScan!",
          user,
          token,
        });
      } catch (err: any) {
        const statusCode = err.message.includes("already exists") ? 409 : 400;
        sendJson(res, statusCode, { error: "Registration Failed", message: err.message });
      }
      return true;
    }

    // POST /api/auth/login
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        sendJson(res, 400, { error: "Validation Error", message: "Email and password are required." });
        return true;
      }

      try {
        const { user, token } = await userRepository.authenticate(email, password);
        sendJson(res, 200, {
          success: true,
          message: "Authentication successful.",
          user,
          token,
        });
      } catch (err: any) {
        sendJson(res, 401, { error: "Authentication Failed", message: err.message || "Invalid credentials." });
      }
      return true;
    }

    // GET /api/auth/me
    if (pathname === "/api/auth/me" && req.method === "GET") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      sendJson(res, 200, {
        success: true,
        user: authUser,
      });
      return true;
    }

    // POST /api/auth/logout
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      sendJson(res, 200, {
        success: true,
        message: "Session terminated successfully.",
      });
      return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. USER MANAGEMENT ENDPOINTS (Admin Protected)
    // ──────────────────────────────────────────────────────────────────────────

    // GET /api/users - ADMIN ONLY
    if (pathname === "/api/users" && req.method === "GET") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      // Restrict full directory view to administrators
      if (authUser.role !== "admin") {
        sendJson(res, 403, {
          error: "Forbidden",
          message: "Access restricted. Administrator privileges are required to view the Users directory.",
        });
        return true;
      }

      const q = urlObj.searchParams.get("q") || undefined;
      const users = await userRepository.findAll(q);
      sendJson(res, 200, {
        success: true,
        count: users.length,
        users,
      });
      return true;
    }

    // Single User CRUD: /api/users/:id
    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch) {
      const targetUserId = userMatch[1];
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      // GET /api/users/:id
      if (req.method === "GET") {
        if (authUser.role !== "admin" && authUser.id !== targetUserId) {
          sendJson(res, 403, { error: "Forbidden", message: "You can only view your own user profile." });
          return true;
        }

        const found = await userRepository.findById(targetUserId);
        if (!found) {
          sendJson(res, 404, { error: "Not Found", message: `User "${targetUserId}" not found.` });
          return true;
        }
        sendJson(res, 200, { success: true, user: found });
        return true;
      }

      // PUT /api/users/:id
      if (req.method === "PUT") {
        if (authUser.role !== "admin" && authUser.id !== targetUserId) {
          sendJson(res, 403, { error: "Forbidden", message: "You can only edit your own user profile." });
          return true;
        }

        const updateData = await parseJsonBody(req);
        // Non-admins cannot promote themselves or alter roles
        if (authUser.role !== "admin" && updateData.role) {
          delete updateData.role;
        }

        const updated = await userRepository.update(targetUserId, updateData);
        if (!updated) {
          sendJson(res, 404, { error: "Not Found", message: `User "${targetUserId}" not found.` });
          return true;
        }
        sendJson(res, 200, { success: true, user: updated });
        return true;
      }

      // DELETE /api/users/:id (Admin only)
      if (req.method === "DELETE") {
        if (authUser.role !== "admin") {
          sendJson(res, 403, { error: "Forbidden", message: "Only administrators can delete user accounts." });
          return true;
        }

        // Prevent self-deletion if current admin
        if (authUser.id === targetUserId) {
          sendJson(res, 400, { error: "Bad Request", message: "Administrators cannot delete their own active account." });
          return true;
        }

        const deleted = await userRepository.delete(targetUserId);
        if (!deleted) {
          sendJson(res, 404, { error: "Not Found", message: `User "${targetUserId}" not found.` });
          return true;
        }
        sendJson(res, 200, { success: true, message: `User account "${targetUserId}" deleted.` });
        return true;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SCOPED REFERENCES COLLECTION (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/references") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const type = urlObj.searchParams.get("type") || undefined;
        const q = urlObj.searchParams.get("q") || undefined;

        const results = await referenceRepository.findAll(authUser.id, { type, query: q });
        sendJson(res, 200, { success: true, count: results.length, data: results });
        return true;
      }

      if (req.method === "POST") {
        const newRef = await parseJsonBody(req);
        if (!newRef.title) {
          sendJson(res, 400, { error: "Reference title is required." });
          return true;
        }

        const savedRef = await referenceRepository.create(newRef, authUser.id);

        // Add user-scoped notification
        await notificationRepository.create(
          {
            title: "Reference Saved to Workspace",
            message: `"${savedRef.title}" has been saved in your private library.`,
            time: "Just now",
            read: false,
            type: "success",
          },
          authUser.id
        );

        sendJson(res, 201, { success: true, reference: savedRef });
        return true;
      }
    }

    // Single Reference: /api/references/:id (Strictly req.user.id)
    const refMatch = pathname.match(/^\/api\/references\/([^/]+)$/);
    if (refMatch) {
      const refId = refMatch[1];
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const ref = await referenceRepository.findById(refId, authUser.id);
        if (!ref) {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found in your workspace.` });
          return true;
        }
        sendJson(res, 200, { success: true, data: ref });
        return true;
      }

      if (req.method === "PUT") {
        const updateData = await parseJsonBody(req);
        const updated = await referenceRepository.update(refId, updateData, authUser.id);
        if (updated) {
          sendJson(res, 200, { success: true, reference: updated });
        } else {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found in your workspace.` });
        }
        return true;
      }

      if (req.method === "DELETE") {
        const deleted = await referenceRepository.delete(refId, authUser.id);
        if (deleted) {
          sendJson(res, 200, { success: true, message: `Reference "${refId}" deleted from your workspace.` });
        } else {
          sendJson(res, 404, { error: `Reference with ID "${refId}" not found in your workspace.` });
        }
        return true;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. SCOPED RESEARCH PAPERS COLLECTION (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/papers") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const papers = await paperRepository.findAll(authUser.id);
        sendJson(res, 200, { success: true, count: papers.length, data: papers });
        return true;
      }
    }

    // Single Paper: /api/papers/:id (Strictly req.user.id)
    const paperMatch = pathname.match(/^\/api\/papers\/([^/]+)$/);
    if (paperMatch && req.method === "GET") {
      const paperId = paperMatch[1];
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      const paper = await paperRepository.findById(paperId, authUser.id);
      if (!paper) {
        sendJson(res, 404, { error: `Research paper with ID "${paperId}" not found in your workspace.` });
        return true;
      }
      sendJson(res, 200, { success: true, data: paper });
      return true;
    }

    // Paper Upload: /api/papers/upload (Strictly req.user.id)
    if (pathname === "/api/papers/upload" && req.method === "POST") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      const payload = await parseJsonBody(req);
      const isCompletePaper = payload.type === "PAPER" && payload.title;

      let newPaper: PaperReference;
      if (isCompletePaper) {
        newPaper = {
          ...payload,
          id: payload.id || "p_" + Date.now(),
          userId: authUser.id,
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
          userId: authUser.id,
          type: "PAPER",
          title: title,
          authors: ["Research Authors"],
          publicationYear: new Date().getFullYear(),
          abstract: `Academic investigation and structured analysis record for ${title}.`,
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

      const savedPaper = (await referenceRepository.create(newPaper, authUser.id)) as PaperReference;
      sendJson(res, 201, { success: true, paper: savedPaper });
      return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. SCOPED CITATION PAPERS (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/citation-papers") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const papers = await citationPaperRepository.findAll(authUser.id);
        sendJson(res, 200, { success: true, count: papers.length, data: papers });
        return true;
      }
      if (req.method === "POST") {
        const newPaper = await parseJsonBody(req);
        const saved = await citationPaperRepository.create(newPaper, authUser.id);
        sendJson(res, 201, { success: true, citationPaper: saved });
        return true;
      }
    }

    const citationPaperMatch = pathname.match(/^\/api\/citation-papers\/([^/]+)$/);
    if (citationPaperMatch) {
      const cpId = citationPaperMatch[1];
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const found = await citationPaperRepository.findById(cpId, authUser.id);
        if (!found) {
          sendJson(res, 404, { error: `Citation paper "${cpId}" not found in your workspace.` });
          return true;
        }
        sendJson(res, 200, { success: true, data: found });
        return true;
      }
      if (req.method === "DELETE") {
        const deleted = await citationPaperRepository.delete(cpId, authUser.id);
        sendJson(res, 200, { success: true, deleted });
        return true;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. SCOPED ACADEMIC AI CHATBOT (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/chat" && req.method === "POST") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      const payload = await parseJsonBody(req);
      // Ensure chatbot only accesses the authenticated user's isolated references
      const userRefs = await referenceRepository.findAll(authUser.id);
      const { message, activeBook, activePaper, references = userRefs } = payload;
      if (!message) {
        sendJson(res, 400, { error: "Message prompt is required." });
        return true;
      }

      // Filter context references so they must belong to this user
      const userSafeReferences = references.filter((r: any) => !r.userId || r.userId === authUser.id);

      const chatReply = await sendChatMessage(message, {
        currentPath: "/api/chat",
        activeBook,
        activePaper,
        references: userSafeReferences,
      });

      sendJson(res, 200, {
        success: true,
        reply: chatReply.text,
        chatMessage: chatReply,
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. SCOPED RESEARCH GAPS (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/gaps" && req.method === "GET") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      const gaps = await paperRepository.getResearchGaps(authUser.id);
      sendJson(res, 200, { success: true, count: gaps.length, data: gaps });
      return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. SCOPED NOTIFICATIONS (Strictly req.user.id)
    // ──────────────────────────────────────────────────────────────────────────
    if (pathname === "/api/notifications") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      if (req.method === "GET") {
        const notifs = await notificationRepository.findAll(authUser.id);
        sendJson(res, 200, { success: true, count: notifs.length, data: notifs });
        return true;
      }
      if (req.method === "POST") {
        const newNotif = await parseJsonBody(req);
        const created = await notificationRepository.create(newNotif, authUser.id);
        sendJson(res, 201, { success: true, notification: created });
        return true;
      }
    }

    if (pathname === "/api/notifications/read-all" && req.method === "POST") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return true;

      await notificationRepository.markAllRead(authUser.id);
      sendJson(res, 200, { success: true, message: "All notifications marked as read." });
      return true;
    }

    // Route not found in /api
    sendJson(res, 404, { error: `API route "${pathname}" not found.` });
    return true;
  } catch (error: any) {
    console.error("[RefScan Backend API Error]:", error);

    // If MongoDB is offline, return 503 Service Unavailable explicitly
    if (error instanceof DatabaseUnavailableError || error.statusCode === 503 || error.name === "DatabaseUnavailableError") {
      sendJson(res, 503, {
        error: "Database Service Unavailable",
        message: error.message || "The MongoDB database service is currently offline. In-memory fallback is disabled for data integrity.",
        retryAfterSeconds: 5,
      });
      return true;
    }

    sendJson(res, 500, { error: "Internal Server Error", message: error.message });
    return true;
  }
}
