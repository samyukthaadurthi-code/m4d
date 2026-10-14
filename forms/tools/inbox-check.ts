/**
 * Self-check for the inbox's row mapping and its two time rules.
 *
 *   node tools/inbox-check.ts
 *
 * No framework and nothing to install — lib/inbox-rows.ts has no imports, so
 * node can run it straight through. Worth having because a column read back in
 * the wrong order would put one customer's words in another's conversation, and
 * because getting the 24-hour rule backwards would either hide the reply box
 * from a salesperson who could have replied, or let him type into a void.
 */
import assert from "node:assert/strict";
import {
  fromThread,
  handledByHuman,
  tenDigits,
  toThread,
  windowOpen,
  type Thread,
} from "../lib/inbox-rows.ts";

const HOUR = 3600e3;
const now = Date.parse("2026-10-14T12:00:00.000Z");
const ago = (h: number) => new Date(now - h * HOUR).toISOString();

// --- the sheet row maps to the right fields, in both directions -------------
const row = [
  "8525997656",
  "Sudharsan Raja",
  ago(1),
  ago(2),
  "Is the plot DTCP approved?",
  "3",
  "human",
  ago(1),
];
const t = toThread(row, 7);
assert.equal(t.mobile, "8525997656");
assert.equal(t.name, "Sudharsan Raja");
assert.equal(t.lastInboundAt, ago(2));
assert.equal(t.lastText, "Is the plot DTCP approved?");
assert.equal(t.unread, 3);
assert.equal(t.mode, "human");
assert.equal(t.row, 7);
assert.deepEqual(fromThread(t), row, "a row must survive a write-read round trip");

// A short or empty row must not throw or shift fields along.
const fresh = toThread(["9876543210"], 2);
assert.equal(fresh.unread, 0);
assert.equal(fresh.mode, "bot", "anything that isn't 'human' means the assistant has it");
assert.equal(fromThread(fresh).length, 8, "every column gets written, even the empty ones");

// --- the 24-hour reply window ----------------------------------------------
assert.equal(windowOpen({ lastInboundAt: ago(23) }, now), true);
assert.equal(windowOpen({ lastInboundAt: ago(25) }, now), false);
assert.equal(windowOpen({ lastInboundAt: "" }, now), false, "never written to us = no window");
assert.equal(windowOpen({ lastInboundAt: "not a date" }, now), false);

// --- the hand-off, and the day after which it lapses ------------------------
assert.equal(handledByHuman(null, now), false);
assert.equal(handledByHuman({ mode: "bot", humanAt: ago(1) }, now), false);
assert.equal(handledByHuman({ mode: "human", humanAt: ago(1) }, now), true);
assert.equal(
  handledByHuman({ mode: "human", humanAt: ago(25) }, now),
  false,
  "a thread someone took and forgot goes back to the assistant after a day",
);
assert.equal(handledByHuman({ mode: "human", humanAt: "" }, now), false);

// --- numbers arrive in every shape a person might type ----------------------
assert.equal(tenDigits("+91 85259 97656"), "8525997656");
assert.equal(tenDigits("918525997656"), "8525997656");
assert.equal(tenDigits("08525997656"), "8525997656");

console.log("inbox-check: all good");
