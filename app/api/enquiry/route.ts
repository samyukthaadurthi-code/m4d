import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { ENQUIRY_COLUMNS, SHEETS } from "@/lib/schema";
import { sendLeadAlert } from "@/lib/whatsapp";
import { sendEnquiryAlertEmail } from "@/lib/email-lead";

export const runtime = "nodejs";

// The website is a different origin, so it needs CORS to post here.
const ORIGINS = new Set([
  "https://mrc-1-one.vercel.app",
  "https://mrclandmarks.com",
  "https://www.mrclandmarks.com",
  "http://localhost:8899",
]);
function cors(req: Request, res: NextResponse) {
  const origin = req.headers.get("origin") ?? "";
  if (ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}
export async function OPTIONS(req: Request) {
  return cors(req, new NextResponse(null, { status: 204 }));
}

const tenDigits = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  const ten = d.length > 10 ? d.slice(-10) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : "";
};
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
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That email doesn't look right.";
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
  Promise.all([
    process.env.SALES_LEAD_WHATSAPP ? sendLeadAlert(process.env.SALES_LEAD_WHATSAPP, summary) : Promise.resolve(),
    sendEnquiryAlertEmail(summary, { Name: name, Mobile: mobile, Email: email, Interest: interest, Page: page }),
  ]).catch((err) => console.error("[enquiry] notify failed:", err));

  return reply({ ok: true, id });
}
