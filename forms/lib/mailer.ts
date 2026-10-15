import nodemailer, { type Transporter } from "nodemailer";

/**
 * One place every email leaves from, so the sender can be swapped without
 * touching a single template.
 *
 * Resend's free plan allows 100 emails a day. A 200-broker launch event needs
 * about a thousand — the registration mail and the partner-application mail to
 * each broker, plus the desk alerts. The paid plan was not available in time,
 * but MRC already pays for Hostinger Business Email, which allows 1,000 a day
 * on Starter and 3,000 on Standard, and sales@ / partners@ / info@ already have
 * SPF and DKIM set up on the domain.
 *
 * So: when SMTP_HOST is configured we send through those mailboxes, otherwise
 * through Resend. Unset the SMTP variables and everything returns to Resend
 * with no code change.
 */

export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string | string[];
};

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

export const resendConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export const mailerConfigured = () => smtpConfigured() || resendConfigured();

/** Which sender is live — worth logging once rather than guessing from behaviour. */
export const mailerName = () => (smtpConfigured() ? "smtp" : resendConfigured() ? "resend" : "none");

let cached: Transporter | null = null;
function transport() {
  // Reused across invocations on a warm function; a cold one pays one handshake.
  if (!cached) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 is implicit TLS, 587 upgrades with STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
    });
  }
  return cached;
}

/**
 * Proves the mailbox would accept a message, without sending one.
 *
 * Connects and authenticates, which is what actually breaks — a changed
 * mailbox password is silent otherwise, and every alert to the sales desk
 * stops arriving with nothing in the logs anyone reads.
 */
export async function mailerReady(): Promise<string> {
  if (smtpConfigured()) {
    await transport().verify();
    return `${process.env.SMTP_HOST} accepted the login`;
  }
  if (resendConfigured()) {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!res.ok) throw new Error(`Resend returned ${res.status}`);
    return "Resend accepted the key";
  }
  throw new Error("no mail provider is configured");
}

/** Sends through whichever provider is configured. Throws so callers can log. */
export async function deliver(mail: Mail): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "MRC Landmarks <noreply@mrclandmarks.com>";

  if (smtpConfigured()) {
    await transport().sendMail({
      from: process.env.SMTP_FROM ?? from,
      to: Array.isArray(mail.to) ? mail.to.join(", ") : mail.to,
      subject: mail.subject,
      html: mail.html,
      replyTo: Array.isArray(mail.replyTo) ? mail.replyTo.join(", ") : mail.replyTo,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: mail.to,
      reply_to: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
