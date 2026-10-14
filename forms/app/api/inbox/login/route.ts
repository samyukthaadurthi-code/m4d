import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { INBOX_COOKIE, inboxConfigured, issue, passcodeOk } from "@/lib/session";

export const runtime = "nodejs";

/** Sign in to the sales inbox with the shared passcode. */
export async function POST(req: Request) {
  if (!inboxConfigured()) {
    return NextResponse.json(
      { error: "The inbox is not set up on the server yet." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const given = typeof body.passcode === "string" ? body.passcode : "";
  if (!passcodeOk(given)) {
    return NextResponse.json({ error: "That passcode is not right." }, { status: 401 });
  }

  const cookie = issue("sales", INBOX_COOKIE);
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(INBOX_COOKIE);
  return NextResponse.json({ ok: true });
}
