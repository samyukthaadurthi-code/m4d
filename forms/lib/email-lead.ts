import { emailConfigured, partnerDesk, salesDesk } from "@/lib/email";

/**
 * Sales-team alert: one plain table of facts per event, to every address in
 * SALES_LEAD_EMAIL (comma-separated). Reply-To is the same list so a rep can
 * answer straight from the alert. Fire-and-forget — never blocks the save.
 */
export async function notifySales(subject: string, fields: Record<string, string>, to = salesDesk()) {
  if (!to.length || !emailConfigured()) return;
  const rows = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#8A8D82;font-size:12px;text-transform:uppercase;letter-spacing:1px;white-space:nowrap">${k}</td><td style="padding:6px 0;font-size:14px;color:#1A2A2D">${/^https?:\/\//.test(v) ? `<a href="${v}" style="color:#176A70">${v}</a>` : v}</td></tr>`)
    .join("");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        reply_to: to,
        subject,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px"><p style="margin:0 0 12px;font-size:15px;color:#1A2A2D"><strong>${subject}</strong></p><table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #E4E2DA;border-bottom:1px solid #E4E2DA;width:100%">${rows}</table><p style="margin:12px 0 0;font-size:12px;color:#8A8D82">Sent automatically by the MRC Landmarks website.</p></div>`,
      }),
    });
    if (!res.ok) console.error("[sales alert] failed:", res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error("[sales alert] failed:", err);
  }
}

/** Kept for the enquiry route's existing import. */
export const sendEnquiryAlertEmail = (summary: string, fields: Record<string, string>) =>
  notifySales(`New website enquiry: ${summary}`, fields);

/** Channel-partner events go to the partner desk, not the sales desk. */
export const notifyPartners = (subject: string, fields: Record<string, string>) =>
  notifySales(subject, fields, partnerDesk());
