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

async function safeSend(
  label: string,
  to: string,
  subject: string,
  html: string,
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
        subject,
        html,
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
