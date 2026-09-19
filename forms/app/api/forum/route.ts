import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { FORUM_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { forumDesk } from "@/lib/email";
import { sendForumWaitlistEmail } from "@/lib/email";
import { cors, preflight, tenDigits, validEmail } from "@/lib/cors";

export const runtime = "nodejs";
export const OPTIONS = preflight;

const PROFESSIONS = new Set(["Broker / agent", "Developer", "Architect / engineer", "Legal / financial adviser", "Other"]);
let sheetReady = false;

/** MRC Forum early-access list — the forum is pre-launch, so this is a waitlist, not a membership. */
export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => cors(req, NextResponse.json(body, { status }));
  if (!sheetsConfigured()) return reply({ error: "The forum list is not configured on the server." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, 200) : "");
  const name = str("name"), email = str("email"), organisation = str("organisation"), city = str("city");
  const profession = PROFESSIONS.has(str("profession")) ? str("profession") : "";
  const mobile = tenDigits(str("mobile"));
  const consent = body.consent === true || body.consent === "yes";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!mobile) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (!profession) errors.profession = "Pick what you do.";
  if (!consent) errors.consent = "Please tick the box so we can contact you.";
  if (Object.keys(errors).length) return reply({ errors }, 400);

  if (!sheetReady) {
    await ensureSheet(SHEETS.forum, [...FORUM_COLUMNS]);
    sheetReady = true;
  }
  const values: Record<string, string> = {
    forum_id: "", submitted_at: new Date().toISOString(),
    name, mobile, email, profession, organisation, city, consent: "yes",
  };
  const row = await appendRow(SHEETS.forum, FORUM_COLUMNS.map((c) => values[c] ?? ""));
  const id = `MRC-FW-${String(row - 1).padStart(3, "0")}`;
  await setCell(SHEETS.forum, `A${row}`, id);

  await Promise.all([
    notifySales(`MRC Forum early access ${id}: ${name} · ${profession}`, {
      ID: id, Name: name, Mobile: mobile, Email: email, Profession: profession, Organisation: organisation, City: city,
    }, forumDesk()),
    sendForumWaitlistEmail(email, name, id),
  ]).catch((err) => console.error("[forum] notify failed:", err));

  return reply({ ok: true, id });
}
