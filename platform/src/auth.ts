import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";

// Password hashing: scrypt (memory-hard, Node built-in). Stored format: scrypt$N$r$p$salt$hash
// (Argon2id can replace this module where the native argon2 package is approved for the target OS.)
const N = 32768, R = 8, P = 1, KEYLEN = 64;
export function hashPassword(password: string): string {
  if (password.length < 10) throw new Error("password policy: minimum 10 characters");
  const salt = randomBytes(16);
  const h = scryptSync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${h.toString("hex")}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * 1024 * 1024 });
  return timingSafeEqual(actual, expected);
}

// Sessions: opaque token to the client; only its SHA-256 is stored server-side. Revocable, expiring.
export interface Session { userId: number; role: Role; expiresAt: Date }
export function newSessionToken(): string { return randomBytes(32).toString("hex"); }
export function sessionKey(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h, configurable via env in server bootstrap

export type Role = "admin" | "budget" | "contracts" | "technical" | "realestate" | "viewer";
// Separation of duties: the role that certifies a certificate cannot pay it; the role that
// registers bids cannot award them. Enforced in workflow.ts transitions, not just the UI.
export const PERMISSIONS: Record<Role, string[]> = {
  admin: ["*"],
  budget: ["budget.read", "budget.write", "budget.approve", "payment.authorize", "estimates.approve", "certificates.read", "reports.finance"],
  contracts: ["tenders.read", "tenders.write", "bids.register", "claims.write", "reports.procurement"],
  technical: ["buildings.read", "buildings.write", "certificates.certify", "certificates.read", "estimates.write", "estimates.review", "reports.technical"],
  realestate: ["realestate.read", "realestate.write", "realestate.approve", "reports.realestate"],
  viewer: ["*.read", "reports.*"],
};
export function can(role: Role, permission: string): boolean {
  const grants = PERMISSIONS[role] ?? [];
  return grants.some(g => g === "*" || g === permission ||
    (g.endsWith(".*") && permission.startsWith(g.slice(0, -1))) ||
    (g.startsWith("*.") && permission.endsWith(g.slice(1))));
}
