import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { CHAT_LEAD_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { sendEnquiryAckEmail } from "@/lib/email";
import { cors, preflight, tenDigits, validEmail } from "@/lib/cors";
import { MRC_KNOWLEDGE } from "@/lib/mrc-knowledge";

export const runtime = "nodejs";
export const OPTIONS = preflight;

const MODEL = process.env.CHAT_MODEL || "google/gemini-2.5-flash";   // clean Tamil, cheap; override with CHAT_MODEL
const SYSTEM = `You are the MRC Landmarks assistant on mrclandmarks.com — a warm, precise member of the MRC team in Madurai.

RULES
- Answer only from the MRC facts below. If something is not covered, say so plainly and offer the team's number (+91 89259 72469, also WhatsApp) or a call-back — never guess, never invent prices, plot sizes, dates, availability or registration numbers.
- Pricing, plot-wise availability and bookings are not published yet: say that, and offer a free site visit or a call from the team.
- Keep replies short: 1–4 sentences, or a tight bullet list. No headings, no bold, no emojis. Plain text; links as bare URLs.
- Reply in the visitor's language (English or Tamil). If they write in Tamil, answer in Tamil.
- Stay on MRC Landmarks, its project ANANTAA, plots and land-buying in Tamil Nadu. For anything else, politely steer back.
- Never claim to be a human. If asked, you are MRC's website assistant.
- When it fits naturally, close with one helpful next step. The site turns every URL you write into a button, so: write the sentence, then put the full URL (always starting with https://) at the end of it or on its own line. Use ONLY these URLs, exactly: site visit https://forms.mrclandmarks.com/visit · launch-event registration https://forms.mrclandmarks.com/register · channel-partner application https://forms.mrclandmarks.com/join · partner resource centre https://forms.mrclandmarks.com/partners · WhatsApp https://wa.me/918925972469 (write this URL exactly, digits with no spaces; the spoken number is +91 89259 72469) · map https://www.google.com/maps?q=9.964539,78.193672 · Forum early access https://mrclandmarks.com/mrc-forum.html · ANANTAA page https://mrclandmarks.com/project-anantaa.html · Knowledge Hub https://mrclandmarks.com/insights.html · contact https://mrclandmarks.com/contact.html. Never invent other paths.

MRC FACTS
${MRC_KNOWLEDGE}`;

type Msg = { role: "user" | "assistant"; content: string };
let sheetReady = false;

export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => cors(req, NextResponse.json(body, { status }));
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }

  // ---- lead capture (after the visitor's second question) ----
  if (body.lead && typeof body.lead === "object") {
    if (!sheetsConfigured()) return reply({ error: "Not configured." }, 503);
    const l = body.lead as Record<string, unknown>;
    const str = (k: string, max = 200) => (typeof l[k] === "string" ? (l[k] as string).trim().slice(0, max) : "");
    const name = str("name"), email = str("email"), looking = str("looking_for", 500), page = str("page", 120);
    const mobile = tenDigits(str("mobile"));
    const questions = Array.isArray(l.questions) ? (l.questions as unknown[]).filter((q) => typeof q === "string").map((q) => (q as string).slice(0, 300)).slice(0, 6).join(" | ") : "";
    const errors: Record<string, string> = {};
    if (!name) errors.name = "Please tell us your name.";
    if (!mobile) errors.mobile = "Enter a valid 10-digit mobile number.";
    if (!validEmail(email)) errors.email = "Enter a valid email address.";
    if (Object.keys(errors).length) return reply({ errors }, 400);
    if (!sheetReady) { await ensureSheet(SHEETS.chatLeads, [...CHAT_LEAD_COLUMNS]); sheetReady = true; }
    const values: Record<string, string> = { chat_id: "", submitted_at: new Date().toISOString(), name, mobile, email, looking_for: looking, questions, page };
    const row = await appendRow(SHEETS.chatLeads, CHAT_LEAD_COLUMNS.map((c) => values[c] ?? ""));
    const id = `MRC-CH-${String(row - 1).padStart(3, "0")}`;
    await setCell(SHEETS.chatLeads, `A${row}`, id);
    await Promise.all([
      notifySales(`Chat lead ${id}: ${name} · ${mobile}`, { ID: id, Name: name, Mobile: mobile, Email: email, "Looking for": looking, "Asked": questions, Page: page }),
      sendEnquiryAckEmail(email, name, mobile, looking || "Chat enquiry"),
    ]).catch((err) => console.error("[chat lead] notify failed:", err));
    return reply({ ok: true, id });
  }

  // ---- a turn of conversation ----
  if (!process.env.OPENROUTER_API_KEY) return reply({ error: "The assistant is not configured." }, 503);
  const raw = Array.isArray(body.messages) ? (body.messages as unknown[]) : [];
  const messages: Msg[] = raw
    .filter((m): m is Msg => !!m && typeof m === "object" && ((m as Msg).role === "user" || (m as Msg).role === "assistant") && typeof (m as Msg).content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
    .slice(-12);
  if (!messages.length || messages[messages.length - 1].role !== "user") return reply({ error: "Nothing to answer." }, 400);
  const lead = typeof body.leadName === "string" && body.leadName.trim() ? `\n\nThe visitor's name is ${body.leadName.trim().slice(0, 60)}; use it occasionally, not every message.` : "";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://mrclandmarks.com", "X-Title": "MRC Landmarks assistant" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, temperature: 0.3, messages: [{ role: "system", content: SYSTEM + lead }, ...messages] }),
    });
    if (!res.ok) { console.error("[chat] upstream", res.status, (await res.text()).slice(0, 300)); return reply({ error: "The assistant is busy. Please try again, or WhatsApp us at +91 89259 72469." }, 502); }
    const data = await res.json();
    const text: string = (data?.choices?.[0]?.message?.content?.trim() || "I could not answer that just now. You can reach the team on +91 89259 72469.").replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
    return reply({ reply: text });
  } catch (err) {
    console.error("[chat] failed:", err);
    return reply({ error: "The assistant is busy. Please try again, or WhatsApp us at +91 89259 72469." }, 502);
  }
}
