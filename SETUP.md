# MRC event registration — setup

Two things to do: connect Google Sheets, then deploy. ~20 minutes.

## 1. Google Sheets (10 min)

1. Create a new Google Sheet. Copy its ID from the URL:
   `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
2. Go to [console.cloud.google.com](https://console.cloud.google.com) → new project.
3. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
4. **APIs & Services → Credentials → Create Credentials → Service account**.
   Name it anything, skip the optional steps.
5. Open the service account → **Keys → Add key → Create new key → JSON**. It downloads.
6. Open the JSON. You need two values: `client_email` and `private_key`.
7. Back in your Google Sheet: **Share** → paste the `client_email` → give it **Editor**.
   This step is the one people forget. Without it every write returns 403.

## 2. Environment variables

Copy `.env.example` to `.env.local` (local) or paste into Vercel → Settings → Environment Variables:

```
GOOGLE_SHEET_ID=<from step 1>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from the JSON>
GOOGLE_PRIVATE_KEY="<private_key from the JSON, keep the quotes and the \n>"
SETUP_TOKEN=<any random string you invent>
```

## 3. Create the sheet tabs

Once deployed (or running locally), call the setup endpoint once:

```bash
curl -X POST "https://YOUR_URL/api/setup?token=YOUR_SETUP_TOKEN"
```

This creates the `Registrations` and `CP_Programme` tabs with headers that match
the code exactly. It is idempotent — re-run it any time you add a field to
`lib/schema.ts`. It never deletes data.

## 4. Event day

- **QR code**: generate one pointing at `https://YOUR_URL/register` and print it
  large for the venue. Any free QR generator works.
- **Registration desk**: use `https://YOUR_URL/register?source=onsite` so walk-in
  registrations are tagged separately from pre-event ones in the sheet.
- **Volunteers**: they only need the URL on a phone. Nothing to install.

## Unique IDs

Format is `MRC-CP-001`, assigned in registration order. The ID comes from the row
number Google Sheets allocates on append, so two people registering at the exact
same moment can never collide — there is no counter to race.

The ID is the join key. `CP_Programme` rows carry the same `unique_id`, so a
VLOOKUP on column A stitches every form together.

## Adding the next forms

Add a field array to `lib/schema.ts`, add its columns constant, add a tab name to
`SHEETS`, then copy `app/api/cp/route.ts` as a starting point. Re-run `/api/setup`.

## Adding WhatsApp later

Everything the brokers see works without it. When Meta approves the WhatsApp
Business API for MRC, the only new code is one `sendWhatsApp()` call in
`app/api/register/route.ts` after the ID is assigned. Nothing else changes.
