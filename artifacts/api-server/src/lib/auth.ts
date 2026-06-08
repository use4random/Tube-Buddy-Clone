import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET ?? "tubepulse-dev-secret";
const JWT_EXPIRES_IN = "7d";

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
  return jwt.verify(token, JWT_SECRET) as { userId: number; tier: string };
}
