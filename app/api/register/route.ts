import { NextResponse } from "next/server";
import { appendRow, setCell, sheetsConfigured } from "@/lib/sheets";
import { REGISTRATION_COLUMNS, REGISTRATION_FIELDS, SHEETS } from "@/lib/schema";

export const runtime = "nodejs";

const idFor = (row: number) => `MRC-CP-${String(row - 1).padStart(3, "0")}`;

/** Accepts 10-digit Indian mobiles with or without +91 / 0 prefixes. */
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
      errors[field.key] = "This is required";
    }
  }

  for (const key of ["mobile", "whatsapp"] as const) {
    if (values[key] && !errors[key]) {
      const clean = normalisePhone(values[key]);
      if (!clean) errors[key] = "Enter a valid 10-digit mobile number";
      else values[key] = clean;
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = "Enter a valid email address";
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const meta: Record<string, string> = {
    unique_id: "", // filled in below, once Sheets assigns the row
    registered_at: new Date().toISOString(),
    source: body.source === "onsite" ? "onsite" : "online",
  };

  const row = await appendRow(
    SHEETS.registrations,
    REGISTRATION_COLUMNS.map((c) => meta[c] ?? values[c] ?? ""),
  );
  const uniqueId = idFor(row);
  await setCell(SHEETS.registrations, `A${row}`, uniqueId);

  return NextResponse.json({
    unique_id: uniqueId,
    cp_interested: values.cp_interested === "Yes",
  });
}
