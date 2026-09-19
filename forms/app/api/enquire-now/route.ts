import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { ENQUIRE_NOW_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { sendEnquiryAckEmail } from "@/lib/email";
import { cors, preflight, tenDigits, validEmail } from "@/lib/cors";

export const runtime = "nodejs";
export const OPTIONS = preflight;

let sheetReady = false;

/** The "Enquire now" side tab on every page — its own sheet, so these are kept apart from the site-visit pop-up leads. */
export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => cors(req, NextResponse.json(body, { status }));
  if (!sheetsConfigured()) return reply({ error: "Enquiries are not configured on the server." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }
  const str = (k: string, max = 200) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = str("name"), email = str("email"), city = str("city"), message = str("message", 1000), page = str("page", 120);
  const mobile = tenDigits(str("mobile"));
  const consent = body.consent === true || body.consent === "yes";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!mobile) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (!consent) errors.consent = "Please tick the box so we can contact you.";
  if (Object.keys(errors).length) return reply({ errors }, 400);

  if (!sheetReady) {
    await ensureSheet(SHEETS.enquireNow, [...ENQUIRE_NOW_COLUMNS]);
    sheetReady = true;
  }
  const values: Record<string, string> = {
    enquire_id: "", submitted_at: new Date().toISOString(),
    name, mobile, email, city, message, page, consent: "yes",
  };
  const row = await appendRow(SHEETS.enquireNow, ENQUIRE_NOW_COLUMNS.map((c) => values[c] ?? ""));
  const id = `MRC-EN-${String(row - 1).padStart(3, "0")}`;
  await setCell(SHEETS.enquireNow, `A${row}`, id);

  await Promise.all([
    notifySales(`Enquire now ${id}: ${name} · ${mobile}`, { ID: id, Name: name, Mobile: mobile, Email: email, City: city, Message: message, Page: page }),
    sendEnquiryAckEmail(email, name, mobile, message ? "Your enquiry" : "General enquiry"),
  ]).catch((err) => console.error("[enquire-now] notify failed:", err));

  return reply({ ok: true, id });
}
