/**
 * RefScan - User Model, Security & Repository
 * Handles MongoDB user persistence, bcryptjs password hashing, JWT generation & verification,
 * and admin user management with strict passwordHash omission.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserDocument, SafeUser, UserRole } from "../../types/index.ts";
import { getCollection } from "../db.ts";

const JWT_SECRET = process.env.JWT_SECRET || "refscan_academic_jwt_secret_2026_super_secure_key";
const JWT_EXPIRES_IN = "7d";
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Remove MongoDB _id and passwordHash to produce a safe user object
 */
export function toSafeUser(doc: any): SafeUser {
  if (!doc) return doc;
  const { _id, passwordHash, ...rest } = doc;
  return rest as SafeUser;
}

/**
 * Hash a plain text password with bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Sign a secure JWT session token containing user id, email, and role
 */
export function signToken(user: SafeUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT session token and return decoded payload
 */
export function verifyToken(token: string): { id: string; email: string; role: UserRole; name: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id && decoded.email) {
      return {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || "researcher",
        name: decoded.name || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * User Repository for MongoDB-backed authentication & management
 */
export const userRepository = {
  /**
   * Find user document by normalized email (includes passwordHash for auth)
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const col = getCollection<UserDocument>("users");
    const normalized = email.trim().toLowerCase();
    const doc = await col.findOne({ email: normalized });
    return doc || null;
  },

  /**
   * Find user document by unique string id (excludes passwordHash)
   */
  async findById(id: string): Promise<SafeUser | null> {
    const col = getCollection<UserDocument>("users");
    const doc = await col.findOne({ id }, { projection: { passwordHash: 0, _id: 0 } });
    return (doc as SafeUser) || null;
  },

  /**
   * Find full user document by unique string id (internal use, includes passwordHash)
   */
  async findFullById(id: string): Promise<UserDocument | null> {
    const col = getCollection<UserDocument>("users");
    const doc = await col.findOne({ id });
    return doc || null;
  },

  /**
   * Register a new user in MongoDB
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    title?: string;
    institution?: string;
    role?: UserRole;
  }): Promise<{ user: SafeUser; token: string }> {
    const col = getCollection<UserDocument>("users");
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if email already exists
    const existing = await col.findOne({ email: normalizedEmail });
    if (existing) {
      throw new Error(`An account with email "${normalizedEmail}" already exists.`);
    }

    // Determine role: if this is the first registered user, designate as admin
    const totalUsers = await col.countDocuments();
    const assignedRole: UserRole = data.role || (totalUsers === 0 ? "admin" : "researcher");

    const hashedPassword = await hashPassword(data.password);
    const now = new Date().toISOString();
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newUserDoc: UserDocument = {
      id: newId,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      title: data.title?.trim() || "Academic Researcher",
      institution: data.institution?.trim() || "Academic Research Institution",
      role: assignedRole,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await col.insertOne(newUserDoc);

    const safe = toSafeUser(newUserDoc);
    const token = signToken(safe);

    console.log(`[UserRepository] Registered new user "${safe.email}" with role "${safe.role}" (ID: ${safe.id}).`);
    return { user: safe, token };
  },

  /**
   * Authenticate user against MongoDB and return safe profile + JWT
   */
  async authenticate(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
    const col = getCollection<UserDocument>("users");
    const normalizedEmail = email.trim().toLowerCase();

    const user = await col.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password.");
    }

    const now = new Date().toISOString();
    await col.updateOne({ id: user.id }, { $set: { lastLoginAt: now, updatedAt: now } });

    const safe = toSafeUser({ ...user, lastLoginAt: now });
    const token = signToken(safe);

    console.log(`[UserRepository] User "${safe.email}" authenticated successfully.`);
    return { user: safe, token };
  },

  /**
   * List all registered users (for Admin use only, never returns passwordHash)
   */
  async findAll(search?: string): Promise<SafeUser[]> {
    const col = getCollection<UserDocument>("users");
    const filter: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { institution: { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await col
      .find(filter, { projection: { passwordHash: 0, _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return docs as SafeUser[];
  },

  /**
   * Update user details (name, title, institution, role)
   * Prevents accidental password overwrite
   */
  async update(id: string, updateData: Partial<UserDocument>): Promise<SafeUser | null> {
    const col = getCollection<UserDocument>("users");

    // Whitelist allowed update fields
    const safeUpdates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.name !== undefined) safeUpdates.name = updateData.name.trim();
    if (updateData.title !== undefined) safeUpdates.title = updateData.title.trim();
    if (updateData.institution !== undefined) safeUpdates.institution = updateData.institution.trim();
    if (updateData.role !== undefined) safeUpdates.role = updateData.role;

    // If explicit new password provided, hash it
    if ((updateData as any).newPassword) {
      safeUpdates.passwordHash = await hashPassword((updateData as any).newPassword);
    }

    const res = await col.findOneAndUpdate(
      { id },
      { $set: safeUpdates },
      { returnDocument: "after", projection: { passwordHash: 0, _id: 0 } }
    );

    return (res as SafeUser) || null;
  },

  /**
   * Delete user and cascade delete their owned data
   */
  async delete(id: string): Promise<boolean> {
    const col = getCollection<UserDocument>("users");
    const result = await col.deleteOne({ id });
    const deleted = result.deletedCount > 0;

    if (deleted) {
      // Cascade cleanup user's isolated documents
      try {
        const refsCol = getCollection("references");
        const papersCol = getCollection("papers");
        const citationsCol = getCollection("citationPapers");
        const notifsCol = getCollection("notifications");

        await refsCol.deleteMany({ userId: id });
        await papersCol.deleteMany({ userId: id });
        await citationsCol.deleteMany({ userId: id });
        await notifsCol.deleteMany({ userId: id });
        console.log(`[UserRepository] Cascaded cleanup for deleted user "${id}".`);
      } catch (cascadeErr) {
        console.warn("[UserRepository] Warning during cascade cleanup:", cascadeErr);
      }
    }

    return deleted;
  },

  /**
   * Count total registered users
   */
  async count(): Promise<number> {
    const col = getCollection<UserDocument>("users");
    return await col.countDocuments();
  },
};

