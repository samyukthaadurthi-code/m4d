import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findBy, findById, sheetsConfigured } from "@/lib/sheets";
import { CP_APPROVED, SHEETS } from "@/lib/schema";
import { issue, sessionConfigured } from "@/lib/session";
import { t, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";

const tenDigits = (raw: string) => raw.replace(/\D/g, "").slice(-10);

export async function POST(req: Request) {
  if (!sheetsConfigured() || !sessionConfigured()) {
    return NextResponse.json(
      { error: "Partner sign-in is not configured on the server." },
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

  const cpId = typeof body.cp_id === "string" ? body.cp_id.toUpperCase().trim() : "";
  const mobile = typeof body.mobile === "string" ? tenDigits(body.mobile) : "";

  // One error for every failure mode. Telling someone "that ID exists but the
  // number is wrong" turns sequential IDs into a list of real partners.
  const reject = () => NextResponse.json({ error: s.badCreds }, { status: 401 });

  if (!cpId || mobile.length !== 10) return reject();

  const row = await findById(SHEETS.registrations, cpId);
  if (!row) return reject();

  const known = tenDigits(row.mobile ?? "");
  const knownWa = tenDigits(row.whatsapp ?? "");
  if (mobile !== known && mobile !== knownWa) return reject();

  // Identity proven — now the programme gate. The kit is for approved partners only.
  const app = await findBy(SHEETS.cp, "unique_id", cpId);
  if (!app) return NextResponse.json({ error: s.cpNotApplied }, { status: 403 });
  if (app.status !== CP_APPROVED) return NextResponse.json({ error: s.cpPending }, { status: 403 });

  const cookie = issue(cpId);
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });

  return NextResponse.json({ ok: true, cp_id: cpId });
}
