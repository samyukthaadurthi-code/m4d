const API = "https://graph.facebook.com/v21.0";

export function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN,
  );
}

/** Forms normalise to 10 digits; Meta wants country code, no plus, no spaces. */
const toWa = (tenDigit: string) => `91${tenDigit.replace(/\D/g, "").slice(-10)}`;

async function post(payload: Record<string, unknown>) {
  const res = await fetch(
    `${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    },
  );
  if (!res.ok) {
    throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Never let a messaging failure fail the request that triggered it.
 *
 * A broker who registered but didn't get their WhatsApp still has the badge on
 * screen and in the sheet. A broker whose registration was rolled back because
 * Meta timed out has nothing. Log and move on.
 */
async function safeSend(label: string, payload: Record<string, unknown>) {
  if (!whatsappConfigured()) {
    console.warn(`[whatsapp] ${label} skipped — not configured`);
    return { sent: false, reason: "not-configured" as const };
  }
  try {
    await post(payload);
    return { sent: true as const };
  } catch (err) {
    console.error(`[whatsapp] ${label} failed:`, err);
    return { sent: false, reason: "error" as const };
  }
}

const template = (
  to: string,
  name: string,
  components: unknown[],
  lang = "en",
) => ({
  to: toWa(to),
  type: "template",
  template: { name, language: { code: lang }, components },
});

const body = (...values: string[]) => ({
  type: "body",
  parameters: values.map((text) => ({ type: "text", text })),
});

/** Badge image as the template header. Meta fetches badgeUrl, so it must be public. */
export function sendBadge(
  to: string,
  fullName: string,
  uniqueId: string,
  badgeUrl: string,
) {
  return safeSend(
    `badge ${uniqueId}`,
    template(to, "cp_badge_delivery", [
      {
        type: "header",
        parameters: [{ type: "image", image: { link: badgeUrl } }],
      },
      body(fullName, uniqueId),
    ]),
  );
}

export function sendCpFormLink(to: string, fullName: string, link: string) {
  return safeSend(
    "cp form link",
    template(to, "cp_form_link", [body(fullName, link)]),
  );
}

export function sendVisitConfirmation(
  to: string,
  visitorName: string,
  requirement: string,
  budget: string,
  preferredDate: string,
) {
  return safeSend(
    "visit confirmation",
    template(to, "site_visit_confirmation", [
      body(visitorName, requirement, budget, preferredDate),
    ]),
  );
}

/** Internal alert to the MRC sales lead when a site-visit lead arrives. */
export function sendLeadAlert(to: string, summary: string) {
  return safeSend("lead alert", template(to, "lead_alert", [body(summary)]));
}
