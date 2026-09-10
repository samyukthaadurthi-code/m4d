import { NextResponse } from "next/server";
import { appendRow, findById, sheetsConfigured } from "@/lib/sheets";
import { CP_COLUMNS, CP_FIELDS, SHEETS } from "@/lib/schema";

export const runtime = "nodejs";

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

  const uniqueId = typeof body.unique_id === "string" ? body.unique_id.trim() : "";
  // The registration row is the join key — refuse anything we can't link back.
  const registration = uniqueId
    ? await findById(SHEETS.registrations, uniqueId)
    : null;
  if (!registration) {
    return NextResponse.json(
      { error: "We could not find that registration ID." },
      { status: 404 },
    );
  }

  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of CP_FIELDS) {
    const raw = body[field.key];
    values[field.key] = Array.isArray(raw)
      ? raw.join(", ")
      : typeof raw === "string"
        ? raw.trim()
        : "";
    if (field.required && !values[field.key]) {
      errors[field.key] = "This is required";
    }
  }
  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const meta: Record<string, string> = {
    unique_id: uniqueId,
    submitted_at: new Date().toISOString(),
    full_name: registration.full_name ?? "",
    mobile: registration.mobile ?? "",
  };

  await appendRow(
    SHEETS.cp,
    CP_COLUMNS.map((c) => meta[c] ?? values[c] ?? ""),
  );

  return NextResponse.json({ ok: true, unique_id: uniqueId });
}
