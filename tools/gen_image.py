#!/usr/bin/env python3
"""Generate or edit a site image through OpenRouter.

    export OPENROUTER_API_KEY=...            # never commit it
    python3 tools/gen_image.py out.jpg "a prompt"                 # text -> image
    python3 tools/gen_image.py out.jpg "a prompt" source.jpg      # edit an image

Writes the returned image to `out` and prints its size. Image-capable models are
listed by the /models endpoint with "image" in architecture.output_modalities.
"""
import base64
import json
import mimetypes
import os
import sys
import urllib.request

MODEL = os.environ.get("IMAGE_MODEL", "google/gemini-3-pro-image")
URL = "https://openrouter.ai/api/v1/chat/completions"


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def generate(prompt, source=None):
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        sys.exit("OPENROUTER_API_KEY is not set")

    content = [{"type": "text", "text": prompt}]
    if source:
        content.append({"type": "image_url", "image_url": {"url": data_uri(source)}})

    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": content}],
        "modalities": ["image", "text"],
    }).encode()

    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mrclandmarks.com",
        "X-Title": "MRC Landmarks",
    })
    with urllib.request.urlopen(req, timeout=300) as r:
        payload = json.load(r)

    msg = payload["choices"][0]["message"]
    images = msg.get("images") or []
    if not images:
        sys.exit("no image returned: " + json.dumps(msg)[:400])
    url = images[0]["image_url"]["url"]
    return base64.b64decode(url.split(",", 1)[1])


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out, prompt = sys.argv[1], sys.argv[2]
    src = sys.argv[3] if len(sys.argv) > 3 else None
    with open(out, "wb") as f:
        f.write(generate(prompt, src))
    print("wrote", out, os.path.getsize(out), "bytes")
