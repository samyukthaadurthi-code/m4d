# WhatsApp Cloud API — going direct through Meta

No BSP, no reseller. Free API, pay Meta per conversation.

Meta moves this UI around. If a screen doesn't match, follow what's on screen — the
sequence below is what matters, not the button labels.

## Before you start

- A Facebook account to administer the Business Manager (personal is fine — it's the admin, not the brand)
- **A phone number that is NOT currently on WhatsApp or WhatsApp Business.** If it is, that account must be deleted first, which wipes its chat history. Use a fresh SIM.
- Documents in the exact legal entity name: certificate of incorporation, GST certificate, and a utility bill or bank statement
- A credit card

---

## 1. Business Manager — 15 min

[business.facebook.com](https://business.facebook.com) → create a business portfolio.

Legal business name, admin name, business email. **The legal name here must match
the documents exactly** — a mismatch between "MRC Landmarks" and "MRC Landmarks
Private Limited" is the single most common verification rejection.

## 2. Create the Meta app — 10 min

[developers.facebook.com](https://developers.facebook.com) → My Apps → Create App.

- App type: **Business**
- Link it to the business portfolio from step 1
- Add the **WhatsApp** product to the app

Meta auto-creates a test WhatsApp Business Account and a test number. The test
number messages up to 5 numbers you nominate — enough to build and verify the whole
flow before the real number exists.

## 3. Add the real phone number — 20 min

WhatsApp → API Setup → Add phone number.

You'll set a **display name** — what recipients actually see. This gets reviewed
separately from business verification and must relate to the real business.
"MRC Landmarks" is fine.

Verify by SMS or voice call.

## 4. Business verification — 1–3 days, the only real wait

Business Manager → Settings → Business Info → **Start Verification**.

Upload the documents. Legal name, registered address and phone must match across
every document and match what you typed in step 1.

**This is what raises the sending limit from 250 to 1,000 unique recipients per
24 hours.** With 400 brokers, the event does not work without it. Everything else
in this file takes an afternoon; this is the piece with a queue.

## 5. Message templates — minutes to hours

WhatsApp Manager → Message Templates → Create.

Every message we start needs one. Four to write:

| Template | Category | Header |
|---|---|---|
| `cp_badge_delivery` | Utility | Image |
| `cp_form_link` | Utility | None |
| `site_visit_confirmation` | Utility | None |
| `event_followup` | Marketing | None |

File as **Utility** wherever defensible — it approves more easily, costs less per
message, and carries lighter opt-out obligations than Marketing. The badge is
genuinely transactional (they registered, this is the credential they asked for),
so Utility is honest here, not a loophole.

Draft body for `cp_badge_delivery`:

```
Welcome to the MRC Landmarks channel partner network, {{1}}.

Your partner ID is {{2}}. Show this badge at the MRC desk.

Keep this message — you will need your ID for site visits and to open the
partner resource centre.
```

Submit templates in parallel with verification. They do not depend on it.

## 6. Permanent access token — 15 min, and easy to miss

The token shown on the API Setup screen **expires in 24 hours**. An integration
built on it dies overnight. You need a System User token instead:

Business Manager → Settings → Users → **System Users** → Add.

- Give it Admin access to the app
- Assign the WhatsApp Business Account as an asset
- Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`
- Choose **never expires**

Copy it once — it isn't shown again.

## 7. Payment method — 5 min

WhatsApp Manager → add a credit card to the WhatsApp Business Account. Sending
fails once the free allowance is used and there's no card on file.

## 8. Webhook, for receiving replies — 15 min

App → WhatsApp → Configuration → Webhook. Needs a public HTTPS callback URL, so
the app has to be deployed first. Subscribe to the `messages` field.

Only needed to *receive*. Sending badges works without it.

## 9. Environment variables

```
WHATSAPP_PHONE_NUMBER_ID=      # WhatsApp → API Setup
WHATSAPP_TOKEN=                # the System User token from step 6
WHATSAPP_WEBHOOK_VERIFY_TOKEN= # any random string you invent
```

## 10. Sending the badge

```
POST https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "cp_badge_delivery",
    "language": { "code": "en" },
    "components": [
      {
        "type": "header",
        "parameters": [{
          "type": "image",
          "image": { "link": "https://partners.mrclandmarks.com/api/badge/MRC-CP-001" }
        }]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Rajesh Kumar" },
          { "type": "text", "text": "MRC-CP-001" }
        ]
      }
    ]
  }
}
```

The `to` number is digits only with country code, no `+` and no spaces.

Meta fetches the header image from that URL itself, so the badge route has to be
publicly reachable and reasonably quick. If Meta's fetch proves flaky under load,
upload the image via the Media API first and pass a media `id` instead of a `link`
— more reliable, one extra call.

---

## What actually goes wrong

**Verification rejected on a name mismatch.** Legal name, address and phone must be
byte-identical across Business Manager and every document. Check before submitting;
a resubmission costs days.

**The 24-hour token.** Step 6 exists because everyone ships with the temporary token
and the integration stops overnight.

**The number was already on WhatsApp.** Deleting it there wipes the chat history —
which is why it should never be the sales team's working number.

**Hitting 250/24h before verification clears.** The fallback: send the first 250
automatically, queue the rest to the next day. The on-screen badge and download work
for everyone immediately regardless, so nobody at the event leaves without one.

## Realistic timeline

| Steps | Time |
|---|---|
| 1–3, 5–7 — everything except verification | One afternoon |
| 4 — business verification | 1–3 business days, longer if rejected |

You can build and test the entire flow on the test number today. Only the real
send to 400 people waits on step 4.
