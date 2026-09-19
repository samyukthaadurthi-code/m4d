import { NextResponse } from "next/server";
import { findBy, findById, sheetsConfigured } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { t, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";

const tenDigits = (raw: string) => raw.replace(/\D/g, "").slice(-10);

/**
 * Entry point for the Channel Partner programme from the website. The partner
 * form is keyed to an event registration, so we need the badge first: the badge
 * ID and the mobile on it must match one row, and only then do we hand over the
 * link to /cp/<id>. A mobile with no badge is sent to register first.
 */
export async function POST(req: Request) {
  if (!sheetsConfigured()) {
    return NextResponse.json(
      { error: "Registration is not configured on the server." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const lang: Lang = body.lang === "ta" ? "ta" : "en";
  const s = t(lang);
  const badgeId = typeof body.badge_id === "string" ? body.badge_id.toUpperCase().trim() : "";
  const mobile = typeof body.mobile === "string" ? tenDigits(body.mobile) : "";

  if (mobile.length !== 10) {
    return NextResponse.json({ error: s.badMobile }, { status: 400 });
  }

  // No badge ID typed: tell them whether this number has one at all, nothing more.
  if (!badgeId) {
    const byMobile =
      (await findBy(SHEETS.registrations, "mobile", mobile)) ??
      (await findBy(SHEETS.registrations, "whatsapp", mobile));
    return NextResponse.json(
      byMobile ? { status: "need_badge_id" } : { status: "no_badge" },
    );
  }

  const row = await findById(SHEETS.registrations, badgeId);
  const known = row ? tenDigits(row.mobile ?? "") : "";
  const knownWa = row ? tenDigits(row.whatsapp ?? "") : "";
  if (!row || (mobile !== known && mobile !== knownWa)) {
    // One message for every mismatch, so the form can't be used to probe IDs.
    return NextResponse.json({ error: s.joinMismatch }, { status: 401 });
  }

  const already = await findBy(SHEETS.cp, "unique_id", badgeId);
  if (already) return NextResponse.json({ status: "already", id: badgeId });

  return NextResponse.json({ status: "ok", id: badgeId });
}
