#!/usr/bin/env python3
"""Create MRC's four WhatsApp message templates through the API.

The names, the parameter order and the language code all have to match what
forms/lib/whatsapp.ts sends, or the send fails at runtime rather than here.

    export WHATSAPP_TOKEN=...
    python3 tools/create_templates.py [--dry]
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


def templates(handle):
    return [
        {
            "name": "cp_badge_delivery",
            "category": "UTILITY",
            "language": LANG,
            "components": [
                {"type": "HEADER", "format": "IMAGE", "example": {"header_handle": [handle]}},
                {"type": "BODY",
                 "text": "Hello {{1}}, your registration with MRC Landmarks is confirmed. Your entry badge is "
                         "attached above and your unique ID is {{2}}. Please show it at the desk when you arrive.",
                 "example": {"body_text": [["Rajesh Kumar", "MRC-CP-008"]]}},
                {"type": "FOOTER", "text": FOOTER},
            ],
        },
        {
            "name": "cp_form_link",
            "category": "UTILITY",
            "language": LANG,
            "components": [
                {"type": "BODY",
                 "text": "Hello {{1}}, your registration is confirmed. To complete your MRC Landmarks "
                         "channel partner application, please fill in your details at {{2}} — it takes two minutes.",
                 "example": {"body_text": [["Rajesh Kumar", "https://forms.mrclandmarks.com/cp/MRC-CP-008"]]}},
                {"type": "FOOTER", "text": FOOTER},
            ],
        },
        {
            "name": "site_visit_confirmation",
            "category": "UTILITY",
            "language": LANG,
            "components": [
                {"type": "BODY",
                 "text": "Hello {{1}}, your site visit to MRC ANANTAA at Othakadai, Madurai is confirmed. "
                         "Requirement: {{2}}. Budget: {{3}}. Preferred date: {{4}}. Our team will meet you "
                         "at the entrance and walk you through the layout.",
                 "example": {"body_text": [["Rajesh Kumar", "Residential plot", "25-30 lakhs", "12 October 2026"]]}},
                {"type": "FOOTER", "text": FOOTER},
            ],
        },
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
    sample = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mrc-logo.svg")
    sample = os.environ.get("SAMPLE_IMAGE", os.path.normpath(sample))

    up = upload_sample(sample, token)
    if "error" in up or "h" not in up:
        sys.exit("sample upload failed: " + json.dumps(up)[:400])
    print("sample image handle ok")

    for t in templates(up["h"]):
        if "--dry" in sys.argv:
            print("would create", t["name"])
            continue
        res = call(f"{WABA}/message_templates", t, token=token)
        print(f"{t['name']:26} {json.dumps(res)[:220]}")


if __name__ == "__main__":
    main()
