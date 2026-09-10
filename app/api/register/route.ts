import { NextResponse } from "next/server";
import { appendRow, findBy, setCell, sheetsConfigured } from "@/lib/sheets";
import { REGISTRATION_COLUMNS, REGISTRATION_FIELDS, SHEETS } from "@/lib/schema";
import { sendBadge, sendCpFormLink } from "@/lib/whatsapp";
import { t, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";

const idFor = (row: number) => `MRC-CP-${String(row - 1).padStart(3, "0")}`;

/** Accepts 10-digit Indian mobiles with or without +91 / 0 prefixes. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

function origin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Badge and CP link, fired after the response is already safe to return. */
async function notify(
  base: string,
  uniqueId: string,
  values: Record<string, string>,
) {
  await sendBadge(
    values.whatsapp,
    values.full_name,
    uniqueId,
    `${base}/api/badge/${uniqueId}`,
  );
  if (values.cp_interested === "Yes") {
    await sendCpFormLink(
      values.whatsapp,
      values.full_name,
      `${base}/cp/${uniqueId}`,
    );
  }
}

export async function POST(req: Request) {
  if (!sheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets is not configured on the server." },
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

  const values: Record<string, string> = {};
  for (const field of REGISTRATION_FIELDS) {
    const raw = body[field.key];
    values[field.key] = Array.isArray(raw)
      ? raw.join(", ")
      : typeof raw === "string"
        ? raw.trim()
        : "";
  }

  // Validation at the trust boundary — a bad row here is a broker with no badge.
  const errors: Record<string, string> = {};
  for (const field of REGISTRATION_FIELDS) {
    if (field.showIf && !field.showIf(values)) {
      values[field.key] = "";
      continue;
    }
    if (field.required && !values[field.key]) {
      errors[field.key] = s.required;
    }
  }

  for (const key of ["mobile", "whatsapp"] as const) {
    if (values[key] && !errors[key]) {
      const clean = normalisePhone(values[key]);
      if (!clean) errors[key] = s.badMobile;
      else values[key] = clean;
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = s.badEmail;
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Same broker registering twice gets their original ID back, never a second
  // one — two IDs for one person splits commission attribution later.
  const existing = await findBy(SHEETS.registrations, "mobile", values.mobile);
  if (existing?.unique_id) {
    return NextResponse.json({
      unique_id: existing.unique_id,
      cp_interested: existing.cp_interested === "Yes",
      already_registered: true,
    });
  }

  const meta: Record<string, string> = {
    unique_id: "", // filled below, once Sheets assigns the row
    registered_at: new Date().toISOString(),
    source: body.source === "onsite" ? "onsite" : "online",
  };

  const row = await appendRow(
    SHEETS.registrations,
    REGISTRATION_COLUMNS.map((c) => meta[c] ?? values[c] ?? ""),
  );
  const uniqueId = idFor(row);
  await setCell(SHEETS.registrations, `A${row}`, uniqueId);

  // Messaging never blocks the response: the badge is already on screen and in
  // the sheet, so a Meta timeout must not cost the broker their registration.
  notify(origin(req), uniqueId, values).catch((err) =>
    console.error("[register] notify failed:", err),
  );

  return NextResponse.json({
    unique_id: uniqueId,
    cp_interested: values.cp_interested === "Yes",
  });
}
