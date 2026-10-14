import { NextResponse } from "next/server";
import { ask, AGENT, BUSY, type Msg } from "@/lib/assistant";
import { sendText, sendList, sendCtaUrl, whatsappConfigured } from "@/lib/whatsapp";
import { appendRow, ensureSheet, findBy, mintId, setCell, sheetsConfigured } from "@/lib/sheets";
import { CHAT_LEAD_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { handledByHuman, loadThread, record, type Entry, type Thread } from "@/lib/inbox";

export const runtime = "nodejs";

/**
 * Inbound WhatsApp. Meta calls GET once to verify the endpoint, then POSTs every
 * message. Anyone who writes to the business number gets the same assistant the
 * website has, inside the 24-hour service window their own message opens.
 */

const TURNS = 10;          // how much of a conversation we carry back to the model
const IDLE_MS = 15 * 60e3; // a quarter hour of silence ends the session

/**
 * Someone opening the conversation again, in whatever words.
 *
 * Thread state lives in this process, so a warm function remembers a visitor
 * and a cold one does not — which made "show the questions again" a coin toss.
 * A greeting is something we can read off the message itself, so it works the
 * same however the function happens to be running.
 */
const GREETING = /^(hi+|hey+|hello+|hlo|start|menu|help|vanakkam|வணக்கம்|ஹாய்|hai)\b[\s!.]*$/i;

/**
 * ponytail: in-process thread memory. A cold start loses it and the next reply
 * simply starts fresh, which is acceptable for a sales assistant. Move it to the
 * sheet or a KV store if continuity across restarts ever matters.
 */
const threads = new Map<string, { at: number; msgs: Msg[]; greeted: boolean; asks: number; formSent: boolean }>();

/**
 * Message ids we have already handled.
 *
 * Meta retries any webhook it doesn't see a 200 from within a few seconds, and
 * this handler waits on the model, which sometimes takes longer than that. The
 * retry used to produce a second answer to the same question; now it would also
 * write the message into the inbox twice.
 *
 * ponytail: in-process, so a cold start can still let one through. A retry
 * arrives seconds later and almost always on the same warm instance.
 */
const handled = new Set<string>();

function firstTime(id: string | undefined) {
  if (!id) return true;
  if (handled.has(id)) return false;
  handled.add(id);
  if (handled.size > 600) for (const k of handled) { handled.delete(k); if (handled.size <= 400) break; }
  return true;
}

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

async function badgeReply(from: string, out: Entry[]): Promise<boolean> {
  if (!sheetsConfigured()) return false;
  const mobile = from.replace(/\D/g, "").slice(-10);
  const reg =
    (await findBy(SHEETS.registrations, "whatsapp", mobile)) ??
    (await findBy(SHEETS.registrations, "mobile", mobile));

  const say = async (body: string) => {
    out.push({ dir: "out", by: AGENT, text: body });
    await sendText(from, body);
  };

  if (!reg?.unique_id) {
    await say(
      `I can't find a registration for this number yet. Register here and your badge comes straight back: ${SITE}/register`,
    );
    return true;
  }
  await say(
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

/** Only the parts of Meta's payload we actually read. */
type InboundMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};

type WebhookBody = {
  entry?: { changes?: { value?: { messages?: InboundMessage[] } }[] }[];
};

export async function POST(req: Request) {
  // Always 200: Meta retries anything else, and a retry storm helps nobody.
  const ok = () => new NextResponse("ok", { status: 200 });

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return ok();
  }

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return ok();                      // delivery receipts and read states

  const from = message.from ?? "";
  if (!from || !whatsappConfigured()) return ok();
  if (!firstTime(message.id)) return ok();        // Meta retrying one we already answered

  /**
   * Everything the assistant says, collected so it can be written to the inbox
   * in one go at the end. The salesperson needs to read what the customer was
   * already told before adding to it, otherwise he repeats it or contradicts it.
   */
  const out: Entry[] = [];

  // Meta fires this when someone opens an empty chat with us, before they type.
  // It is the only moment we are allowed to speak first.
  if (message.type === "request_welcome") {
    const t = thread(from);
    t.greeted = true;
    const hello = `Hello, I'm ${AGENT} from MRC Landmarks. Ask me anything about our plots in Southern Tamil Nadu, or pick one of the questions below.`;
    await sendText(from, hello);
    await sendList(from, "Common questions", "Choose a question", FAQ);
    out.push({ dir: "out", by: AGENT, text: hello }, { dir: "out", by: AGENT, text: "[sent the common questions list]" });
    await keep(from, out, undefined);
    return ok();
  }

  const text: string =
    message.type === "text" ? (message.text?.body ?? "").trim()
    : message.type === "interactive" ? (message.interactive?.button_reply?.title
        ?? message.interactive?.list_reply?.title ?? "").trim()
    : "";

  /**
   * Whatever arrived gets recorded before we try to answer it.
   *
   * This is the only copy of the conversation, and the handler goes on to wait
   * on the model — so writing it afterwards would mean a timeout silently eats
   * a customer's question. A voice note or photo we cannot read still has to
   * show up in the inbox, or the salesperson never learns they sent one.
   */
  const inbound = text || `[${message.type} message — open WhatsApp Manager to see it]`;
  let known: Thread | null | undefined;
  try {
    known = await loadThread(from);
  } catch (err) {
    console.error("[whatsapp] thread lookup failed:", err);
  }
  const human = handledByHuman(known ?? null);
  let current = known;
  try {
    current = await record(from, [{ dir: "in", by: "customer", text: inbound }], known);
  } catch (err) {
    console.error("[whatsapp] could not record inbound message:", err);
  }

  // A person has taken this conversation. Two voices answering one customer is
  // worse than a reply that takes a few minutes, so the assistant stays out of
  // it — the message is in the inbox, waiting, and marked unread.
  if (human) return ok();

  if (!text) {
    const hint = "Thanks for writing in. Could you send that as a text message? You can also call us on +91 95144 39555.";
    await sendText(from, hint);
    out.push({ dir: "out", by: AGENT, text: hint });
    await keep(from, out, current);
    return ok();
  }

  // Desk QR lands here. Answer it and stop — a broker collecting a badge does
  // not want the assistant's sales patter on top.
  if (WANTS_BADGE.test(text)) {
    thread(from).greeted = true;
    try {
      if (await badgeReply(from, out)) {
        await keep(from, out, current);
        return ok();
      }
    } catch (err) {
      console.error("[whatsapp] badge lookup failed:", err);
    }
  }

  const t = thread(from);
  // A fresh thread means a new session; a greeting means they have come back and
  // are starting over. Either way they get the questions again.
  const newSession = !t.greeted || GREETING.test(text);
  if (newSession) t.asks = 0;
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
    const answer = reply || BUSY;
    t.msgs.push({ role: "assistant", content: answer });
    await sendText(from, answer);
    out.push({ dir: "out", by: AGENT, text: answer });
  } catch (err) {
    console.error("[whatsapp] assistant failed:", err);
    await sendText(from, BUSY);
    out.push({ dir: "out", by: AGENT, text: BUSY });
  }

  // First time anyone writes in, offer the questions most people actually ask —
  // unless they got here by tapping one, in which case they have already seen them.
  const cameFromIcebreaker = FAQ.some(
    (f) => f.title.toLowerCase().replace(/[^a-z]/g, "") === text.toLowerCase().replace(/[^a-z]/g, ""),
  );
  if (newSession && !cameFromIcebreaker) {
    await sendList(from, `Or pick one of these and I'll answer it right away.`, "Common questions", FAQ);
    out.push({ dir: "out", by: AGENT, text: "[sent the common questions list]" });
  }

  // Two questions in, they are a real lead: put the form in front of them once.
  if (!t.formSent && t.asks >= 2) {
    t.formSent = true;
    const nudge = `If you'd like the team to call you with the details, leave your name and what you're looking for — it takes a minute and someone from MRC will come back to you.`;
    await sendCtaUrl(from, nudge, "Share your details", FORM_URL);
    out.push({ dir: "out", by: AGENT, text: `${nudge}\n\n${FORM_URL}` });
  }

  await keep(from, out, current);
  return ok();
}

/** Writes the assistant's side of the exchange. Never fails the webhook over it. */
async function keep(from: string, out: Entry[], thread: Thread | null | undefined) {
  if (!out.length) return;
  try {
    await record(from, out, thread);
  } catch (err) {
    console.error("[whatsapp] could not record replies:", err);
  }
}
