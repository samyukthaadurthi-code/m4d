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
import { JWT } from "google-auth-library";

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

/**
 * What each person actually receives, so it can be written into the inbox.
 *
 * Kept in step with the approved event_thank_you template by hand. A broadcast
 * that does not appear in the inbox leaves whoever is on sales reading replies
 * to a message he cannot see — "yes sir, what is the price?" with nothing above
 * it — which is worse than not having an inbox at all.
 */
const bodyText = (name, link) =>
  `Thank you for visiting us at the MRC ANANTAA launch, ${name}. It was good to meet you.\n\n` +
  `ANANTAA is 50 residential plots across 2.145 acres at Othakadai, Madurai, beside Yanaimalai hill — ` +
  `DTCP approved and TNRERA registered, with 7.2 m and 9.0 m internal roads and a tenth of the land ` +
  `kept as open space.\n\n` +
  `You can see the full project details, the master plan and the plot schedule here: ${link}\n\n` +
  `If you would like to visit the site again, or have any question about a plot, reply to this message ` +
  `or call us on 95144 39555.`;

async function sheets() {
  const jwt = new JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const { token } = await jwt.getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}`;
  const hdr = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  return {
    get: async (p) => (await fetch(base + p, { headers: hdr })).json(),
    post: async (p, b) => (await fetch(base + p, { method: "POST", headers: hdr, body: JSON.stringify(b) })).json(),
    put: async (p, b) => (await fetch(base + p, { method: "PUT", headers: hdr, body: JSON.stringify(b) })).json(),
  };
}

/**
 * Writes the broadcast into the inbox: one outbound message each, and a thread
 * so the person has a name and a conversation before they reply.
 *
 * last_inbound_at stays empty on purpose — they have not written to us, so the
 * 24-hour window is shut and the inbox correctly offers Call rather than a
 * reply box. Their first reply opens it.
 */
async function logToInbox(people) {
  const { get, post, put } = await sheets();
  const now = new Date().toISOString();

  const meta = await get("");
  const have = new Set(meta.sheets.map((s) => s.properties.title));
  for (const [title, cols] of [
    ["WA_Threads", ["mobile", "name", "last_at", "last_inbound_at", "last_text", "unread", "mode", "human_at"]],
    ["WA_Messages", ["at", "mobile", "direction", "by", "text"]],
  ]) {
    if (!have.has(title)) await post(":batchUpdate", { requests: [{ addSheet: { properties: { title } } }] });
    await put(`/values/${title}!A1?valueInputOption=RAW`, { values: [cols] });
  }

  // Anyone already in the inbox keeps their row; we only add the thank-you.
  const existing = (await get("/values/WA_Threads!A1:H5000")).values || [];
  const rowOf = new Map(
    existing.slice(1).map((r, i) => [(r[0] ?? "").replace(/\D/g, "").slice(-10), i + 2]),
  );

  const messages = [];
  const newThreads = [];
  const updates = [];

  for (const p of people) {
    const m = p.mobile.replace(/\D/g, "").slice(-10);
    const text = bodyText(greet(p.name), LINK);
    messages.push([now, m, "out", "MRC", text]);

    const preview = text.slice(0, 180);
    const row = rowOf.get(m);
    if (row) {
      const old = existing[row - 1];
      updates.push({
        range: `WA_Threads!A${row}:H${row}`,
        values: [[m, old[1] || p.name, now, old[3] ?? "", preview, old[5] ?? "0", old[6] || "bot", old[7] ?? ""]],
      });
    } else {
      newThreads.push([m, p.name, now, "", preview, "0", "bot", ""]);
    }
  }

  await post("/values/WA_Messages!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", { values: messages });
  if (newThreads.length)
    await post("/values/WA_Threads!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", { values: newThreads });
  if (updates.length)
    await post("/values:batchUpdate", { valueInputOption: "RAW", data: updates });

  console.log(`\ninbox: ${messages.length} message(s) written, ${newThreads.length} new thread(s), ${updates.length} updated`);
}

/** No name on the slip, so the greeting has to still read like a sentence. */
const greet = (n) => (n && n.trim() ? n.trim() : "there");
const wa = (m) => `91${m.replace(/\D/g, "").slice(-10)}`;

const send = process.argv.includes("--send");
const backfill = process.argv.includes("--backfill");

// A number written down twice at a busy desk is one person, not two messages.
const seen = new Set();
const list = PEOPLE.filter((p) => {
  const k = wa(p.mobile);
  if (seen.has(k)) { console.log(`   skipping duplicate ${p.mobile} (${p.name || "no name"})`); return false; }
  seen.add(k); return true;
});

if (backfill) {
  console.log(`BACKFILL — writing ${list.length} already-sent message(s) into the inbox`);
  await logToInbox(list);
  process.exit(0);
}

console.log(`${send ? "SENDING" : "DRY RUN"} — ${list.length} people\n`);

let ok = 0, failed = 0;
const failedTo = new Set();
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
      failedTo.add(p.mobile);
      console.log(`   FAIL ${line}\n        ${data?.error?.message ?? res.status}`);
    } else {
      ok++;
      console.log(`   sent ${line}`);
    }
  } catch (e) {
    failed++;
    failedTo.add(p.mobile);
    console.log(`   FAIL ${line}\n        ${e.message}`);
  }
  // Gentle on the API, and it keeps the log readable if something starts failing.
  await new Promise((r) => setTimeout(r, 700));
}

// A broadcast that is not in the inbox is a reply nobody can make sense of.
if (send && ok) await logToInbox(list.filter((p) => !failedTo.has(p.mobile)));

if (send) console.log(`\nsent ${ok}, failed ${failed}`);
else console.log(`\nNothing sent. Re-run with --send once the template is APPROVED.`);
