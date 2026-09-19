import { createHmac, timingSafeEqual } from "crypto";

/** Unforgeable approve link for one partner ID — signed with SESSION_SECRET, no expiry (the sheet row is the state). */
export function approveToken(cpId: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`approve:${cpId}`).digest("base64url");
}

export function approveTokenValid(cpId: string, token: string) {
  const a = Buffer.from(token), b = Buffer.from(approveToken(cpId));
  return a.length === b.length && timingSafeEqual(a, b);
}
