#!/usr/bin/env python3
"""Create MRC's WhatsApp message templates through the API.

The names, the parameter order and the language code all have to match what
forms/lib/whatsapp.ts sends, or the send fails at runtime rather than here.
Templates that already exist are skipped, so this is safe to re-run.

    export WHATSAPP_TOKEN=...
    python3 tools/create_templates.py [--dry]

Two rules Meta enforces that are easy to trip over:
  * a body may not start or end with {{n}} — "Leading or trailing params not
    allowed";
  * anything that reads like promotion is bounced back as INCORRECT_CATEGORY,
    so every body here is phrased as a response to something the person did.

A template name stays reserved for a while after deletion ("being deleted"),
which is why the badge is `_v2` — the original name is unusable.
"""
import json
import mimetypes
import os
import sys
import urllib.request

API = "https://graph.facebook.com/v21.0"
WABA = "1619372023218910"
APP = "2907070423002397"
LANG = "en"                      # lib/whatsapp.ts sends language code "en", not en_US
FOOTER = "MRC Landmarks, Madurai"


def call(path, payload=None, method=None, token=None, headers=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(f"{API}/{path}", data=data, method=method or ("POST" if data else "GET"))
    req.add_header("Authorization", f"Bearer {token}")
    if data:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"error": json.loads(e.read().decode() or "{}")}


def upload_sample(path, token):
    """Meta wants a real image behind an image header's example; this returns its handle."""
    size = os.path.getsize(path)
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    start = call(f"{APP}/uploads?file_length={size}&file_type={mime}", payload=None, method="POST", token=token)
    if "error" in start:
        return start
    session = start["id"]

    req = urllib.request.Request(f"{API}/{session}", data=open(path, "rb").read(), method="POST")
    req.add_header("Authorization", f"OAuth {token}")
    req.add_header("file_offset", "0")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"error": json.loads(e.read().decode() or "{}")}


def text_template(name, text, example, footer=True):
    components = [{"type": "BODY", "text": text, "example": {"body_text": [example]}}]
    if footer:
        components.append({"type": "FOOTER", "text": FOOTER})
    return {"name": name, "category": "UTILITY", "language": LANG, "components": components}


def templates(handle):
    return [
        # --- registration -------------------------------------------------
        # The badge goes as a link, not an image header. An IMAGE header whose
        # sample is the real badge is bounced INCORRECT_CATEGORY every time —
        # the badge reads "CHANNEL PARTNER LAUNCH EVENT", which the classifier
        # treats as promotion. A link keeps it UTILITY, and the page it opens
        # shows the same badge with a save button.
        text_template(
            "cp_badge_ready",
            "Hello {{1}}, your registration with MRC Landmarks is confirmed and your unique ID is {{2}}. "
            "You can open and save your entry badge here: {{3}} — please show it at the desk when you arrive.",
            ["Rajesh Kumar", "MRC-CP-008", "https://forms.mrclandmarks.com/badge/MRC-CP-008"],
        ),
        text_template(
            "cp_form_link",
            "Hello {{1}}, your registration is confirmed. To complete your MRC Landmarks channel partner "
            "application, please fill in your details at {{2}} — it takes two minutes.",
            ["Rajesh Kumar", "https://forms.mrclandmarks.com/cp/MRC-CP-008"],
        ),

        # --- channel partner programme ------------------------------------
        text_template(
            "cp_application_received",
            "Hello {{1}}, we have received your MRC Landmarks channel partner application {{2}}. "
            "Our partnerships team will review it and come back to you shortly.",
            ["Rajesh Kumar", "MRC-CP-008"],
        ),
        text_template(
            "cp_approved",
            "Hello {{1}}, your MRC Landmarks channel partner application {{2}} has been approved. You can now "
            "sign in to the partner resource centre for your kit, layout and plot details.",
            ["Rajesh Kumar", "MRC-CP-008"],
        ),

        # --- site visit ----------------------------------------------------
        text_template(
            "site_visit_confirmation",
            "Hello {{1}}, your site visit to MRC ANANTAA at Othakadai, Madurai is confirmed. Requirement: {{2}}. "
            "Budget: {{3}}. Preferred date: {{4}}. Our team will meet you at the entrance and walk you through "
            "the layout.",
            ["Rajesh Kumar", "Residential plot", "25-30 lakhs", "12 October 2026"],
        ),

        # --- enquiries (one template serves pop-up, side tab and chat) -----
        text_template(
            "enquiry_ack",
            "Hello {{1}}, thank you for your enquiry with MRC Landmarks about {{2}}. We have your details and "
            "someone from our team will call you shortly.",
            ["Rajesh Kumar", "ANANTAA, Othakadai"],
        ),

        # --- forum waitlist -------------------------------------------------
        text_template(
            "forum_waitlist",
            "Hello {{1}}, your request for early access to the MRC Forum has been received. We will let you know "
            "on this number as soon as it opens.",
            ["Rajesh Kumar"],
        ),

        # --- internal alert to the sales desk -------------------------------
        {
            "name": "lead_alert",
            "category": "UTILITY",
            "language": LANG,
            "components": [
                {"type": "BODY",
                 "text": "New enquiry received at MRC Landmarks. {{1}} Please follow up with this lead.",
                 "example": {"body_text": [["SV-006, Rajesh Kumar, 95144 39555, residential plot, 25-30 lakhs"]]}},
            ],
        },
    ]


def main():
    token = os.environ.get("WHATSAPP_TOKEN")
    if not token:
        sys.exit("WHATSAPP_TOKEN is not set")

    existing = {t["name"] for t in call(f"{WABA}/message_templates?limit=100", token=token).get("data", [])}
    print("already at Meta:", ", ".join(sorted(existing)) or "(none)", "\n")

    sample = os.environ.get("SAMPLE_IMAGE")
    handle = None
    wanted = [t for t in templates("") if t["name"] not in existing]
    if any(c.get("format") == "IMAGE" for t in wanted for c in t["components"]):
        if not sample:
            sys.exit("SAMPLE_IMAGE=<path to a png/jpg> is needed for the badge template")
        up = upload_sample(sample, token)
        if "error" in up or "h" not in up:
            sys.exit("sample upload failed: " + json.dumps(up)[:400])
        handle = up["h"]
        print("sample image uploaded\n")

    for t in templates(handle or ""):
        if t["name"] in existing:
            print(f"{t['name']:26} skip (exists)")
            continue
        if "--dry" in sys.argv:
            print(f"{t['name']:26} would create")
            continue
        res = call(f"{WABA}/message_templates", t, token=token)
        print(f"{t['name']:26} {json.dumps(res)[:200]}")


if __name__ == "__main__":
    main()
