"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The sales inbox.
 *
 * The number runs on the Cloud API, so it cannot be opened in the WhatsApp
 * Business app — this page is the only way anyone at MRC can read a full
 * conversation or answer one by hand. It is used by a salesperson, not an
 * engineer, so everything the tool knows and he doesn't is written on the
 * screen in words: whether a reply will actually send, whether the assistant
 * or he is answering, and what to do when a reply won't go.
 *
 * Polls rather than holding a socket open. One person has this open at a time
 * and a few seconds late is not late.
 */

type Thread = {
  mobile: string;
  name: string;
  lastAt: string;
  lastText: string;
  unread: number;
  mode: "bot" | "human";
  canReply: boolean;
  mine: boolean;
};

type Message = {
  at: string;
  mobile: string;
  direction: "in" | "out";
  by: string;
  text: string;
};

type Open = {
  mobile: string;
  name: string;
  mode: "bot" | "human";
  mine: boolean;
  canReply: boolean;
  lastInboundAt: string;
  messages: Message[];
};

const TEAL = "#176A70";
const INK = "#1A2A2D";

/** Short and unambiguous: a time today, a date before that. */
function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** How long the reply window has left, in the words a person would use. */
function windowLeft(lastInboundAt: string) {
  const at = Date.parse(lastInboundAt || "");
  if (!Number.isFinite(at)) return "";
  const left = 24 * 3600e3 - (Date.now() - at);
  if (left <= 0) return "";
  const hours = Math.floor(left / 3600e3);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} left to reply`;
  return `${Math.max(1, Math.round(left / 60e3))} minutes left to reply`;
}

export default function InboxPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);

  const openMobile = open?.mobile ?? "";
  const bottom = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/inbox/threads", { cache: "no-store" });
    if (res.status === 401) {
      setSignedIn(false);
      return;
    }
    const data = await res.json();
    setSignedIn(true);
    setThreads(data.threads ?? []);
  }, []);

  const loadThread = useCallback(async (mobile: string) => {
    const res = await fetch(`/api/inbox/messages?mobile=${mobile}`, { cache: "no-store" });
    if (res.status === 401) {
      setSignedIn(false);
      return;
    }
    if (!res.ok) return;
    setOpen(await res.json());
  }, []);

  // First load, then keep both panes fresh.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadThreads();
      } catch {
        if (alive) setSignedIn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadThreads]);

  useEffect(() => {
    if (signedIn !== true) return;
    const id = setInterval(() => {
      loadThreads().catch(() => {});
      if (openMobile) loadThread(openMobile).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [signedIn, openMobile, loadThreads, loadThread]);

  // So an unanswered message is visible from another tab.
  const waiting = threads.reduce((n, t) => n + (t.unread > 0 ? 1 : 0), 0);
  useEffect(() => {
    document.title = waiting ? `(${waiting}) MRC sales inbox` : "MRC sales inbox";
  }, [waiting]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [open?.messages.length, openMobile]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const res = await fetch("/api/inbox/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error ?? "That did not work.");
        setBusy(false);
        return;
      }
      setPasscode("");
      await loadThreads();
    } catch {
      setAuthError("Could not reach the server. Check the internet and try again.");
    }
    setBusy(false);
  }

  async function signOut() {
    await fetch("/api/inbox/login", { method: "DELETE" });
    setOpen(null);
    setThreads([]);
    setSignedIn(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !open) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/inbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: open.mobile, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "That did not send.");
        if (data.canReply === false) setOpen({ ...open, canReply: false });
        setSending(false);
        return;
      }
      setDraft("");
      setOpen({ ...open, messages: data.messages ?? open.messages, mode: "human", mine: true });
      loadThreads().catch(() => {});
    } catch {
      setSendError("Could not reach the server. The message was not sent.");
    }
    setSending(false);
  }

  async function handBack() {
    if (!open) return;
    await fetch("/api/inbox/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: open.mobile, mode: "bot" }),
    });
    setOpen({ ...open, mode: "bot", mine: false });
    loadThreads().catch(() => {});
  }

  if (signedIn === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7F5EF] text-[#4A5450]">
        Loading…
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7F5EF] px-5">
        <form onSubmit={signIn} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold" style={{ color: INK }}>MRC sales inbox</h1>
          <p className="mt-1.5 text-sm text-[#4A5450]">
            Every WhatsApp message sent to 95148 89555, and a box to reply from.
          </p>
          <label className="mt-6 block text-sm font-semibold" style={{ color: INK }} htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-[#E4E2DA] bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20"
            value={passcode}
            onChange={(e) => { setPasscode(e.target.value); setAuthError(""); }}
          />
          {authError && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-xl px-5 py-4 font-semibold text-white disabled:opacity-60"
            style={{ background: TEAL }}
          >
            {busy ? "Signing in…" : "Open the inbox"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-[#F7F5EF]">
      <header className="flex flex-shrink-0 items-center gap-3 px-5 py-3.5 text-white" style={{ background: INK }}>
        <div className="flex-1">
          <div className="text-sm font-bold tracking-[0.18em]">MRC LANDMARKS</div>
          <div className="text-xs tracking-widest text-[#C4A97D]">
            SALES INBOX
            {/* The number wraps to a second line on a phone and earns nothing there. */}
            <span className="hidden sm:inline"> · WHATSAPP 95148 89555</span>
          </div>
        </div>
        {waiting > 0 && (
          <span className="rounded-full bg-[#C4A97D] px-3 py-1 text-xs font-bold text-[#1A2A2D]">
            {waiting} waiting
          </span>
        )}
        <button onClick={signOut} className="rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10">
          Sign out
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversation list. On a phone it is the whole screen until one is opened. */}
        <aside
          className={`${open ? "hidden md:flex" : "flex"} w-full flex-col border-r border-[#E4E2DA] bg-white md:w-80 lg:w-96`}
        >
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && (
              <p className="px-5 py-8 text-sm text-[#4A5450]">
                No one has messaged the WhatsApp number yet. Anything that arrives will show up here.
              </p>
            )}
            {threads.map((t) => (
              <button
                key={t.mobile}
                onClick={() => {
                  setOpen(null);
                  setSendError("");
                  setDraft("");
                  loadThread(t.mobile).then(() => loadThreads()).catch(() => {});
                }}
                className={`w-full border-b border-[#F0EEE6] px-4 py-3.5 text-left transition hover:bg-[#F7F5EF] ${
                  openMobile === t.mobile ? "bg-[#F7F5EF]" : ""
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 truncate font-semibold" style={{ color: INK }}>
                    {t.name || `+91 ${t.mobile}`}
                  </span>
                  <span className="flex-shrink-0 text-xs text-[#8A938F]">{when(t.lastAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-[#4A5450]">{t.lastText}</span>
                  {t.unread > 0 && (
                    <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: TEAL }}>
                      {t.unread}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex gap-2 text-xs">
                  {t.name ? <span className="text-[#8A938F]">+91 {t.mobile}</span> : null}
                  {t.mine && <span className="font-semibold" style={{ color: TEAL }}>You are replying</span>}
                  {!t.canReply && <span className="text-[#B4601F]">Reply window closed</span>}
                </div>
              </button>
            ))}
          </div>
          <a
            href="https://business.facebook.com/wa/manage/message-templates/"
            target="_blank"
            rel="noreferrer"
            className="border-t border-[#E4E2DA] px-4 py-3 text-xs text-[#4A5450] hover:underline"
          >
            Add or change WhatsApp templates →
          </a>
        </aside>

        {/* The conversation. */}
        <section className={`${open ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col`}>
          {!open ? (
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[#4A5450]">
              Pick a conversation on the left to read it and reply.
            </div>
          ) : (
            <>
              <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#E4E2DA] bg-white px-4 py-3">
                <button onClick={() => setOpen(null)} className="md:hidden" style={{ color: TEAL }} aria-label="Back to the list">
                  ←
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold" style={{ color: INK }}>
                    {open.name || `+91 ${open.mobile}`}
                  </div>
                  <div className="text-xs text-[#8A938F]">
                    {/* The number is already the title when we have no name for them. */}
                    {[open.name ? `+91 ${open.mobile}` : "", open.canReply ? windowLeft(open.lastInboundAt) : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <a
                  href={`tel:+91${open.mobile}`}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
                  style={{ borderColor: TEAL, color: TEAL }}
                >
                  Call
                </a>
              </div>

              {/* Who is answering. The salesperson has to be able to see this at a glance. */}
              {open.mine ? (
                <div className="flex flex-shrink-0 flex-col gap-1 bg-[#176A70]/8 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex-1 font-semibold" style={{ color: "#12474C" }}>
                    You are handling this. Thamarai will not reply here.
                  </span>
                  <button
                    onClick={handBack}
                    className="flex-shrink-0 self-start font-semibold underline"
                    style={{ color: TEAL }}
                  >
                    Give it back to Thamarai
                  </button>
                </div>
              ) : (
                <div className="flex-shrink-0 bg-[#F0EEE6] px-4 py-2.5 text-sm text-[#4A5450]">
                  Thamarai is answering this one. Send a message below and she stops, so you can take over.
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {open.messages.map((m, i) => {
                  const mine = m.direction === "out";
                  const fromSales = m.by === "sales";
                  return (
                    <div key={`${m.at}-${i}`} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words"
                        style={
                          fromSales
                            ? { background: TEAL, color: "white" }
                            : mine
                              ? { background: "#EAF1F1", color: INK, border: "1px solid #D6E3E3" }
                              : { background: "#FFFFFF", color: INK, border: "1px solid #E4E2DA" }
                        }
                      >
                        <div
                          className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: fromSales ? "rgba(255,255,255,.75)" : "#8A938F" }}
                        >
                          {fromSales ? "You" : mine ? m.by || "MRC" : open.name || "Customer"} · {when(m.at)}
                        </div>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>

              {/* Reply, or an explanation of why not. */}
              <div className="flex-shrink-0 border-t border-[#E4E2DA] bg-white px-4 py-3">
                {sendError && (
                  <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{sendError}</p>
                )}
                {open.canReply ? (
                  <form onSubmit={send} className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      placeholder="Type your reply…"
                      className="flex-1 resize-none rounded-xl border border-[#E4E2DA] bg-white px-4 py-3 text-base text-[#1A2A2D] outline-none focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20"
                      value={draft}
                      onChange={(e) => { setDraft(e.target.value); setSendError(""); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="flex-shrink-0 rounded-xl px-5 py-3.5 font-semibold text-white disabled:opacity-50"
                      style={{ background: TEAL }}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-xl bg-[#FDF6EC] px-4 py-3.5">
                    <p className="text-sm font-semibold" style={{ color: "#8A5A12" }}>
                      You cannot type a reply to this one.
                    </p>
                    <p className="mt-1 text-sm text-[#4A5450]">
                      WhatsApp only allows a typed reply for 24 hours after the customer&rsquo;s own
                      last message, and that time has passed. Call them instead — the moment they
                      message again, this box comes back.
                    </p>
                    <a
                      href={`tel:+91${open.mobile}`}
                      className="mt-3 inline-block rounded-xl px-5 py-3 font-semibold text-white"
                      style={{ background: TEAL }}
                    >
                      Call +91 {open.mobile}
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
