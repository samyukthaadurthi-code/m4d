import { readFileSync } from "fs";
import { join } from "path";

let cached: string | null = null;

/**
 * The badge is rendered server-side by next/og, which cannot fetch a relative
 * path — so the logo is inlined as a data URI. Read once, kept for the process.
 */
export function logoDataUri(): string {
  if (!cached) {
    const buf = readFileSync(join(process.cwd(), "public", "mrc-logo-white.svg"));
    cached = `data:image/svg+xml;base64,${buf.toString("base64")}`;
  }
  return cached;
}
