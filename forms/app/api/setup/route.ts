import { NextResponse } from "next/server";
import { ensureSheet, sheetsConfigured } from "@/lib/sheets";
import {
  CP_COLUMNS,
  REGISTRATION_COLUMNS,
  SHEETS,
  VISIT_COLUMNS,
} from "@/lib/schema";

export const runtime = "nodejs";

/**
 * Creates the tabs and writes header rows that match the code exactly.
 * Idempotent and never deletes. Run once after setting env vars, and again
 * whenever you add a field to lib/schema.ts.
 */
export async function POST(req: Request) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SETUP_TOKEN is not set on the server." },
      { status: 503 },
    );
  }
  const token = new URL(req.url).searchParams.get("token");
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  if (!sheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets is not configured on the server." },
      { status: 503 },
    );
  }

  await ensureSheet(SHEETS.registrations, REGISTRATION_COLUMNS);
  await ensureSheet(SHEETS.cp, CP_COLUMNS);
  await ensureSheet(SHEETS.visits, VISIT_COLUMNS);

  return NextResponse.json({
    ok: true,
    sheets: {
      [SHEETS.registrations]: REGISTRATION_COLUMNS,
      [SHEETS.cp]: CP_COLUMNS,
      [SHEETS.visits]: VISIT_COLUMNS,
    },
  });
}
