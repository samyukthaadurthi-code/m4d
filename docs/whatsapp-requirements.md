# WhatsApp automation — what we need from MRC

The code is already built and deployed (`forms/lib/whatsapp.ts`). It is switched
off only because the credentials below are missing. Once they are in Vercel, it
turns on with no code change.

What it will send automatically:

| Trigger | Message | To |
|---|---|---|
| Broker registers for the launch event | Badge image + name + unique ID | The broker |
| Broker registration | Channel-partner form link | The broker |
| Site visit booked | Visit confirmation (name, requirement, budget, date) | The visitor |
| Site visit / website enquiry | Lead alert summary | MRC sales number |

---

## A. Meta / WhatsApp Business account (MRC does this — has lead time)

1. **Facebook Business Manager account** for MRC Landmarks
   — https://business.facebook.com. Needs a business admin login.
2. **Business verification** (Meta reviews MRC as a real company). Needs:
   - Legal business name exactly as registered
   - GST certificate / incorporation certificate / shop & establishment licence
   - Business address proof (utility bill or bank statement in the company name)
   - Business phone number and website (mrclandmarks.com — already live)
   - **Takes days to a few weeks. Start this first — everything else waits on it.**
3. **A dedicated phone number** for WhatsApp Business API.
   - It must NOT be in use on the normal WhatsApp or WhatsApp Business app.
   - If MRC wants to keep using +91 89259 72469 on the phone, buy a second SIM
     for the API.
   - Must be able to receive an OTP once, at setup.
4. **Display name** for the sender (e.g. "MRC Landmarks") — Meta approves it.
5. **Payment method on the Meta account** (card). WhatsApp charges per
   conversation; there is a free tier of service conversations each month.

## B. Message templates (we draft, MRC submits, Meta approves)

Every automated message must be a template approved by Meta in advance. Four are
already coded and must be created with these exact names:

| Template name | Type | Variables |
|---|---|---|
| `cp_badge_delivery` | Marketing/Utility, image header | name, unique ID |
| `cp_form_link` | Utility | name, link |
| `site_visit_confirmation` | Utility | name, requirement, budget, date |
| `lead_alert` | Utility | summary |

Approval is usually a few hours to a day per template.

## C. Credentials to hand over (after A and B)

From **Meta for Developers → the WhatsApp app → API setup**:

| Value | Where it goes |
|---|---|
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| Permanent access token (System User token, never the 24-hour test token) | `WHATSAPP_TOKEN` |
| MRC sales WhatsApp number for lead alerts (10 digits) | `SALES_LEAD_WHATSAPP` |

The permanent token comes from Business Settings → System Users → create a
system user → assign the WhatsApp app → generate token with `whatsapp_business_messaging`
and `whatsapp_business_management` permissions, never expiring.

## D. Our side (no client input needed)

- Set the three variables in the `mrc-forms` Vercel project and redeploy.
- Send one live test of each of the four messages.

---

**Summary of the blocker:** Meta business verification + a spare phone number.
Everything else is ready.
