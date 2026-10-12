/**
 * Does Hostinger SMTP actually work for us? Answer it before trusting an event
 * to it, and without touching the live flow.
 *
 *   cd forms && node tools/smtp-test.mjs you@example.com
 *
 * Reads SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD from .env.local. The
 * password belongs in that file, never on a command line or in a chat window.
 *
 * Three things get checked, in order, because each one fails differently:
 *   1. the TCP connection and TLS            — is the port reachable from here
 *   2. the login                             — are the credentials right
 *   3. a real message to a real inbox        — does it actually arrive
 *
 * A pass here is necessary but not sufficient: Vercel's network is not this
 * laptop. Step 2 of the plan is the same check from a deployed function.
 */
import nodemailer from "nodemailer";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);

const to = process.argv[2];
if (!to) { console.error("usage: node tools/smtp-test.mjs <recipient>"); process.exit(1); }

const host = env.SMTP_HOST || "smtp.hostinger.com";
const port = Number(env.SMTP_PORT || 465);
const user = env.SMTP_USER;
const pass = env.SMTP_PASSWORD;

if (!user || !pass) {
  console.error("SMTP_USER and SMTP_PASSWORD must be in forms/.env.local — see the command in chat");
  process.exit(1);
}
console.log(`host ${host}:${port}   user ${user}   password ${pass.length} chars\n`);

const t = nodemailer.createTransport({
  host, port, secure: port === 465,
  auth: { user, pass },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 25000,
  logger: false,
});

try {
  process.stdout.write("1. connect + login ... ");
  await t.verify();
  console.log("OK");
} catch (e) {
  console.log("FAILED");
  console.error(`   ${e.code ?? ""} ${e.message}`);
  console.error("\n   535 = wrong password · ETIMEDOUT = port blocked · ENOTFOUND = wrong host");
  process.exit(2);
}

try {
  process.stdout.write("2. send a real message ... ");
  const info = await t.sendMail({
    from: env.SMTP_FROM || `MRC Landmarks <${user}>`,
    to,
    replyTo: env.SALES_LEAD_EMAIL || undefined,
    subject: "MRC Landmarks — SMTP delivery test",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px">
      <p style="font-size:16px;font-weight:bold;color:#1A2A2D">SMTP delivery test</p>
      <p style="font-size:14px;line-height:1.6;color:#4A5450">
        If this is in your inbox, MRC Landmarks can send email through its own
        Hostinger mailboxes rather than Resend — which means no daily cap for
        the launch event.</p>
      <p style="font-size:13px;color:#8A8D82">Sent ${new Date().toISOString()} from ${host}</p>
    </div>`,
    text: `SMTP delivery test. Sent ${new Date().toISOString()} from ${host}.`,
  });
  console.log("ACCEPTED");
  console.log(`   id       ${info.messageId}`);
  console.log(`   accepted ${info.accepted.join(", ") || "(none)"}`);
  if (info.rejected?.length) console.log(`   REJECTED ${info.rejected.join(", ")}`);
  console.log(`   server   ${info.response}`);
  console.log("\n   Now check the inbox — and the spam folder. Accepted is not delivered.");
} catch (e) {
  console.log("FAILED");
  console.error(`   ${e.code ?? ""} ${e.message}`);
  process.exit(3);
} finally {
  t.close();
}
