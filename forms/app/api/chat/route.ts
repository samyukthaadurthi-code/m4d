import { NextResponse } from "next/server";
import { appendRow, ensureSheet, setCell, sheetsConfigured } from "@/lib/sheets";
import { CHAT_LEAD_COLUMNS, SHEETS } from "@/lib/schema";
import { notifySales } from "@/lib/email-lead";
import { sendEnquiryAckEmail } from "@/lib/email";
import { sendEnquiryAck } from "@/lib/whatsapp";
import { cors, preflight, tenDigits, validEmail } from "@/lib/cors";
import { ask, BUSY, CALL_NUMBER, type Msg } from "@/lib/assistant";

export const runtime = "nodejs";
export const OPTIONS = preflight;


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
      sendEnquiryAck(mobile, name, looking || "our plots at ANANTAA"),
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
    const text = await ask(messages, lead);
    return reply({ reply: text || `I could not answer that just now. You can reach the team on ${CALL_NUMBER}.` });
  } catch (err) {
    console.error("[chat] failed:", err);
    return reply({ error: BUSY }, 502);
  }
}
