import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "mrc_partner";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  // Fail closed. A guessable session on a gated sales kit is worse than no gate.
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is not set (needs at least 16 characters)");
  }
  return s;
}

export function sessionConfigured() {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

/** `<cpId>.<expiryMs>.<hmac>` — stateless, so no session store to run. */
export function issue(cpId: string) {
  const payload = `${cpId}.${Date.now() + MAX_AGE * 1000}`;
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE };
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [cpId, expiry, mac] = parts;

  const expected = sign(`${cpId}.${expiry}`);
  // Constant-time compare so a wrong signature can't be narrowed down by timing.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Number(expiry) < Date.now()) return null;
  return cpId;
}

export const SESSION_COOKIE = COOKIE;
