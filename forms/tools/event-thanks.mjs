/**
 * Post-event thank-you to everyone who came to the ANANTAA launch.
 *
 *   node tools/event-thanks.mjs            # dry run — prints who gets what
 *   node tools/event-thanks.mjs --send     # actually sends
 *
 * The list is here in the repo rather than in someone's notebook, because the
 * desk collected it on paper and in a WhatsApp thread, and neither survives.
 * Names are addressed personally, so a wrong name is worse than no message —
 * check the dry run before sending.
 *
 * Sends the approved `event_thank_you` template. Each person counts once
 * against the number's 250-unique-recipients-per-24h cap, and this is a
 * MARKETING template, so roughly ₹1 each.
 */
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);
const TOKEN = env.WHATSAPP_TOKEN;
const PHONE_ID = env.WHATSAPP_PHONE_NUMBER_ID;
const LINK = "https://mrclandmarks.com/project-anantaa.html";
const TEMPLATE = "event_thank_you";

/** Everyone who came. Names as the desk wrote them — correct here, not in the message. */
const PEOPLE = [
  // from the notebook at the desk
  { name: "Pandi Selvi", mobile: "8778535630", note: "Othakadai · 3 cent" },
  { name: "Thenappan", mobile: "8778192393", note: "Reserve Line" },
  { name: "Ravi Kannan", mobile: "8300008272", note: "Yanaiyur" },
  { name: "Chidambaram", mobile: "8300019336", note: "Reserve Line" },
  { name: "Chandra Sekaran", mobile: "9842875700", note: "" },
  { name: "Eswaran", mobile: "9943812882", note: "" },
  { name: "T. Jayapandi", mobile: "9788698493", note: "Kamarajapuram" },

  // from Gowtham's thread
  { name: "Saravannan", mobile: "7904305715", note: "" },
  { name: "Iswarya", mobile: "8489555921", note: "" },
  { name: "Hemachandran", mobile: "8489292652", note: "" },
  { name: "Nagore Kani", mobile: "9865786406", note: "" },
  { name: "Ramasamy", mobile: "7667942517", note: "KR Builders · plot purchase enquiry" },
  { name: "Thirupathi", mobile: "9940135843", note: "Kodikulam · plot buyer" },
  { name: "", mobile: "6383117416", note: "no name given" },

  // messaged the business number around the event
  { name: "Kumaresan", mobile: "9677839858", note: "also enquired on the website" },
  { name: "", mobile: "8973980730", note: "WhatsApp 12 Oct" },
  { name: "", mobile: "9600933789", note: "WhatsApp 12 Oct" },
  { name: "", mobile: "8870260838", note: "WhatsApp 12 Oct" },
  { name: "", mobile: "6369853035", note: "WhatsApp 12 Oct" },
  { name: "", mobile: "8903650006", note: "WhatsApp 12 Oct" },
  { name: "", mobile: "9786541010", note: "WhatsApp 13 Oct" },
  { name: "", mobile: "9789569266", note: "WhatsApp 11 Oct" },
  { name: "", mobile: "9578395755", note: "WhatsApp 11 Oct" },
  { name: "", mobile: "9884400076", note: "WhatsApp 3 Oct" },
];

/** No name on the slip, so the greeting has to still read like a sentence. */
const greet = (n) => (n && n.trim() ? n.trim() : "there");
const wa = (m) => `91${m.replace(/\D/g, "").slice(-10)}`;

const send = process.argv.includes("--send");

// A number written down twice at a busy desk is one person, not two messages.
const seen = new Set();
const list = PEOPLE.filter((p) => {
  const k = wa(p.mobile);
  if (seen.has(k)) { console.log(`   skipping duplicate ${p.mobile} (${p.name || "no name"})`); return false; }
  seen.add(k); return true;
});

console.log(`${send ? "SENDING" : "DRY RUN"} — ${list.length} people\n`);

let ok = 0, failed = 0;
for (const p of list) {
  const line = `${greet(p.name).padEnd(18)} ${p.mobile.padEnd(12)} ${p.note}`;
  if (!send) { console.log(`   ${line}`); continue; }

  const body = {
    messaging_product: "whatsapp",
    to: wa(p.mobile),
    type: "template",
    template: {
      name: TEMPLATE,
      language: { code: "en" },
      components: [{ type: "body", parameters: [
        { type: "text", text: greet(p.name) },
        { type: "text", text: LINK },
      ] }],
    },
  };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      failed++;
      console.log(`   FAIL ${line}\n        ${data?.error?.message ?? res.status}`);
    } else {
      ok++;
      console.log(`   sent ${line}`);
    }
  } catch (e) {
    failed++;
    console.log(`   FAIL ${line}\n        ${e.message}`);
  }
  // Gentle on the API, and it keeps the log readable if something starts failing.
  await new Promise((r) => setTimeout(r, 700));
}

if (send) console.log(`\nsent ${ok}, failed ${failed}`);
else console.log(`\nNothing sent. Re-run with --send once the template is APPROVED.`);
