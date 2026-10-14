import { NextResponse } from "next/server";
import { handledByHuman, listThreads, windowOpen } from "@/lib/inbox";
import { inboxUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The conversation list: who has written in, newest first. */
export async function GET() {
  if (!(await inboxUser())) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const threads = await listThreads();
  return NextResponse.json({
    threads: threads.map((t) => ({
      mobile: t.mobile,
      name: t.name,
      lastAt: t.lastAt,
      lastText: t.lastText,
      unread: t.unread,
      mode: t.mode,
      canReply: windowOpen(t),
      mine: handledByHuman(t),
    })),
  });
}
