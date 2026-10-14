/**
 * Demo conversations for the sales inbox, so the page can be looked at before
 * a real customer is in it — and wiped afterwards.
 *
 *   node tools/inbox-seed.mjs seed    # two made-up conversations
 *   node tools/inbox-seed.mjs clear   # blank both tabs, headers kept
 *
 * Run from forms/, with .env.local beside it.
 *
 * Clearing blanks cells and leaves the tabs in place. Nothing in WA_Threads or
 * WA_Messages takes its identity from a row number — unlike every lead tab — so
 * there is no ID to strand, but the habit stays.
 */
import { JWT } from "google-auth-library";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);

const THREADS = "WA_Threads";
const MESSAGES = "WA_Messages";
const THREAD_COLS = ["mobile", "name", "last_at", "last_inbound_at", "last_text", "unread", "mode", "human_at"];
const MESSAGE_COLS = ["at", "mobile", "direction", "by", "text"];

async function api() {
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

const ago = (mins) => new Date(Date.now() - mins * 60e3).toISOString();

async function seed() {
  const { get, post, put } = await api();
  const meta = await get("");
  const have = new Set(meta.sheets.map((s) => s.properties.title));
  for (const title of [THREADS, MESSAGES]) {
    if (!have.has(title)) {
      await post(":batchUpdate", { requests: [{ addSheet: { properties: { title } } }] });
    }
  }
  await put(`/values/${THREADS}!A1?valueInputOption=RAW`, { values: [THREAD_COLS] });
  await put(`/values/${MESSAGES}!A1?valueInputOption=RAW`, { values: [MESSAGE_COLS] });

  // One live conversation inside the reply window, one where it has closed, and
  // one a person has already taken over — the three states the page has to show.
  const threads = [
    ["9999900001", "Ramasamy", ago(6), ago(6), "Sir, what is the price for a 3 cent plot?", "2", "bot", ""],
    ["9999900002", "", ago(40 * 60), ago(40 * 60), "Is the Othakadai site DTCP approved?", "0", "bot", ""],
    ["9999900003", "Thirupathi", ago(55), ago(70), "I will come on Sunday with my wife", "0", "human", ago(55)],
  ];
  const messages = [
    [ago(20), "9999900001", "in", "customer", "Hi"],
    [ago(19), "9999900001", "out", "Thamarai", "Hello, I'm Thamarai from MRC Landmarks. Ask me anything about our plots in Southern Tamil Nadu."],
    [ago(7), "9999900001", "in", "customer", "Sir, what is the price for a 3 cent plot?"],
    [ago(6), "9999900001", "out", "Thamarai", "Our plot schedule is shared by the sales team directly — I'll have someone call you with the rate for a 3 cent plot at ANANTAA. May I take your name?"],
    [ago(41 * 60), "9999900002", "in", "customer", "Is the Othakadai site DTCP approved?"],
    [ago(40 * 60), "9999900002", "out", "Thamarai", "Yes — ANANTAA is DTCP approved and TNRERA registered. The approval numbers are on the project page."],
    [ago(80), "9999900003", "in", "customer", "I want to see the site this weekend"],
    [ago(70), "9999900003", "in", "customer", "I will come on Sunday with my wife"],
    [ago(55), "9999900003", "out", "sales", "Sunday is fine sir. Our team will be at the site from 10am — I will keep the layout ready for you."],
  ];
  await post(`/values/${THREADS}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { values: threads });
  await post(`/values/${MESSAGES}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { values: messages });
  console.log(`seeded ${threads.length} conversations, ${messages.length} messages`);
}

/**
 * Removes the demo rows and nothing else.
 *
 * This used to blank both tabs outright, which was safe for about an hour —
 * until real customers were in them. Now it only touches rows whose number
 * starts 99999000, which is what seed() writes and no real Indian mobile can
 * be. Blanked rows are left in place; both tabs skip rows with no number, and
 * nothing here takes its identity from a row number.
 */
async function clear() {
  const { get, post } = await api();
  const isDemo = (m) => /^(91)?99999000\d\d$/.test((m ?? "").replace(/\D/g, ""));

  for (const [title, col] of [[THREADS, 0], [MESSAGES, 1]]) {
    const rows = (await get(`/values/${encodeURIComponent(title)}!A1:Z5000`)).values || [];
    const hits = rows
      .map((r, i) => ({ n: i + 1, mobile: r[col] }))
      .filter((r) => r.n > 1 && isDemo(r.mobile));
    if (!hits.length) {
      console.log(`${title}: no demo rows`);
      continue;
    }
    await post("/values:batchClear", { ranges: hits.map((h) => `${title}!A${h.n}:Z${h.n}`) });
    console.log(`${title}: cleared ${hits.length} demo row(s), left ${rows.length - 1 - hits.length} real one(s) alone`);
  }
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "clear") await clear();
else console.log("usage: node tools/inbox-seed.mjs seed|clear");
