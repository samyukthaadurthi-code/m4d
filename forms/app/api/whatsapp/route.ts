import { NextResponse } from "next/server";
import { ask, AGENT, BUSY, type Msg } from "@/lib/assistant";
import { sendText, sendList, sendCtaUrl, whatsappConfigured } from "@/lib/whatsapp";
import { appendRow, ensureSheet, findBy, mintId, setCell, sheetsConfigured } from "@/lib/sheets";
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
const threads = new Map<string, { at: number; msgs: Msg[]; greeted: boolean; asks: number; formSent: boolean }>();

/** Tapping one of these sends its title back as an ordinary message. */
const FAQ = [
  { id: "faq_what", title: "What is ANANTAA?", description: "The project, where it is, what is included" },
  { id: "faq_where", title: "Where is the site?", description: "Location and what is nearby" },
  { id: "faq_docs", title: "What documents do I get?", description: "Approvals and the document kit" },
  { id: "faq_visit", title: "Book a free site visit", description: "Free, any day of the week" },
];

const FORM_URL = "https://forms.mrclandmarks.com/visit";
const SITE = "https://forms.mrclandmarks.com";

/**
 * Badge on demand, for the registration desk.
 *
 * A broker who messages us first opens a 24-hour service window, and inside it
 * we may send plain text — no template, and it does not count against the
 * number's 250-unique-recipients cap. So the desk QR code
 * (wa.me/919514889555?text=Send%20my%20badge) delivers badges on event day
 * whatever Meta has or hasn't approved by then.
 */
const WANTS_BADGE = /\b(badge|pass|entry|my\s*id)\b/i;

async function badgeReply(from: string): Promise<boolean> {
  if (!sheetsConfigured()) return false;
  const mobile = from.replace(/\D/g, "").slice(-10);
  const reg =
    (await findBy(SHEETS.registrations, "whatsapp", mobile)) ??
    (await findBy(SHEETS.registrations, "mobile", mobile));

  if (!reg?.unique_id) {
    await sendText(
      from,
      `I can't find a registration for this number yet. Register here and your badge comes straight back: ${SITE}/register`,
    );
    return true;
  }
  await sendText(
    from,
    `${reg.full_name || "Hello"} — your MRC Landmarks badge is ready.\n\n` +
      `Entry ID: ${reg.unique_id}\n${SITE}/badge/${reg.unique_id}\n\n` +
      `Show this at the desk when you arrive.`,
  );
  return true;
}

function thread(id: string) {
  const now = Date.now();
  for (const [k, v] of threads) if (now - v.at > IDLE_MS) threads.delete(k);
  const t = threads.get(id) ?? { at: now, msgs: [], greeted: false, asks: 0, formSent: false };
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
  const id = await mintId(SHEETS.chatLeads, "MRC-WA-", row);
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

  // Meta fires this when someone opens an empty chat with us, before they type.
  // It is the only moment we are allowed to speak first.
  if (message.type === "request_welcome") {
    const t = thread(from);
    t.greeted = true;
    await sendText(from, `Hello, I'm ${AGENT} from MRC Landmarks. Ask me anything about our plots in Southern Tamil Nadu, or pick one of the questions below.`);
    await sendList(from, "Common questions", "Choose a question", FAQ);
    return ok();
  }

  const text: string =
    message.type === "text" ? (message.text?.body ?? "").trim()
    : message.type === "interactive" ? (message.interactive?.button_reply?.title
        ?? message.interactive?.list_reply?.title ?? "").trim()
    : "";

  if (!text) {
    await sendText(from, "Thanks for writing in. Could you send that as a text message? You can also call us on +91 95144 39555.");
    return ok();
  }

  // Desk QR lands here. Answer it and stop — a broker collecting a badge does
  // not want the assistant's sales patter on top.
  if (WANTS_BADGE.test(text)) {
    thread(from).greeted = true;
    try {
      if (await badgeReply(from)) return ok();
    } catch (err) {
      console.error("[whatsapp] badge lookup failed:", err);
    }
  }

  const t = thread(from);
  const firstContact = !t.greeted;
  if (firstContact) {
    t.greeted = true;
    logLead(from, text).catch((err) => console.error("[whatsapp] lead failed:", err));
  }
  t.asks += 1;
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

  // First time anyone writes in, offer the questions most people actually ask —
  // unless they got here by tapping one, in which case they have already seen them.
  const cameFromIcebreaker = FAQ.some(
    (f) => f.title.toLowerCase().replace(/[^a-z]/g, "") === text.toLowerCase().replace(/[^a-z]/g, ""),
  );
  if (firstContact && !cameFromIcebreaker) {
    await sendList(from, `Or pick one of these and I'll answer it right away.`, "Common questions", FAQ);
  }

  // Two questions in, they are a real lead: put the form in front of them once.
  if (!t.formSent && t.asks >= 2) {
    t.formSent = true;
    await sendCtaUrl(
      from,
      `If you'd like the team to call you with the details, leave your name and what you're looking for — it takes a minute and someone from MRC will come back to you.`,
      "Share your details",
      FORM_URL,
    );
  }
  return ok();
}
