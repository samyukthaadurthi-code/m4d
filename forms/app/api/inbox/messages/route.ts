import { NextResponse } from "next/server";
import {
  handledByHuman,
  listMessages,
  loadThread,
  markRead,
  record,
  setMode,
  tenDigits,
  windowOpen,
} from "@/lib/inbox";
import { inboxUser } from "@/lib/session";
import { sendText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorised = () =>
  NextResponse.json({ error: "Please sign in." }, { status: 401 });

const mobileOf = (req: Request) =>
  tenDigits(new URL(req.url).searchParams.get("mobile") ?? "");

/** One conversation. Opening it is what marks it read. */
export async function GET(req: Request) {
  if (!(await inboxUser())) return unauthorised();

  const mobile = mobileOf(req);
  if (mobile.length !== 10) {
    return NextResponse.json({ error: "Which number?" }, { status: 400 });
  }

  const [messages, thread] = await Promise.all([
    listMessages(mobile),
    markRead(mobile).catch(() => loadThread(mobile)),
  ]);

  return NextResponse.json({
    mobile,
    name: thread?.name ?? "",
    mode: thread?.mode ?? "bot",
    mine: handledByHuman(thread),
    canReply: thread ? windowOpen(thread) : false,
    lastInboundAt: thread?.lastInboundAt ?? "",
    messages,
  });
}

/**
 * Send a reply by hand.
 *
 * Replying takes the conversation off the assistant, because the two of them
 * answering at once is how a customer gets told two different things.
 */
export async function POST(req: Request) {
  if (!(await inboxUser())) return unauthorised();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mobile = tenDigits(typeof body.mobile === "string" ? body.mobile : "");
  const text = (typeof body.text === "string" ? body.text : "").trim();
  if (mobile.length !== 10) {
    return NextResponse.json({ error: "Which number?" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  }

  const thread = await loadThread(mobile);

  // WhatsApp only carries a written reply for 24 hours after the customer's own
  // last message. Checked here rather than letting Meta reject it, so the
  // person at the desk gets told what to do instead of a silent failure.
  if (!thread || !windowOpen(thread)) {
    return NextResponse.json(
      {
        error:
          "It is more than 24 hours since they last wrote, so WhatsApp will not " +
          "deliver a typed reply. Call them instead, and they can message again " +
          "to reopen the chat.",
        canReply: false,
      },
      { status: 409 },
    );
  }

  const sent = await sendText(mobile, text);
  if (!sent.sent) {
    return NextResponse.json(
      { error: "WhatsApp would not take that message. Please try again." },
      { status: 502 },
    );
  }

  const updated = await record(
    mobile,
    [{ dir: "out", by: "sales", text }],
    thread,
    { markHuman: true, read: true },
  );

  return NextResponse.json({
    ok: true,
    mode: updated?.mode ?? "human",
    messages: await listMessages(mobile),
  });
}

/** Hand the conversation back to the assistant, or take it over without typing. */
export async function PATCH(req: Request) {
  if (!(await inboxUser())) return unauthorised();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mobile = tenDigits(typeof body.mobile === "string" ? body.mobile : "");
  const mode = body.mode === "human" ? "human" : "bot";
  if (mobile.length !== 10) {
    return NextResponse.json({ error: "Which number?" }, { status: 400 });
  }

  const t = await setMode(mobile, mode);
  if (!t) return NextResponse.json({ error: "No such conversation." }, { status: 404 });
  return NextResponse.json({ ok: true, mode: t.mode, mine: handledByHuman(t) });
}
