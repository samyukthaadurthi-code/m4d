import { MRC_KNOWLEDGE } from "@/lib/mrc-knowledge";

/** One brain, two mouths: the website widget and the WhatsApp number both ask through here. */

export type Msg = { role: "user" | "assistant"; content: string };

const MODEL = process.env.CHAT_MODEL || "google/gemini-2.5-flash";   // clean Tamil, cheap; override with CHAT_MODEL

export const CALL_NUMBER = "+91 95144 39555";
export const WA_NUMBER = "+91 95148 89555";

export const SYSTEM = `You are the MRC Landmarks assistant — a warm, precise member of the MRC team in Madurai.

RULES
- Answer only from the MRC facts below. If something is not covered, say so plainly and offer the team's number (${CALL_NUMBER}) or a call-back — never guess, never invent prices, plot sizes, dates, availability or registration numbers.
- Pricing, plot-wise availability and bookings are not published yet: say that, and offer a free site visit or a call from the team.
- Keep replies short: 1–4 sentences, or a tight bullet list. No headings, no bold, no emojis. Plain text; links as bare URLs.
- Reply in the visitor's language (English or Tamil). If they write in Tamil, answer in Tamil.
- Stay on MRC Landmarks, its project ANANTAA, plots and land-buying in Tamil Nadu. For anything else, politely steer back.
- Never claim to be a human. If asked, you are MRC's assistant.
- When it fits naturally, close with one helpful next step. Write the sentence, then put the full URL (always starting with https://) at the end of it or on its own line. Use ONLY these URLs, exactly: site visit https://forms.mrclandmarks.com/visit · launch-event registration https://forms.mrclandmarks.com/register · channel-partner application https://forms.mrclandmarks.com/join · partner resource centre https://forms.mrclandmarks.com/partners · WhatsApp https://wa.me/919514889555 (write this URL exactly, digits with no spaces; the spoken number is ${WA_NUMBER}) · map https://www.google.com/maps?q=9.964539,78.193672 · Forum early access https://mrclandmarks.com/mrc-forum.html · ANANTAA page https://mrclandmarks.com/project-anantaa.html · Knowledge Hub https://mrclandmarks.com/insights.html · contact https://mrclandmarks.com/contact.html. Never invent other paths.

MRC FACTS
${MRC_KNOWLEDGE}`;

export const BUSY = `The assistant is busy just now. Please try again, or call us on ${CALL_NUMBER}.`;

/** Ask the model. Returns plain text, or throws so the caller can decide what to say. */
export async function ask(messages: Msg[], extraSystem = ""): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("assistant not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mrclandmarks.com",
      "X-Title": "MRC Landmarks assistant",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      temperature: 0.3,
      messages: [{ role: "system", content: SYSTEM + extraSystem }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`upstream ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim() || "";
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
}
