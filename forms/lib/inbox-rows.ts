/**
 * The inbox's pure logic: how a thread maps to and from a spreadsheet row, and
 * the two questions the UI keeps asking about it.
 *
 * Kept free of imports so it can be run and asserted on directly — see
 * tools/inbox-check.ts. Column order is the part worth testing: a row written
 * in one order and read back in another is how MRC-CP-013 ended up with another
 * partner's details, and here it would put one customer's words in another
 * customer's conversation.
 */

const DAY = 24 * 60 * 60 * 1000;

export type Mode = "bot" | "human";

export type Thread = {
  mobile: string;
  name: string;
  lastAt: string;
  lastInboundAt: string;
  lastText: string;
  unread: number;
  mode: Mode;
  humanAt: string;
  /** 1-based sheet row, so an update is a write to a known range. */
  row: number;
};

export const tenDigits = (raw: string) => raw.replace(/\D/g, "").slice(-10);

/**
 * True while WhatsApp will carry a plain reply.
 *
 * Outside the window Meta accepts only an approved template, so the UI has to
 * say this out loud — a salesperson whose message silently fails will decide
 * the tool is broken, which is worse than knowing he has to phone instead.
 */
export function windowOpen(t: Pick<Thread, "lastInboundAt">, now = Date.now()) {
  const at = Date.parse(t.lastInboundAt || "");
  return Number.isFinite(at) && now - at < DAY;
}

/**
 * True while a person has the conversation and the assistant should keep quiet.
 *
 * ponytail: the hand-off lapses a day after the last human reply. Someone taking
 * a thread and then forgetting it would otherwise leave that customer talking
 * into silence for ever; this way the assistant picks them back up. Release it
 * by hand in the inbox to hand back sooner.
 */
export function handledByHuman(
  t: Pick<Thread, "mode" | "humanAt"> | null,
  now = Date.now(),
) {
  if (!t || t.mode !== "human") return false;
  const at = Date.parse(t.humanAt || "");
  return Number.isFinite(at) && now - at < DAY;
}

/** Must stay in step with WA_THREAD_COLUMNS in lib/schema.ts. */
export const toThread = (r: string[], row: number): Thread => ({
  mobile: (r[0] ?? "").trim(),
  name: r[1] ?? "",
  lastAt: r[2] ?? "",
  lastInboundAt: r[3] ?? "",
  lastText: r[4] ?? "",
  unread: Number(r[5] ?? 0) || 0,
  mode: r[6] === "human" ? "human" : "bot",
  humanAt: r[7] ?? "",
  row,
});

export const fromThread = (t: Thread): string[] => [
  t.mobile,
  t.name,
  t.lastAt,
  t.lastInboundAt,
  t.lastText,
  String(t.unread),
  t.mode,
  t.humanAt,
];
