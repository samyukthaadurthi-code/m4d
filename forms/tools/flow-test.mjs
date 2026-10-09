/**
 * End-to-end check of every lead flow, against production.
 *
 *   node tools/flow-test.mjs purge   # delete every sheet row for the test identity
 *   node tools/flow-test.mjs fire    # submit one of each form and report what was sent
 *
 * Run it from forms/ so node resolves google-auth-library, and keep .env.local
 * beside it — purge reads the service account from there.
 *
 * The identity below is deliberately a real inbox and a real WhatsApp number:
 * the point is to confirm the messages arrive, which no amount of 200 OK proves.
 *
 * NEVER DELETE ROWS FROM THESE TABS — here or by hand in the sheet. Every lead
 * ID is the row number Sheets assigned on append, so a deleted row hands its
 * number to the next lead and two records end up sharing an ID. `purge` clears
 * cells and leaves the rows in place for exactly this reason.
 */
import { JWT } from "google-auth-library";
import fs from "node:fs";

const BASE = process.env.FLOW_TEST_BASE || "https://forms.mrclandmarks.com";

const ID = {
  name: "Sudharsan Raja",
  email: "sudharsanraja2003@gmail.com",
  mobile: "8525997656",
  whatsapp: "8525997656",
};
// Rows are matched on these, so earlier test runs are cleaned up too.
const NEEDLES = [ID.email.toLowerCase(), "8525997656", "9123456780"];

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);

async function sheets() {
  const jwt = new JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const { token } = await jwt.getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}`;
  const get = async (p) => (await fetch(base + p, { headers: { Authorization: `Bearer ${token}` } })).json();
  const post = async (p, b) =>
    (await fetch(base + p, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(b),
    })).json();
  return { get, post };
}

async function purge() {
  const { get, post } = await sheets();
  const meta = await get("");
  let total = 0;

  for (const s of meta.sheets) {
    const title = s.properties.title;
    const rows = (await get(`/values/${encodeURIComponent(title)}!A1:Z1000`)).values || [];
    // Collect first, delete after: row numbers shift as soon as one goes.
    const hits = [];
    rows.forEach((row, i) => {
      if (i === 0) return;
      const hay = row.join(" ").toLowerCase();
      if (NEEDLES.some((n) => hay.includes(n))) hits.push({ index: i, row });
    });
    if (!hits.length) continue;

    for (const h of hits) console.log(`  ${title} row ${h.index + 1}: ${h.row.slice(0, 5).join(" | ")}`);
    // Clear the cells, do NOT delete the rows.
    //
    // IDs are minted from the row number Sheets allocates on append — that is
    // what makes them race-free without a counter cell (see lib/sheets.ts).
    // Deleting a row hands its number back, so the next lead is issued an ID
    // that already belongs to an older one. Clearing keeps the row numbering
    // intact and costs nothing but a few blank rows.
    await post("/values:batchClear", {
      ranges: hits.map((h) => `${title}!A${h.index + 1}:Z${h.index + 1}`),
    });
    total += hits.length;
    console.log(`  ${title}: cleared ${hits.length}\n`);
  }
  console.log(total ? `purged ${total} row(s)` : "nothing to purge");
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 160) }; }
  const ok = res.ok && json.error === undefined && json.errors === undefined;
  console.log(`${ok ? "PASS" : "FAIL"}  ${path}  ${res.status}  ${JSON.stringify(json).slice(0, 200)}`);
  return { ok, json };
}

/** A date a week out, so visit confirmations read sensibly. */
function soon() {
  const d = new Date(Date.now() + 7 * 864e5);
  return d.toISOString().slice(0, 10);
}

async function fire() {
  console.log(`base ${BASE}\nidentity ${ID.email} / ${ID.mobile}\n`);

  // 1. Launch-event registration — badge + CP link, on email and WhatsApp.
  const reg = await post("/api/register", {
    source: "online",
    full_name: ID.name, mobile: ID.mobile, whatsapp: ID.whatsapp, email: ID.email,
    partner_type: "Individual", operating_areas: "Madurai, Dindigul",
    address: "Test run", experience_years: "3-5 years", primary_segment: "Plots",
    primary_audience: "Families, Investors", cp_interested: "Yes", consent: "yes",
  });
  const cpId = reg.json?.id || reg.json?.unique_id;
  console.log(`      -> partner id ${cpId ?? "(none)"}\n`);

  // 2. Channel-partner application against that registration.
  if (cpId) {
    await post("/api/cp", {
      unique_id: cpId, pan: "PAFPS2230R", gst: "", rera_id: "",
      team_size: "Just me", monthly_closures: "2-4",
      notes: "Full flow test", consent: "yes",
    });
  }

  // 3. Site visit, attributed to that partner so the lookup path runs too.
  await post("/api/visit", {
    source: "online", lang: "en",
    visitor_name: ID.name, visitor_mobile: ID.mobile, visitor_email: ID.email,
    visitor_location: "Madurai",
    referred_by_cp: cpId ? "Yes" : "No", cp_id: cpId ?? "",
    plot_preference: "Corner plot facing the park",
    amenities_preference: "Corner plot, Park", budget: "20-35 lakh",
    visit_date: soon(), visit_time: "Morning", consent: "yes",
  });

  // 4. Pop-up enquiry — the only flow that also pings sales on WhatsApp.
  await post("/api/enquiry", {
    name: ID.name, mobile: ID.mobile, email: ID.email,
    interest: "ANANTAA, Othakadai", page: "/index.html", consent: "yes",
  });

  // 5. Side-tab enquiry.
  await post("/api/enquire-now", {
    name: ID.name, mobile: ID.mobile, email: ID.email, city: "Madurai",
    message: "Full flow test — side tab", page: "/about.html", consent: "yes",
  });

  // 6. Forum waitlist.
  await post("/api/forum", {
    name: ID.name, mobile: ID.mobile, email: ID.email,
    profession: "Developer", organisation: "KSOM", city: "Madurai", consent: "yes",
  });

  // 7. Chat widget: one question, then the lead capture it offers after two.
  await post("/api/chat", { messages: [{ role: "user", content: "Where is ANANTAA?" }] });
  await post("/api/chat", {
    lead: {
      name: ID.name, mobile: ID.mobile, email: ID.email,
      looking_for: "A corner plot at ANANTAA",
      questions: "Where is ANANTAA? | Full flow test",
      page: "/index.html",
    },
  });
}

const cmd = process.argv[2];
if (cmd === "purge") await purge();
else if (cmd === "fire") await fire();
else console.log("usage: node tools/flow-test.mjs purge|fire");
