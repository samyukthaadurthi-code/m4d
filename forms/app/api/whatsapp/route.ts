import { NextResponse } from "next/server";
import { ask, BUSY, type Msg } from "@/lib/assistant";
import { sendText, whatsappConfigured } from "@/lib/whatsapp";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { CHAT_LEAD_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";

export const runtime = "nodejs";

/**
 * Inbound WhatsApp. Meta calls GET once to verify the endpoint, then POSTs every
 * message. Anyone who writes to the business number gets the same assistant the
 * website has, inside the 24-hour service window their own message opens.
 */

const TURNS = 10;          // how much of a conversation we carry back to the model
const IDLE_MS = 30 * 60e3; // forget a thread after half an hour of silence

/**
 * ponytail: in-process thread memory. A cold start loses it and the next reply
 * simply starts fresh, which is acceptable for a sales assistant. Move it to the
 * sheet or a KV store if continuity across restarts ever matters.
 */
const threads = new Map<string, { at: number; msgs: Msg[]; greeted: boolean }>();

function thread(id: string) {
  const now = Date.now();
  for (const [k, v] of threads) if (now - v.at > IDLE_MS) threads.delete(k);
  const t = threads.get(id) ?? { at: now, msgs: [], greeted: false };
  t.at = now;
  threads.set(id, t);
  return t;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (q.get("hub.mode") === "subscribe" && token && q.get("hub.verify_token") === token) {
    return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** First message from a number is a lead: record it and tell sales. */
async function logLead(from: string, text: string) {
  if (!sheetsConfigured()) return;
  await ensureSheet(SHEETS.chatLeads, [...CHAT_LEAD_COLUMNS]);
  const mobile = from.replace(/\D/g, "").slice(-10);
  const values: Record<string, string> = {
    chat_id: "",
    submitted_at: new Date().toISOString(),
    name: "",
    mobile,
    email: "",
    looking_for: "",
    questions: text.slice(0, 300),
    page: "WhatsApp",
  };
  const row = await appendRow(SHEETS.chatLeads, CHAT_LEAD_COLUMNS.map((c) => values[c] ?? ""));
  const id = `MRC-WA-${String(row - 1).padStart(3, "0")}`;
  await setCell(SHEETS.chatLeads, `A${row}`, id);
  await notifySales(`WhatsApp enquiry ${id}: ${mobile}`, {
    ID: id, Mobile: mobile, Asked: text.slice(0, 300), Channel: "WhatsApp",
  });
}

export async function POST(req: Request) {
  // Always 200: Meta retries anything else, and a retry storm helps nobody.
  const ok = () => new NextResponse("ok", { status: 200 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return ok();
  }

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return ok();                      // delivery receipts and read states

  const from: string = message.from;
  if (!from || !whatsappConfigured()) return ok();

  const text: string =
    message.type === "text" ? (message.text?.body ?? "").trim()
    : message.type === "interactive" ? (message.interactive?.button_reply?.title
        ?? message.interactive?.list_reply?.title ?? "").trim()
    : "";

  if (!text) {
    await sendText(from, "Thanks for writing in. Could you send that as a text message? You can also call us on +91 95144 39555.");
    return ok();
  }

  const t = thread(from);
  if (!t.greeted) {
    t.greeted = true;
    logLead(from, text).catch((err) => console.error("[whatsapp] lead failed:", err));
  }
  t.msgs.push({ role: "user", content: text.slice(0, 1500) });
  t.msgs = t.msgs.slice(-TURNS);

  try {
    const reply = await ask(t.msgs, "\n\nYou are answering on WhatsApp. Keep it to a few short lines.");
    const out = reply || BUSY;
    t.msgs.push({ role: "assistant", content: out });
    await sendText(from, out);
  } catch (err) {
    console.error("[whatsapp] assistant failed:", err);
    await sendText(from, BUSY);
  }
  return ok();
}
