import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

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
export function issue(cpId: string, cookie: string = COOKIE) {
  const payload = `${cpId}.${Date.now() + MAX_AGE * 1000}`;
  return { name: cookie, value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE };
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

/**
 * The sales inbox signs in with a shared passcode rather than a partner ID, so
 * it gets its own cookie. Same signature, same secret, different door — a
 * partner's kit cookie must not open the inbox.
 */
export const INBOX_COOKIE = "mrc_inbox";

/**
 * The sales inbox is one shared login for the desk, not an account each.
 *
 * MRC has one salesperson on this number and asking them to remember a partner
 * ID to read their own WhatsApp would be silly. A passcode in the environment
 * is rotated by changing one variable, which is the most that will ever be
 * needed here.
 */
export function inboxConfigured() {
  return sessionConfigured() && (process.env.INBOX_PASSCODE ?? "").length >= 6;
}

export function passcodeOk(given: string) {
  const want = process.env.INBOX_PASSCODE ?? "";
  // Fail closed: an unset passcode must not mean an open inbox.
  if (want.length < 6) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Whoever is signed into the inbox, or null. Every inbox route starts here. */
export async function inboxUser(): Promise<string | null> {
  if (!sessionConfigured()) return null;
  return verify((await cookies()).get(INBOX_COOKIE)?.value);
}
