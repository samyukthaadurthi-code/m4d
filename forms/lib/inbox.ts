import {
  allRows,
  appendRows,
  ensureSheet,
  findBy,
  setRange,
  sheetsConfigured,
} from "@/lib/sheets";
import { SHEETS, WA_MESSAGE_COLUMNS, WA_THREAD_COLUMNS } from "@/lib/schema";
import {
  fromThread,
  tenDigits,
  toThread,
  type Mode,
  type Thread,
} from "@/lib/inbox-rows";

/**
 * The WhatsApp conversation store behind the sales inbox.
 *
 * The number runs on the Cloud API, so it cannot be opened in the WhatsApp
 * Business app and Meta gives us no inbox for it. Until now a conversation
 * existed only in the model's context for fifteen minutes and as one summary
 * row in Chat_Leads; nobody could read a thread or answer by hand. This keeps
 * every message so a salesperson can.
 *
 * ponytail: stored in the same spreadsheet as everything else, because that is
 * already the client's source of truth and needs no new account, bill or
 * backup. The ceiling is real — a full read per inbox load, and the number is
 * capped at 250 new people per day anyway — but move it to Postgres if the
 * messages tab passes roughly fifty thousand rows or the list feels slow.
 */

const PREVIEW = 180;

export {
  handledByHuman,
  tenDigits,
  windowOpen,
  type Mode,
  type Thread,
} from "@/lib/inbox-rows";

export type Message = {
  at: string;
  mobile: string;
  direction: "in" | "out";
  by: string;
  text: string;
};

/** A tab that has never been written to doesn't exist yet; that is not an error. */
async function rows(sheet: string): Promise<string[][]> {
  if (!sheetsConfigured()) return [];
  try {
    return await allRows(sheet);
  } catch (err) {
    console.warn(`[inbox] ${sheet} unreadable (probably not created yet):`, err);
    return [];
  }
}

/** Both tabs, created once per process rather than once per message. */
let ready: Promise<void> | undefined;
function ensure() {
  ready ??= (async () => {
    await ensureSheet(SHEETS.waThreads, [...WA_THREAD_COLUMNS]);
    await ensureSheet(SHEETS.waMessages, [...WA_MESSAGE_COLUMNS]);
  })().catch((err) => {
    ready = undefined; // so a transient failure doesn't poison the instance
    throw err;
  });
  return ready;
}

export async function listThreads(): Promise<Thread[]> {
  const all = await rows(SHEETS.waThreads);
  return all
    .slice(1)
    .map((r, i) => toThread(r, i + 2))
    .filter((t) => t.mobile)
    .sort((a, b) => (b.lastAt > a.lastAt ? 1 : b.lastAt < a.lastAt ? -1 : 0));
}

export async function loadThread(mobile: string): Promise<Thread | null> {
  const want = tenDigits(mobile);
  const all = await rows(SHEETS.waThreads);
  const i = all.findIndex((r, n) => n > 0 && tenDigits(r[0] ?? "") === want);
  return i === -1 ? null : toThread(all[i], i + 1);
}

export async function listMessages(mobile: string): Promise<Message[]> {
  const want = tenDigits(mobile);
  const all = await rows(SHEETS.waMessages);
  return all
    .slice(1)
    .filter((r) => tenDigits(r[1] ?? "") === want)
    .map((r) => ({
      at: r[0] ?? "",
      mobile: r[1] ?? "",
      direction: r[2] === "in" ? "in" : "out",
      by: r[3] ?? "",
      text: r[4] ?? "",
    }));
}

/** The name we already hold for this number, if they have registered with us. */
async function knownName(mobile: string): Promise<string> {
  try {
    const reg =
      (await findBy(SHEETS.registrations, "whatsapp", mobile)) ??
      (await findBy(SHEETS.registrations, "mobile", mobile));
    return reg?.full_name ?? "";
  } catch {
    return "";
  }
}

export type Entry = { dir: "in" | "out"; by: string; text: string };

/**
 * Writes messages and brings the thread row up to date.
 *
 * Pass the thread if you already have it — the webhook reads it anyway to find
 * out whether a human has taken over, and re-reading the tab for the write
 * would double the cost on the hot path.
 */
export async function record(
  mobile: string,
  entries: Entry[],
  thread?: Thread | null,
  opts: { markHuman?: boolean; read?: boolean } = {},
): Promise<Thread | null> {
  if (!sheetsConfigured() || !entries.length) return thread ?? null;
  const m = tenDigits(mobile);
  const now = new Date().toISOString();

  await ensure();
  await appendRows(
    SHEETS.waMessages,
    entries.map((e) => [now, m, e.dir, e.by, e.text.slice(0, 2000)]),
  );

  let t = thread === undefined ? await loadThread(m) : thread;
  const inbound = entries.filter((e) => e.dir === "in");
  const last = entries[entries.length - 1];

  if (!t) {
    t = {
      mobile: m,
      name: await knownName(m),
      lastAt: now,
      lastInboundAt: inbound.length ? now : "",
      lastText: last.text.slice(0, PREVIEW),
      unread: inbound.length,
      mode: "bot",
      humanAt: "",
      row: 0,
    };
    t.row = await appendRows(SHEETS.waThreads, [fromThread(t)]);
    return t;
  }

  t.lastAt = now;
  if (inbound.length) t.lastInboundAt = now;
  t.lastText = last.text.slice(0, PREVIEW);
  t.unread = opts.read ? 0 : t.unread + inbound.length;
  if (opts.markHuman) {
    t.mode = "human";
    t.humanAt = now;
  }
  await setRange(SHEETS.waThreads, `A${t.row}:H${t.row}`, [fromThread(t)]);
  return t;
}

/** Hand a conversation to a person, or give it back to the assistant. */
export async function setMode(mobile: string, mode: Mode) {
  const t = await loadThread(mobile);
  if (!t) return null;
  t.mode = mode;
  t.humanAt = mode === "human" ? new Date().toISOString() : "";
  await setRange(SHEETS.waThreads, `A${t.row}:H${t.row}`, [fromThread(t)]);
  return t;
}

export async function markRead(mobile: string) {
  const t = await loadThread(mobile);
  if (!t || !t.unread) return t;
  t.unread = 0;
  await setRange(SHEETS.waThreads, `A${t.row}:H${t.row}`, [fromThread(t)]);
  return t;
}
