import { NextResponse } from "next/server";
import { findBy, findById, findRowNumber, setCell, sheetsConfigured } from "@/lib/sheets";
import { CP_APPROVED, CP_COLUMNS, SHEETS } from "@/lib/schema";
import { approveTokenValid } from "@/lib/approve";
import { sendCpApprovedEmail } from "@/lib/email";
import { sessionConfigured } from "@/lib/session";
import { origin } from "@/lib/origin";

export const runtime = "nodejs";

const page = (title: string, body: string, status = 200) =>
  new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#F7F5EF;font-family:Helvetica,Arial,sans-serif;color:#1A2A2D"><div style="max-width:480px;margin:10vh auto;background:#fff;border-radius:12px;padding:32px"><div style="font-size:12px;letter-spacing:3px;color:#8A8D82">MRC LANDMARKS · PARTNERSHIPS</div><h1 style="font-size:22px;margin:14px 0 10px">${title}</h1>${body}</div></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

function params(req: Request) {
  const u = new URL(req.url);
  return { id: (u.searchParams.get("id") ?? "").toUpperCase().trim(), t: u.searchParams.get("t") ?? "" };
}

async function load(req: Request) {
  const { id, t } = params(req);
  if (!id || !approveTokenValid(id, t)) return { error: page("Link not valid", "<p>This approval link is not valid.</p>", 401) };
  const app = await findBy(SHEETS.cp, "unique_id", id);
  if (!app) return { error: page("No application", `<p>${id} has not submitted a partner application yet.</p>`, 404) };
  return { id, t, app };
}

/** The link in the alert lands here: a confirm button, so a mail scanner following links cannot approve anyone. */
export async function GET(req: Request) {
  if (!sheetsConfigured() || !sessionConfigured()) return page("Not configured", "<p>Server is not configured.</p>", 503);
  const r = await load(req);
  if ("error" in r) return r.error;
  if (r.app.status === CP_APPROVED) return page("Already approved", `<p>${r.id} · ${r.app.full_name} is already an approved partner.</p>`);
  return page(
    `Approve ${r.id}?`,
    `<p style="font-size:15px;line-height:1.6">${r.app.full_name} · ${r.app.mobile}<br>PAN ${r.app.pan || "—"} · Team ${r.app.team_size || "—"} · Closes ${r.app.monthly_closures || "—"}/month</p>
     <form method="post"><button style="background:#176A70;color:#fff;border:0;border-radius:999px;padding:13px 26px;font-size:15px;font-weight:bold;cursor:pointer">Approve and email the partner</button></form>
     <p style="font-size:12px;color:#8A8D82;margin-top:16px">Not approving? Just close this page. The application stays "Pending" in the sheet.</p>`,
  );
}

export async function POST(req: Request) {
  if (!sheetsConfigured() || !sessionConfigured()) return page("Not configured", "<p>Server is not configured.</p>", 503);
  const r = await load(req);
  if ("error" in r) return r.error;
  const row = await findRowNumber(SHEETS.cp, "unique_id", r.id);
  const col = String.fromCharCode(65 + CP_COLUMNS.indexOf("status")); // ponytail: <26 columns
  if (row) await setCell(SHEETS.cp, `${col}${row}`, CP_APPROVED);
  const reg = await findById(SHEETS.registrations, r.id);
  const sent = await sendCpApprovedEmail(reg?.email ?? "", r.app.full_name, r.id, `${origin(req)}/partners`);
  return page(
    `${r.id} approved`,
    `<p>${r.app.full_name} is now an approved Channel Partner.</p><p>${sent.sent ? `Sign-in email sent to ${reg?.email}.` : "Could not email the partner — tell them to sign in at /partners."}</p>`,
  );
}
