import { NextResponse } from "next/server";
import { appendRow, findById, setCell, sheetsConfigured } from "@/lib/sheets";
import { SHEETS, VISIT_COLUMNS, VISIT_FIELDS } from "@/lib/schema";
import { sendVisitConfirmation, sendLeadAlert } from "@/lib/whatsapp";
import { sendVisitConfirmationEmail } from "@/lib/email";
import { t, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";

const leadIdFor = (row: number) => `MRC-SV-${String(row - 1).padStart(3, "0")}`;

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
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
  for (const field of VISIT_FIELDS) {
    const raw = body[field.key];
    values[field.key] = Array.isArray(raw)
      ? raw.join(", ")
      : typeof raw === "string"
        ? raw.trim()
        : "";
  }

  const errors: Record<string, string> = {};
  for (const field of VISIT_FIELDS) {
    if (field.showIf && !field.showIf(values)) {
      values[field.key] = "";
      continue;
    }
    if (field.required && !values[field.key]) errors[field.key] = s.required;
  }

  if (values.visitor_mobile && !errors.visitor_mobile) {
    const clean = normalisePhone(values.visitor_mobile);
    if (!clean) errors.visitor_mobile = s.badMobile;
    else values.visitor_mobile = clean;
  }

  // Attribution is money, so an unknown partner ID is a hard error rather than
  // a note in a cell nobody reads.
  let cpName = "";
  if (values.referred_by_cp === "Yes" && values.cp_id) {
    values.cp_id = values.cp_id.toUpperCase().trim();
    const cp = await findById(SHEETS.registrations, values.cp_id);
    if (!cp) errors.cp_id = s.cpNotFound;
    else {
      cpName = [cp.full_name, cp.organisation_name].filter(Boolean).join(" · ");
    }
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const meta: Record<string, string> = {
    lead_id: "",
    submitted_at: new Date().toISOString(),
    source: body.source === "onsite" ? "onsite" : "online",
    cp_name: cpName,
  };

  const row = await appendRow(
    SHEETS.visits,
    VISIT_COLUMNS.map((c) => meta[c] ?? values[c] ?? ""),
  );
  const leadId = leadIdFor(row);
  await setCell(SHEETS.visits, `A${row}`, leadId);

  const requirement = [values.plot_preference, values.amenities_preference]
    .filter(Boolean)
    .join(" · ");

  // Fire and forget — the lead is already saved, messaging must not risk it.
  Promise.all([
    sendVisitConfirmation(
      values.visitor_mobile,
      values.visitor_name,
      requirement,
      values.budget,
      `${values.visit_date} (${values.visit_time})`,
    ),
    // Same message by email when they gave one — optional field, so often blank.
    sendVisitConfirmationEmail(
      values.visitor_email,
      values.visitor_name,
      requirement,
      values.budget,
      `${values.visit_date} (${values.visit_time})`,
    ),
    process.env.SALES_LEAD_WHATSAPP
      ? sendLeadAlert(
          process.env.SALES_LEAD_WHATSAPP,
          `${leadId} · ${values.visitor_name} · ${values.visitor_mobile} · ${values.budget} · ${values.visit_date} ${values.visit_time}${cpName ? ` · via ${cpName}` : " · direct"}`,
        )
      : Promise.resolve(),
  ]).catch((err) => console.error("[visit] notify failed:", err));

  return NextResponse.json({ lead_id: leadId });
}
