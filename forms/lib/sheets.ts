import { JWT } from "google-auth-library";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const API = "https://sheets.googleapis.com/v4/spreadsheets";

export function sheetsConfigured() {
  return Boolean(
    SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

async function token() {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Vercel stores the key with literal \n — restore real newlines.
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const { access_token } = await jwt.authorize();
  if (!access_token) throw new Error("Google auth returned no access token");
  return access_token;
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/${SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Sheets ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

/**
 * Appends a row and returns the 1-based row number Sheets assigned it.
 *
 * The row number is the atomicity trick: Sheets allocates it server-side, so
 * two simultaneous registrations can never receive the same number — no counter
 * cell, no lock, no read-modify-write race.
 */
export async function appendRow(sheet: string, values: string[]): Promise<number> {
  const data = await call(
    `/values/${encodeURIComponent(sheet)}!A:A:append` +
      `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [values] }) },
  );
  // updatedRange looks like "Registrations!A47:N47"
  const match = /![A-Z]+(\d+)(?::|$)/.exec(data?.updates?.updatedRange ?? "");
  if (!match) throw new Error("Could not read row number from Sheets response");
  return Number(match[1]);
}

/** Overwrites a single cell, e.g. writing the unique ID back into column A. */
export async function setCell(sheet: string, cell: string, value: string) {
  await call(
    `/values/${encodeURIComponent(`${sheet}!${cell}`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [[value]] }) },
  );
}

async function allRows(sheet: string): Promise<string[][]> {
  const data = await call(`/values/${encodeURIComponent(sheet)}`);
  return (data.values ?? []) as string[][];
}

/**
 * Looks a row up by unique ID (column A) and returns it keyed by header name,
 * so reordering columns in the sheet cannot silently break reads.
 *
 * ponytail: full-sheet scan. Fine at a few thousand rows; move to a real
 * datastore if this ever backs more than event registration.
 */
async function findRow(
  sheet: string,
  match: (row: string[], header: string[]) => boolean,
): Promise<Record<string, string> | null> {
  const rows = await allRows(sheet);
  if (rows.length < 2) return null;
  const [header, ...body] = rows;
  const row = body.find((r) => match(r, header));
  return row
    ? Object.fromEntries(header.map((h, i) => [h, row[i] ?? ""]))
    : null;
}

export function findBy(sheet: string, column: string, value: string) {
  const wanted = value.trim();
  return findRow(sheet, (row, header) => {
    const col = header.indexOf(column);
    return col !== -1 && (row[col] ?? "").trim() === wanted;
  });
}

/** 1-based sheet row number of the first row whose column matches, or null. */
export async function findRowNumber(sheet: string, column: string, value: string) {
  const rows = await allRows(sheet);
  const col = rows[0]?.indexOf(column) ?? -1;
  if (col === -1) return null;
  const i = rows.findIndex((r, n) => n > 0 && (r[col] ?? "").trim() === value.trim());
  return i === -1 ? null : i + 1;
}

/** Column A holds the unique ID on every sheet. */
export function findById(sheet: string, id: string) {
  const wanted = id.trim();
  return findRow(sheet, (row) => (row[0] ?? "").trim() === wanted);
}

/**
 * The ID for a freshly appended row, guaranteed not to be in use already.
 *
 * The row number alone used to be the ID, on the reasoning that Sheets hands it
 * out server-side so two simultaneous registrations can never collide. True —
 * but only while rows are append-only. Delete or blank a row and every row
 * below it shifts up, so a record keeps an ID its new row number no longer
 * implies, and the next append is issued a number somebody already holds. That
 * happened: two people ended up as MRC-CP-009 and the badge page served the
 * wrong one.
 *
 * So the row number is now only a starting point. We read the IDs actually in
 * the sheet and step past any that are taken. Concurrent appends still get
 * different row numbers, so they still start from different candidates.
 */
export async function mintId(sheet: string, prefix: string, row: number) {
  const rows = await allRows(sheet);
  const taken = new Set(
    rows.slice(1).map((r) => (r[0] ?? "").trim().replace(/^VOID-/, "")).filter(Boolean),
  );
  let n = Math.max(row - 1, 1);
  const at = (i: number) => `${prefix}${String(i).padStart(3, "0")}`;
  while (taken.has(at(n))) n += 1;
  return at(n);
}

/** Creates the tab if missing and writes the header row. Idempotent, never deletes. */
export async function ensureSheet(sheet: string, columns: string[]) {
  const meta = await call("");
  const exists = meta.sheets?.some(
    (s: { properties?: { title?: string } }) => s.properties?.title === sheet,
  );
  if (!exists) {
    await call(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheet } } }],
      }),
    });
  }
  await call(
    `/values/${encodeURIComponent(`${sheet}!A1`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [columns] }) },
  );
}
