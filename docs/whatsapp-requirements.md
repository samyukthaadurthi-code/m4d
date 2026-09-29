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
   - A **personal Facebook profile** is required to create and administer it —
     Meta has no way to make a Business Manager without one. Use a real,
     existing profile belonging to a director or the marketing person; a
     brand-new profile made the same day often gets flagged in review.
   - That personal profile is only the key to the door. It is never shown to
     customers and is not the WhatsApp sender.
   - A **Facebook Page** for MRC Landmarks is not strictly required by the API,
     but create one anyway: it helps business verification pass and is needed
     the day MRC wants Meta/Instagram ads.
   - If a director already has a personal Facebook account, that is enough —
     nothing new has to be bought.
2. **Business verification** (Meta reviews MRC as a real company). Needs:
   - Legal business name exactly as registered
   - GST certificate / incorporation certificate / shop & establishment licence
   - Business address proof (utility bill or bank statement in the company name)
   - Business phone number and website (mrclandmarks.com — already live)
   - **Takes days to a few weeks. Start this first — everything else waits on it.**
3. **A dedicated phone number** for WhatsApp Business API.
   - A number lives on exactly one WhatsApp surface at a time: the normal app,
     the Business app, or the API. Never two.
   - +91 89259 72469 **can** be moved to the API — delete the WhatsApp account
     on that number (Settings → Account → Delete my account), then register it
     on the API with an OTP. Deleting erases that number's chat history and
     groups; nothing is carried over.
   - **But do not do it.** The API has no phone app. The moment 89259 72469
     becomes an API number, every WhatsApp message customers send to it stops
     appearing on anyone's phone — it only arrives at the API, which needs a
     separate shared-inbox tool for a human to read and reply. Every page of
     mrclandmarks.com and the chat assistant send visitors to that number to
     talk to a person.
   - **Recommendation: buy a second SIM (~₹200 prepaid) for the API.**
     89259 72469 stays on the phone for humans; the new number only sends the
     automated messages. Cheapest and changes nothing that works today.
   - Whichever number is used, it must receive one OTP at setup (SMS or voice
     call — a landline works). Keep the SIM active for re-verification later.
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
