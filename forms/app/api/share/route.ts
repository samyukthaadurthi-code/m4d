import { NextResponse } from "next/server";
import { JWT } from "google-auth-library";

export const runtime = "nodejs";

/**
 * One-off admin call: share the data sheet with a person, or list who has it.
 * Guarded by SETUP_TOKEN like /api/setup. The service account owns the access
 * grant, so this works even when nobody remembers which Google account created
 * the sheet.
 *   GET  /api/share?token=…              → owner + current collaborators
 *   POST /api/share?token=…&email=…     → grant editor (role=reader for view-only)
 */
async function driveToken() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const { access_token } = await jwt.authorize();
  if (!access_token) throw new Error("Google auth returned no access token");
  return access_token;
}

function guard(req: Request) {
  const expected = process.env.SETUP_TOKEN;
  const token = new URL(req.url).searchParams.get("token");
  if (!expected || token !== expected) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

const FILE = () => `https://www.googleapis.com/drive/v3/files/${process.env.GOOGLE_SHEET_ID}`;

export async function GET(req: Request) {
  const no = guard(req); if (no) return no;
  const r = await fetch(`${FILE()}?fields=name,owners(emailAddress),permissions(emailAddress,role,type),webViewLink&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${await driveToken()}` } });
  return NextResponse.json(await r.json(), { status: r.status });
}

export async function POST(req: Request) {
  const no = guard(req); if (no) return no;
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim();
  const role = url.searchParams.get("role") === "reader" ? "reader" : "writer";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "email required" }, { status: 400 });
  const r = await fetch(`${FILE()}/permissions?sendNotificationEmail=true&supportsAllDrives=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await driveToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user", role, emailAddress: email }),
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
