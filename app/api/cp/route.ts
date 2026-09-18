import { NextResponse } from "next/server";
import { appendRow, ensureSheet, findById, sheetsConfigured } from "@/lib/sheets";
import { CP_COLUMNS, CP_FIELDS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { sendCpReceivedEmail } from "@/lib/email";
import { origin } from "@/lib/origin";
import { approveToken } from "@/lib/approve";

let sheetReady = false;

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
    status: "Pending",
  };

  if (!sheetReady) {
    await ensureSheet(SHEETS.cp, CP_COLUMNS); // adds the status header on sheets created before it existed
    sheetReady = true;
  }
  await appendRow(
    SHEETS.cp,
    CP_COLUMNS.map((c) => meta[c] ?? values[c] ?? ""),
  );

  const base = origin(req);
  await Promise.all([
    notifySales(`Channel partner application ${uniqueId}: ${meta.full_name}`, {
      ID: uniqueId, Name: meta.full_name, Mobile: meta.mobile, Email: registration.email ?? "", ...values,
      "Approve": `${base}/api/cp/approve?id=${encodeURIComponent(uniqueId)}&t=${approveToken(uniqueId)}`,
    }),
    sendCpReceivedEmail(registration.email ?? "", meta.full_name, uniqueId),
  ]).catch((err) => console.error("[cp] notify failed:", err));

  return NextResponse.json({ ok: true, unique_id: uniqueId });
}
