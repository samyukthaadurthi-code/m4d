import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { ENQUIRY_COLUMNS, SHEETS } from "@/lib/schema";
import { sendLeadAlert } from "@/lib/whatsapp";
import { sendEnquiryAlertEmail } from "@/lib/email-lead";
import { sendEnquiryAckEmail } from "@/lib/email";
import { cors, preflight, tenDigits, validEmail } from "@/lib/cors";

export const OPTIONS = preflight;

export const runtime = "nodejs";

let sheetReady = false;

export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => cors(req, NextResponse.json(body, { status }));
  if (!sheetsConfigured()) return reply({ error: "Enquiries are not configured on the server." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const name = str("name"), email = str("email"), interest = str("interest"), page = str("page").slice(0, 120);
  const mobile = tenDigits(str("mobile"));
  const consent = body.consent === true || body.consent === "yes";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!mobile) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (!consent) errors.consent = "Please tick the box so we can call you back.";
  if (Object.keys(errors).length) return reply({ errors }, 400);

  if (!sheetReady) {
    await ensureSheet(SHEETS.enquiries, [...ENQUIRY_COLUMNS]);
    sheetReady = true;
  }
  const values: Record<string, string> = {
    enquiry_id: "", submitted_at: new Date().toISOString(),
    name, mobile, email, interest, page, consent: "yes",
  };
  const row = await appendRow(SHEETS.enquiries, ENQUIRY_COLUMNS.map((c) => values[c] ?? ""));
  const id = `MRC-EQ-${String(row - 1).padStart(3, "0")}`;
  await setCell(SHEETS.enquiries, `A${row}`, id);

  const summary = `${id} · ${name} · ${mobile}${interest ? ` · ${interest}` : ""}`;
  await Promise.all([
    process.env.SALES_LEAD_WHATSAPP ? sendLeadAlert(process.env.SALES_LEAD_WHATSAPP, summary) : Promise.resolve(),
    sendEnquiryAlertEmail(summary, { Name: name, Mobile: mobile, Email: email, Interest: interest, Page: page }),
    sendEnquiryAckEmail(email, name, mobile, interest),
  ]).catch((err) => console.error("[enquiry] notify failed:", err));

  return reply({ ok: true, id });
}
