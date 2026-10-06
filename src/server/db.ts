/**
 * RefScan - Database Connection & Repository Manager
 * Connects directly to MongoDB Community Server (port 27017) or remote MongoDB Atlas URI.
 * Strict persistence: In-memory fallback is disabled for production application data.
 * If MongoDB is offline, operations throw DatabaseUnavailableError (HTTP 503).
 */

import { MongoClient, Db, Collection } from "mongodb";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Safely load .env from project root if present
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }
} catch (e) {
  // Silent fallback
}

export interface DbStatusInfo {
  status: "connected" | "disconnected";
  mode: "mongodb";
  uriConfigured: boolean;
  databaseName: string;
  host?: string;
  timestamp: string;
  error?: string;
}

export class DatabaseUnavailableError extends Error {
  statusCode: number = 503;
  constructor(message = "MongoDB Database service is unavailable. Persistent storage is offline.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

let client: MongoClient | null = null;
let db: Db | null = null;

let dbState: DbStatusInfo = {
  status: "disconnected",
  mode: "mongodb",
  uriConfigured: Boolean(process.env.MONGODB_URI),
  databaseName: "refscan",
  timestamp: new Date().toISOString(),
};

let connectionPromise: Promise<DbStatusInfo> | null = null;

/**
 * Initialize MongoDB connection
 * Reads MONGODB_URI (defaults to mongodb://127.0.0.1:27017/refscan)
 */
export async function initDB(): Promise<DbStatusInfo> {
  if (db && client) {
    try {
      // Ping database to verify connection is still alive
      await db.command({ ping: 1 });
      dbState.status = "connected";
      dbState.timestamp = new Date().toISOString();
      return dbState;
    } catch {
      // Reconnect if dropped
      db = null;
      client = null;
      dbState.status = "disconnected";
    }
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/refscan";
    dbState.uriConfigured = Boolean(process.env.MONGODB_URI);

    try {
      console.log(`[Database] Connecting to MongoDB at: ${mongoUri.replace(/:[^:@]+@/, ":****@")}`);

      const newClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 15000,
      });

      await newClient.connect();
      client = newClient;

      // Extract database name from URI or default to "refscan"
      const urlParsed = new URL(mongoUri.replace("mongodb://", "http://"));
      const pathDb = urlParsed.pathname.replace(/^\//, "");
      const dbName = pathDb || "refscan";
      db = client.db(dbName);

      // Verify connection with ping
      await db.command({ ping: 1 });

      // Create collections if they do not exist
      const collections = await db.listCollections().toArray();
      const colNames = collections.map((c) => c.name);

      if (!colNames.includes("users")) {
        await db.createCollection("users");
      }
      if (!colNames.includes("references")) {
        await db.createCollection("references");
      }
      if (!colNames.includes("papers")) {
        await db.createCollection("papers");
      }
      if (!colNames.includes("citationPapers")) {
        await db.createCollection("citationPapers");
      }
      if (!colNames.includes("notifications")) {
        await db.createCollection("notifications");
      }

      // Create compound & unique indexes for multi-user isolation & performance
      const safeCreateIndex = async (colName: string, spec: any, options?: any) => {
        try {
          await db!.collection(colName).createIndex(spec, options);
        } catch (idxErr: any) {
          // Ignore IndexOptionsConflict (85) or IndexKeySpecsConflict (86) when index already exists
          if (idxErr?.code !== 85 && idxErr?.code !== 86) {
            console.warn(`[Database] Index notice on ${colName}:`, idxErr?.message || idxErr);
          }
        }
      };

      await safeCreateIndex("users", { email: 1 }, { unique: true, sparse: true });
      await safeCreateIndex("users", { id: 1 }, { unique: true });

      // References: user scoped indexes
      await safeCreateIndex("references", { userId: 1, id: 1 });
      await safeCreateIndex("references", { userId: 1, type: 1 });
      await safeCreateIndex("references", { userId: 1, dateAdded: -1 });
      await safeCreateIndex("references", { title: "text", authors: "text" });

      // Papers: user scoped
      await safeCreateIndex("papers", { userId: 1, id: 1 });
      await safeCreateIndex("papers", { userId: 1, dateAdded: -1 });

      // Citation Papers: user scoped
      await safeCreateIndex("citationPapers", { userId: 1, id: 1 });
      await safeCreateIndex("citationPapers", { userId: 1, createdAt: -1 });

      // Notifications: user scoped
      await safeCreateIndex("notifications", { userId: 1, time: -1 });

      dbState = {
        status: "connected",
        mode: "mongodb",
        uriConfigured: true,
        databaseName: dbName,
        host: urlParsed.host || "127.0.0.1:27017",
        timestamp: new Date().toISOString(),
      };

      console.log(`[Database] Successfully connected to MongoDB database "${dbName}". Strict multi-user persistence active.`);
      return dbState;
    } catch (err: any) {
      console.error(`[Database] CRITICAL: MongoDB connection failed (${err.message}). In-memory fallback is disabled.`);
      client = null;
      db = null;
      dbState = {
        status: "disconnected",
        mode: "mongodb",
        uriConfigured: Boolean(process.env.MONGODB_URI),
        databaseName: "refscan",
        timestamp: new Date().toISOString(),
        error: err.message,
      };
      return dbState;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Get current database status
 */
export function getDbStatus(): DbStatusInfo {
  return dbState;
}

/**
 * Get connected MongoDB database instance or throw 503
 */
export function getDbOrThrow(): Db {
  if (!db || dbState.status !== "connected") {
    throw new DatabaseUnavailableError(
      dbState.error 
        ? `MongoDB is currently unreachable: ${dbState.error}`
        : "MongoDB database service is disconnected. Persistent storage is required."
    );
  }
  return db;
}

/**
 * Safe collection accessor that throws DatabaseUnavailableError if DB is offline
 */
export function getCollection<T extends import("mongodb").Document = any>(
  name: "references" | "papers" | "citationPapers" | "users" | "notifications"
): Collection<T> {
  const database = getDbOrThrow();
  return database.collection<T>(name);
}

export { referenceRepository, paperRepository, notificationRepository, citationPaperRepository } from "./models/Reference.ts";
export { userRepository } from "./models/User.ts";
