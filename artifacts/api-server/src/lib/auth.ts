import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET ?? "tubepulse-dev-secret";
const JWT_EXPIRES_IN = "7d";

if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET not set — using insecure default JWT secret. Set SESSION_SECRET in production!");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: number, tier: string): string {
  return jwt.sign({ userId, tier }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: number; tier: string } {
  const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  if (typeof payload.userId !== "number" || typeof payload.tier !== "string") {
    throw new Error("Malformed token payload");
  }
  return { userId: payload.userId, tier: payload.tier };
}
