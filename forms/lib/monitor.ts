import { allRows, sheetsConfigured } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { mailerReady } from "@/lib/mailer";

/**
 * The daily health check behind /api/monitor.
 *
 * Everything this app does for MRC fails quietly by design — a Meta outage must
 * not cost a broker their registration, so every sender logs its error and
 * carries on. The cost of that choice is this: the forms keep saying thank you,
 * the sheet keeps filling up, and nobody is told that the alerts stopped. The
 * only way anyone found out used to be noticing the phone had gone quiet.
 *
 * So once a day this checks every outside thing the app leans on and sends a
 * report to the sales number — working or not. A report that stops arriving is
 * itself the alarm, which is why there is no "only message me when it breaks".
 */

const WABA = "1619372023218910";
const APP = "2907070423002397";
const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Every template the code actually sends. Keep in step with lib/whatsapp.ts —
 * Meta pauses a template on its own if recipients block or report it, and the
 * flow it belongs to then goes silent with no error anywhere.
 */
const LIVE_TEMPLATES = [
  "cp_registration_record",
  "cp_form_link",
  "cp_application_received",
  "cp_approved",
  "site_visit_confirmation",
  "enquiry_ack",
  "forum_waitlist",
  "lead_alert",
  "event_thank_you",
  "system_status",
];

export type Check = { name: string; ok: boolean; detail: string };

const graph = async (path: string) => {
  const res = await fetch(`${GRAPH}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Meta returned ${res.status}`);
  return data;
};

/** A hung dependency must not hang the whole report. */
function limit<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} did not answer in ${ms / 1000}s`)), ms),
    ),
  ]);
}

async function check(name: string, fn: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await limit(fn(), 9000, name) };
  } catch (err) {
    return { name, ok: false, detail: (err instanceof Error ? err.message : String(err)).slice(0, 180) };
  }
}

const reachable = (url: string) => async () => {
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`answered ${res.status}`);
  return `answered ${res.status}`;
};

export async function runChecks(): Promise<Check[]> {
  return Promise.all([
    check("The lead sheet", async () => {
      if (!sheetsConfigured()) throw new Error("Google credentials are not set");
      const rows = await allRows(SHEETS.registrations);
      return `readable, ${Math.max(rows.length - 1, 0)} registrations`;
    }),

    check("The WhatsApp number", async () => {
      const d = await graph(`${WABA}/phone_numbers?fields=status,quality_rating,messaging_limit_tier`);
      const n = d?.data?.[0];
      if (!n) throw new Error("Meta returned no number for this account");
      if (n.status !== "CONNECTED") throw new Error(`the number is ${n.status}, not connected`);
      if (n.quality_rating === "RED") throw new Error("quality rating has dropped to RED — sending may be restricted");
      return `connected, quality ${n.quality_rating}, ${n.messaging_limit_tier?.replace("TIER_", "")} new people a day`;
    }),

    // The quiet killer: if Meta drops the subscription, customers' messages
    // simply stop arriving. Nothing errors, because nothing is called.
    check("Incoming WhatsApp messages", async () => {
      const d = await graph(`${WABA}/subscribed_apps`);
      const apps: string[] = (d?.data ?? []).map((a: { whatsapp_business_api_data?: { id?: string } }) =>
        a?.whatsapp_business_api_data?.id ?? "",
      );
      if (!apps.includes(APP)) throw new Error("our app is no longer subscribed — incoming messages are not reaching us");
      return "reaching our webhook";
    }),

    check("Message templates", async () => {
      const d = await graph(`${WABA}/message_templates?limit=100&fields=name,status`);
      const status = new Map<string, string>((d?.data ?? []).map((t: { name: string; status: string }) => [t.name, t.status]));
      const bad = LIVE_TEMPLATES.filter((n) => status.get(n) !== "APPROVED")
        .map((n) => `${n} is ${status.get(n) ?? "missing"}`);
      if (bad.length) throw new Error(bad.join("; "));
      return `all ${LIVE_TEMPLATES.length} approved`;
    }),

    check("Email sending", mailerReady),
    check("The website", reachable("https://mrclandmarks.com")),
    check("The forms and inbox", reachable("https://forms.mrclandmarks.com/register")),

    check("Thamarai the assistant", async () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error("the assistant's key is not set");
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        cache: "no-store",
      });
      if (res.status === 401) throw new Error("the assistant's key has been rejected — she cannot answer anyone");
      if (!res.ok) throw new Error(`the assistant's provider answered ${res.status}`);
      return "answering";
    }),
  ]);
}

/** "3 enquiries", not "3 enquirys" — this is read by a person every morning. */
const plural = (word: string, n: number) =>
  n === 1 ? word : word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`;

/** Rows added to a tab since a cut-off, counted off whichever column holds the date. */
async function since(sheet: string, cutoff: number): Promise<number> {
  const rows = await allRows(sheet);
  const header = rows[0] ?? [];
  const col = header.findIndex((h) => /_at$/.test(h));
  if (col === -1) return 0;
  return rows.slice(1).filter((r) => {
    const t = Date.parse(r[col] ?? "");
    // A voided row keeps its marker in column A; it was test data, not a lead.
    return Number.isFinite(t) && t >= cutoff && !(r[0] ?? "").startsWith("VOID-");
  }).length;
}

export type Business = { lines: string[]; waiting: number };

/** What the sales desk actually wants to read: who came in, and who is still waiting. */
export async function businessSummary(hours = 24): Promise<Business> {
  const cutoff = Date.now() - hours * 3600e3;
  const counted: [string, string][] = [
    [SHEETS.enquiries, "enquiry"],
    [SHEETS.enquireNow, "website enquiry"],
    [SHEETS.chatLeads, "WhatsApp enquiry"],
    [SHEETS.visits, "site visit"],
    [SHEETS.registrations, "registration"],
    [SHEETS.cp, "partner application"],
    [SHEETS.forum, "forum sign-up"],
  ];

  const lines: string[] = [];
  for (const [sheet, label] of counted) {
    const n = await since(sheet, cutoff).catch(() => 0);
    if (n) lines.push(`${n} ${plural(label, n)}`);
  }

  let waiting = 0;
  try {
    const rows = await allRows(SHEETS.waThreads);
    waiting = rows.slice(1).filter((r) => r[0] && Number(r[5] ?? 0) > 0).length;
  } catch {
    // The tab does not exist until the first message arrives; that is not a fault.
  }

  return { lines, waiting };
}

/** The report, written for the person on sales rather than for an engineer. */
export function report(checks: Check[], business: Business): string {
  const broken = checks.filter((c) => !c.ok);
  const parts: string[] = [];

  if (broken.length) {
    parts.push(
      broken.map((c) => `PROBLEM — ${c.name}: ${c.detail}`).join("\n"),
      broken.length === checks.length ? "" : "Everything else is working.",
    );
  } else {
    parts.push("Everything is working.");
  }

  const { lines, waiting } = business;
  parts.push(`Last 24 hours: ${lines.length ? lines.join(", ") : "nothing new"}.`);
  if (waiting === 1) parts.push("1 person is waiting for a reply in the inbox.");
  else if (waiting > 1) parts.push(`${waiting} people are waiting for a reply in the inbox.`);

  return parts.filter(Boolean).join("\n\n").slice(0, 1000);
}
