import { NextResponse } from "next/server";
import { businessSummary, report, runChecks } from "@/lib/monitor";
import { deliver } from "@/lib/mailer";
import { salesDesk } from "@/lib/email";
import { sendSystemStatus } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Eight outside services, checked in parallel, but a slow one must not cut the
// report short — this is the one request in the app allowed to take its time.
export const maxDuration = 60;

/**
 * The daily health check. Vercel's scheduler calls this once a day; anyone with
 * the key can call it by hand to see the state of things right now.
 *
 * It always sends, working or not. A report that stops arriving is itself the
 * alarm — a monitor that only speaks up when it notices a problem cannot tell
 * you it has stopped noticing.
 */
function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret, no endpoint
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true; // how Vercel's scheduler calls it
  return new URL(req.url).searchParams.get("key") === secret; // and how a person does
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const quiet = new URL(req.url).searchParams.get("dry") === "1";
  const [checks, business] = await Promise.all([runChecks(), businessSummary()]);
  const text = report(checks, business);
  const broken = checks.filter((c) => !c.ok);

  const sent: Record<string, unknown> = { whatsapp: "skipped", email: "skipped" };

  if (!quiet) {
    // Both channels, every time. If WhatsApp is the thing that has broken, the
    // WhatsApp alert telling you so is exactly the message that cannot arrive.
    const to = process.env.SALES_LEAD_WHATSAPP;
    if (to) sent.whatsapp = await sendSystemStatus(to, text);

    const desk = salesDesk();
    if (desk.length) {
      sent.email = await deliver({
        to: desk,
        subject: broken.length
          ? `MRC system check — ${broken.length} problem${broken.length === 1 ? "" : "s"}`
          : "MRC system check — all working",
        html:
          `<div style="font-family:Helvetica,Arial,sans-serif;color:#1A2A2D;font-size:15px;line-height:1.6">` +
          `<p style="white-space:pre-wrap">${text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>` +
          `<hr style="border:0;border-top:1px solid #E4E2DA;margin:20px 0">` +
          checks
            .map((c) => `<div>${c.ok ? "✓" : "✗"} <strong>${c.name}</strong> — ${c.detail}</div>`)
            .join("") +
          `</div>`,
      })
        .then(() => "sent")
        .catch((err) => `failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(
    { ok: broken.length === 0, report: text, checks, sent },
    { status: 200 },
  );
}
