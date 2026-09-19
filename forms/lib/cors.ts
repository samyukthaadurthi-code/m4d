import { NextResponse } from "next/server";

// The website is a different origin, so its forms need CORS to post here.
const ORIGINS = new Set([
  "https://mrc-1-one.vercel.app",
  "https://mrc-landmarks.vercel.app",
  "https://forms.mrclandmarks.com",
  "https://mrclandmarks.com",
  "https://www.mrclandmarks.com",
  "http://localhost:8899",
]);

export function cors(req: Request, res: NextResponse) {
  const origin = req.headers.get("origin") ?? "";
  if (ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export const preflight = (req: Request) => cors(req, new NextResponse(null, { status: 204 }));

export const tenDigits = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  const ten = d.length > 10 ? d.slice(-10) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : "";
};
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
