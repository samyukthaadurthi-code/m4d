/**
 * Email counterpart to lib/whatsapp.ts — every automated WhatsApp message has a
 * matching email, because a broker who mistypes their number still needs the badge.
 *
 * Uses Resend's REST API directly; no SDK, no dependency.
 */

const API = "https://api.resend.com/emails";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const list = (v: string | undefined) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
/** Sales desk: enquiries and site visits. */
export const salesDesk = () => list(process.env.SALES_LEAD_EMAIL);
/** Partner desk: registrations, CP applications, approvals. Falls back to sales until PARTNER_LEAD_EMAIL is set. */
export const partnerDesk = () => (list(process.env.PARTNER_LEAD_EMAIL).length ? list(process.env.PARTNER_LEAD_EMAIL) : salesDesk());

async function safeSend(
  label: string,
  to: string,
  subject: string,
  html: string,
  replyTo = salesDesk()[0],
) {
  if (!emailConfigured()) {
    console.warn(`[email] ${label} skipped — not configured`);
    return { sent: false, reason: "not-configured" as const };
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return { sent: false, reason: "no-address" as const };
  }
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        // A real mailbox to reply to, and a plain-text part: HTML-only mail from
        // a young domain is what tips Gmail into the spam folder.
        reply_to: replyTo || undefined,
        subject,
        html,
        text: html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2: $1").replace(/<[^>]+>/g, " ").replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim(),
      }),
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return { sent: true as const };
  } catch (err) {
    console.error(`[email] ${label} failed:`, err);
    return { sent: false, reason: "error" as const };
  }
}

const INK = "#1A2A2D";
const GOLD = "#C4A97D";
const TEAL = "#176A70";
const CREAM = "#F7F5EF";

/** Inline styles only — email clients strip <style> blocks. */
function wrap(body: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:${INK};padding:22px 28px">
<div style="color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:3px">MRC LANDMARKS</div>
<div style="color:${GOLD};font-size:11px;letter-spacing:2px;margin-top:4px">Crafting Landmarks, Creating Legacies.</div>
</td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="background:${CREAM};padding:16px 28px;font-size:11px;color:#8A8D82;line-height:1.6">
You are receiving this because you registered with MRC Landmarks.
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;font-weight:bold">${label}</a>`;

export function sendBadgeEmail(
  to: string,
  fullName: string,
  uniqueId: string,
  badgeUrl: string,
  badgePageUrl: string,
) {
  return safeSend(
    `badge ${uniqueId}`,
    to,
    `Your MRC Landmarks partner badge — ${uniqueId}`,
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Welcome, ${fullName}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        Your partner ID is <strong style="color:${INK}">${uniqueId}</strong>.
        Show this badge at the MRC desk.
      </p>
      <img src="${badgeUrl}" alt="Partner badge ${uniqueId}" width="504"
           style="width:100%;max-width:504px;border-radius:8px;display:block;margin-bottom:22px">
      ${button(badgePageUrl, "Open my badge")}
      <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8A8D82">
        Keep this email — you will need your ID for site visits and to open the
        partner resource centre.
      </p>`),
    partnerDesk()[0],
  );
}

export function sendCpFormLinkEmail(to: string, fullName: string, link: string) {
  return safeSend(
    "cp form link",
    to,
    "One more step for the MRC Channel Partner programme",
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Almost there, ${fullName}.</p>
      <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#4A5450">
        You told us you are interested in the Channel Partner programme. This
        form takes under a minute.
      </p>
      ${button(link, "Complete my application")}`),
    partnerDesk()[0],
  );
}

export function sendVisitConfirmationEmail(
  to: string,
  visitorName: string,
  requirement: string,
  budget: string,
  preferredDate: string,
) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;font-size:12px;color:#8A8D82;text-transform:uppercase;letter-spacing:1px;width:42%">${k}</td><td style="padding:7px 0;font-size:14px;color:${INK}">${v || "—"}</td></tr>`;
  return safeSend(
    "visit confirmation",
    to,
    "Your MRC Landmarks site visit request",
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Thank you, ${visitorName}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        We have your site visit request. Our team will call you to confirm the
        date and time. Here is what you told us:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border-top:1px solid #E4E2DA;border-bottom:1px solid #E4E2DA;margin-bottom:20px">
        ${row("Looking for", requirement)}
        ${row("Budget", budget)}
        ${row("Preferred date", preferredDate)}
      </table>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D82">
        If any of this is wrong, just reply to this email.
      </p>`),
  );
}

export function sendEnquiryAckEmail(
  to: string,
  name: string,
  mobile: string,
  interest: string,
) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;font-size:12px;color:#8A8D82;text-transform:uppercase;letter-spacing:1px;width:42%">${k}</td><td style="padding:7px 0;font-size:14px;color:${INK}">${v || "—"}</td></tr>`;
  return safeSend(
    "enquiry ack",
    to,
    "We have your enquiry — MRC Landmarks",
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Thank you, ${name}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        We have your enquiry. Someone from the MRC team &mdash; not a call centre &mdash;
        will call you within one working day to fix a time for your free site visit.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border-top:1px solid #E4E2DA;border-bottom:1px solid #E4E2DA;margin-bottom:20px">
        ${row("Interested in", interest)}
        ${row("We will call", mobile)}
      </table>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D82">
        If any of this is wrong, just reply to this email.
      </p>`),
  );
}

export function sendCpReceivedEmail(to: string, name: string, cpId: string) {
  return safeSend(
    "cp received",
    to,
    "Your Channel Partner application — MRC Landmarks",
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Thank you, ${name}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        We have your Channel Partner application under ID <strong>${cpId}</strong>.
        The MRC partnerships team reviews every application; you will get an email
        from us the moment it is approved, with your sign-in to the partner resource centre.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D82">
        Questions in the meantime? Just reply to this email.
      </p>`),
    partnerDesk()[0],
  );
}

export function sendCpApprovedEmail(to: string, name: string, cpId: string, loginUrl: string) {
  return safeSend(
    "cp approved",
    to,
    `Your partner application ${cpId} is approved`,
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Approved, ${name}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        The MRC partnerships team has approved your Channel Partner application.
        Your resource centre (project file, brochure and creatives) is open.
        Sign in with your partner ID <strong>${cpId}</strong> and the mobile number you registered with.
      </p>
      <p style="margin:0 0 12px">${button(loginUrl, "Sign in to the resource centre")}</p>
      <p style="margin:0 0 24px;font-size:13px;color:#8A8D82">Or open this address: ${loginUrl}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D82">
        Every buyer you introduce is tracked to ${cpId}. Reply to this email to reach the partnerships team.
      </p>`),
    partnerDesk()[0],
  );
}

export function sendForumWaitlistEmail(to: string, name: string, id: string) {
  return safeSend(
    "forum waitlist",
    to,
    "You are on the MRC Forum early-access list",
    wrap(`
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">Thank you, ${name}.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5450">
        The MRC Forum &mdash; one network for the professionals who build in the South &mdash; opens soon,
        and you are on the early-access list under reference <strong>${id}</strong>. You will hear from us
        before it opens, with your invitation and the first meet-up dates.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D82">
        Questions in the meantime? Just reply to this email.
      </p>`),
  );
}
