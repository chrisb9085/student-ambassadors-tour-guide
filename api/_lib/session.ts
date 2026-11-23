/**
 * Edit mode sign-in, checked on the server only.
 *
 * The password lives in the Vercel environment variable EDITOR_PASSWORD. It has no VITE_ prefix, so Vite never copies
 * it into the JavaScript that visitors download: only these serverless functions can read it.
 *
 * After a correct password the browser gets a signed, HttpOnly cookie (JavaScript on the page can't read it) that
 * lasts 8 hours. The signature key is derived from both EDITOR_PASSWORD and GITHUB_TOKEN, so changing either one
 * signs everybody out at once. No database is needed.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "fiu_edit_session";
export const SESSION_HOURS = 8;

export type Env = {
  EDITOR_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
};

export type Session = { name: string; exp: number };

/** Edit mode works only when both server secrets are set. A short password is refused outright. */
export function configProblem(env: Env): string | null {
  if (!env.EDITOR_PASSWORD || !env.GITHUB_TOKEN)
    return "Edit mode isn't set up on this site yet. An administrator needs to add EDITOR_PASSWORD and GITHUB_TOKEN in Vercel (see docs/ADMIN-HANDOVER.md).";
  if (env.EDITOR_PASSWORD.length < 12) return "The editor password set in Vercel is too short. Use at least 12 characters.";
  return null;
}

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** Compares in constant time, so response timing doesn't hint at how much of a guess was right. */
export function passwordMatches(env: Env, attempt: unknown): boolean {
  if (typeof attempt !== "string" || !env.EDITOR_PASSWORD) return false;
  return timingSafeEqual(digest(attempt), digest(env.EDITOR_PASSWORD));
}

function key(env: Env): Buffer {
  return createHmac("sha256", env.GITHUB_TOKEN ?? "").update(`edit-session:${env.EDITOR_PASSWORD ?? ""}`).digest();
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signSession(env: Env, name: string, now: number): string {
  const payload = b64url(JSON.stringify({ name, exp: now + SESSION_HOURS * 3600_000 } satisfies Session));
  const sig = b64url(createHmac("sha256", key(env)).update(payload).digest());
  return `${payload}.${sig}`;
}

export function readSession(env: Env, cookieHeader: string | null, now: number): Session | null {
  if (configProblem(env)) return null;
  const value = parseCookies(cookieHeader)[COOKIE];
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", key(env)).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (typeof s.name !== "string" || typeof s.exp !== "number" || s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Secure + HttpOnly + SameSite=Strict: sent only over HTTPS (or localhost), never to scripts, never cross-site. */
export function sessionCookie(value: string): string {
  return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearedCookie(): string {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
