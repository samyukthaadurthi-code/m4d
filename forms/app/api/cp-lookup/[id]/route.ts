import { NextResponse } from "next/server";
import { findById, sheetsConfigured } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";

export const runtime = "nodejs";

/**
 * Confirms a partner ID on the site-visit form and shows the customer who they
 * are crediting. Returns name and organisation only — both are printed on the
 * badge the partner is wearing — never their mobile or email.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sheetsConfigured()) {
    return NextResponse.json({ found: false }, { status: 503 });
  }
  const { id } = await params;
  const row = await findById(SHEETS.registrations, id.toUpperCase().trim());
  if (!row) return NextResponse.json({ found: false }, { status: 404 });

  return NextResponse.json({
    found: true,
    name: row.full_name ?? "",
    organisation: row.organisation_name ?? "",
  });
}
