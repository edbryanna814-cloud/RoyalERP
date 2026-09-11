import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "./mongodb";

const secret = process.env.JWT_SECRET || "dev-secret";

export const ACCESS_COOKIE = "royal_access";
export const REFRESH_COOKIE = "royal_refresh";

const accessMaxAge = 15 * 60; // 15 min
export const refreshMaxAge = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير عام",
  sales: "مدير مبيعات",
  purchase: "مدير مشتريات",
};

export function signAccess(user: SessionUser) {
  return jwt.sign(
    { name: user.name, email: user.email, role: user.role },
    secret,
    { subject: user.id, expiresIn: accessMaxAge }
  );
}

export function verifyAccess(token: string): SessionUser | null {
  try {
    const p = jwt.verify(token, secret) as jwt.JwtPayload;
    return { id: p.sub!, name: String(p.name), email: String(p.email), role: String(p.role || "") };
  } catch {
    return null;
  }
}

export function newRefreshToken() {
  return randomBytes(48).toString("base64url");
}

// ponytail: sha256-acking opaque random tokens is fine; switch to bcrypt only if a DB leak ever matters
export function hash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookies(access: string, refresh: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, access, cookieBase(accessMaxAge));
  store.set(REFRESH_COOKIE, refresh, cookieBase(refreshMaxAge));
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getSession(token?: string): Promise<SessionUser | null> {
  if (token) return verifyAccess(token);
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  return access ? verifyAccess(access) : null;
}

// React Native clients bind off cookies, so they identify via the Authorization header.
export function bearerToken(req: { headers: { get(name: string): string | null } }) {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function saveRefreshToken(token: string, userId: string) {
  const d = await db();
  await d.collection("sessions").insertOne({
    token: hash(token),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
  });
}

export async function isValidRefreshToken(token: string) {
  const d = await db();
  const s = await d.collection("sessions").findOne({ token: hash(token) });
  return s && s.expiresAt > new Date();
}

export async function deleteSession(token: string) {
  const d = await db();
  await d.collection("sessions").deleteMany({ token: hash(token) });
}
