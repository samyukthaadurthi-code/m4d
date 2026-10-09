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

/**
 * The badge goes as a link, not an image.
 *
 * Every image-header variant of this was rejected INCORRECT_CATEGORY, under
 * UTILITY and MARKETING alike: the badge art reads "CHANNEL PARTNER LAUNCH
 * EVENT" and the wording ("entry badge", "show it at the desk when you
 * arrive") classifies as event promotion. Phrased as delivery of a
 * registration record it passes review, and the page it links to shows the
 * same badge with a save button. The image itself still goes out by email.
 */
export function sendRegistrationRecord(
  to: string,
  fullName: string,
  uniqueId: string,
  badgePage: string,
) {
  return safeSend(
    `registration record ${uniqueId}`,
    template(to, "cp_registration_record", [body(fullName, uniqueId, badgePage)]),
  );
}

export function sendCpReceived(to: string, fullName: string, uniqueId: string) {
  return safeSend(
    "cp application received",
    template(to, "cp_application_received", [body(fullName, uniqueId)]),
  );
}

export function sendCpApproved(to: string, fullName: string, uniqueId: string) {
  return safeSend(
    "cp approved",
    template(to, "cp_approved", [body(fullName, uniqueId)]),
  );
}

/** Shared by the pop-up, the side tab and the chat widget — same promise, same words. */
export function sendEnquiryAck(to: string, fullName: string, about: string) {
  return safeSend(
    "enquiry ack",
    template(to, "enquiry_ack", [body(fullName, about)]),
  );
}

export function sendForumWaitlist(to: string, fullName: string) {
  return safeSend(
    "forum waitlist",
    template(to, "forum_waitlist", [body(fullName)]),
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

/**
 * Free-form reply. Only legal inside the 24-hour window that opens when the
 * customer messages us first — which is exactly when the webhook fires, so the
 * assistant can answer in plain text with no template.
 */
export function sendText(to: string, body: string) {
  return safeSend("assistant reply", {
    to: toWa(to),
    type: "text",
    text: { preview_url: true, body: body.slice(0, 4000) },
  });
}

/** A tappable list of canned questions. Tapping one sends its title back as a message. */
export function sendList(
  to: string,
  bodyText: string,
  buttonText: string,
  rows: { id: string; title: string; description?: string }[],
) {
  return safeSend("faq list", {
    to: toWa(to),
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText.slice(0, 1024) },
      action: {
        button: buttonText.slice(0, 20),
        sections: [{ title: "Common questions", rows: rows.slice(0, 10).map((r) => ({
          id: r.id,
          title: r.title.slice(0, 24),
          ...(r.description ? { description: r.description.slice(0, 72) } : {}),
        })) }],
      },
    },
  });
}

/** A single button that opens a URL — our "form" inside the chat. */
export async function sendCtaUrl(to: string, bodyText: string, buttonText: string, url: string) {
  const res = await safeSend("cta url", {
    to: toWa(to),
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: bodyText.slice(0, 1024) },
      action: { name: "cta_url", parameters: { display_text: buttonText.slice(0, 20), url } },
    },
  });
  // Older API versions reject cta_url; a plain link still gets the job done.
  if (!res.sent) return sendText(to, `${bodyText}\n\n${url}`);
  return res;
}
