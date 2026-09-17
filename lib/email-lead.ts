import { emailConfigured } from "@/lib/email";

/** Plain lead alert to the sales inbox — no template, just the facts. */
export async function sendEnquiryAlertEmail(summary: string, fields: Record<string, string>) {
  const to = process.env.SALES_LEAD_EMAIL;
  if (!to || !emailConfigured()) return;
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8A8D82;font-size:12px;text-transform:uppercase;letter-spacing:1px">${k}</td><td style="padding:6px 0;font-size:14px">${v || "—"}</td></tr>`)
    .join("");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: `New website enquiry: ${summary}`,
        html: `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif">${rows}</table>`,
      }),
    });
  } catch (err) {
    console.error("[enquiry] alert email failed:", err);
  }
}
