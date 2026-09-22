/**
 * RefScan - Database Connection & Repository Manager
 * Connects to MongoDB Community Server (port 27017) using the official MongoClient driver.
 * Supports automatic reconnection, connection pooling, and seamless in-memory fallback.
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
  status: "connected" | "in-memory" | "disconnected";
  mode: "mongodb" | "in-memory";
  uriConfigured: boolean;
  databaseName: string;
  host?: string;
  timestamp: string;
  error?: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;

let dbState: DbStatusInfo = {
  status: "in-memory",
  mode: "in-memory",
  uriConfigured: false,
  databaseName: "in-memory-store",
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
    }
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/refscan";
    dbState.uriConfigured = Boolean(process.env.MONGODB_URI);

    try {
      console.log(`[Database] Attempting connection to MongoDB at: ${mongoUri.replace(/:[^:@]+@/, ":****@")}`);
      
      const newClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000,
        socketTimeoutMS: 10000,
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

      // Create collections if they do not exist, and set up indexes
      const collections = await db.listCollections().toArray();
      const colNames = collections.map((c) => c.name);

      if (!colNames.includes("references")) {
        await db.createCollection("references");
      }
      if (!colNames.includes("papers")) {
        await db.createCollection("papers");
      }
      if (!colNames.includes("citationPapers")) {
        await db.createCollection("citationPapers");
      }
      if (!colNames.includes("users")) {
        await db.createCollection("users");
      }

      // Create indexes for efficient querying
      try {
        await db.collection("references").createIndex({ id: 1 }, { unique: true });
        await db.collection("references").createIndex({ type: 1 });
        await db.collection("references").createIndex({ title: "text", authors: "text" });
        await db.collection("papers").createIndex({ id: 1 }, { unique: true });
        await db.collection("citationPapers").createIndex({ id: 1 }, { unique: true });
        await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
      } catch (idxErr) {
        // Non-fatal if indexes already exist
      }

      dbState = {
        status: "connected",
        mode: "mongodb",
        uriConfigured: true,
        databaseName: dbName,
        host: urlParsed.host || "127.0.0.1:27017",
        timestamp: new Date().toISOString(),
      };

      console.log(`[Database] Successfully connected to MongoDB database "${dbName}"! Persistent storage active.`);
      return dbState;
    } catch (err: any) {
      console.warn(`[Database] MongoDB connection error (${err.message}). Using in-memory fallback.`);
      client = null;
      db = null;
      dbState = {
        status: "in-memory",
        mode: "in-memory",
        uriConfigured: Boolean(process.env.MONGODB_URI),
        databaseName: "in-memory-store",
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
 * Get connected MongoDB database instance (or null if in-memory mode)
 */
export function getDb(): Db | null {
  return db;
}

/**
 * Safe collection accessor
 */
export function getCollection<T = any>(name: "references" | "papers" | "citationPapers" | "users"): Collection<T> | null {
  if (db && dbState.status === "connected") {
    return db.collection<T>(name);
  }
  return null;
}

export { referenceRepository, paperRepository, notificationRepository, citationPaperRepository } from "./models/Reference.ts";
