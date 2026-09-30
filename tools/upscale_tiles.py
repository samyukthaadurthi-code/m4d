#!/usr/bin/env python3
"""Raise an image's resolution by re-rendering it a quadrant at a time.

The image models cap at about 1376px wide however you ask, so a hero that has to
survive a Retina screen can't come out of one call. This cuts the picture into
four overlapping quadrants, sends each back through the model asking only for
more detail, and cross-fades the returned tiles across their overlap so no seam
shows.

    export OPENROUTER_API_KEY=...
    python3 tools/upscale_tiles.py source.jpg out.jpg
"""
import os
import sys

from PIL import Image, ImageChops

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_image  # noqa: E402

TILE = 0.55             # each tile covers 55% of each axis, so neighbours share 10%
PROMPT = (
    "Reproduce this image exactly as it is. Same composition, same framing, same "
    "content, same colours, same teal-and-sage duotone with warm cream and gold "
    "highlights. Do not add, remove, move or reinterpret anything. Change one "
    "thing only: render it at higher resolution with finer, sharper detail — "
    "crisper stone carving, sharper foliage and palm fronds, cleaner edges on "
    "roads, kerbs, rooftops and railings, more defined texture in water, dust and "
    "haze. Photorealistic. No text, no logos, no watermarks."
)


def ramp(width, height, horizontal):
    """Linear 0->255 alpha ramp along one axis, used to cross-fade a seam."""
    n = width if horizontal else height
    line = Image.new("L", (n, 1))
    line.putdata([round(255 * i / max(n - 1, 1)) for i in range(n)])
    if not horizontal:
        line = line.rotate(90, expand=True)
    return line.resize((width, height))


def blend_mask(size, ox, oy, fade_left, fade_top):
    """Opaque everywhere except the edges that overlap an already-pasted tile."""
    w, h = size
    mask = Image.new("L", size, 255)
    if fade_left and ox > 0:
        mask.paste(ramp(ox, h, True), (0, 0))
    if fade_top and oy > 0:
        band = ramp(w, oy, False)
        mask.paste(ImageChops.multiply(mask.crop((0, 0, w, oy)), band), (0, 0))
    return mask


def main(src_path, out_path):
    src = Image.open(src_path).convert("RGB")
    W, H = src.size
    tw, th = round(W * TILE), round(H * TILE)
    xs, ys = [0, W - tw], [0, H - th]

    tiles = {}
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            crop = src.crop((x, y, x + tw, y + th))
            tmp = f"/tmp/_tile_{i}{j}.jpg"
            crop.save(tmp, quality=96)
            print(f"tile {i}{j} {crop.size} -> model", flush=True)
            data = gen_image.generate(PROMPT, tmp)
            hi = f"/tmp/_tile_{i}{j}_hi.jpg"
            with open(hi, "wb") as f:
                f.write(data)
            tiles[(i, j)] = Image.open(hi).convert("RGB")
            print(f"   got {tiles[(i, j)].size}", flush=True)

    TW, TH = tiles[(0, 0)].size
    tiles = {k: (v if v.size == (TW, TH) else v.resize((TW, TH), Image.LANCZOS))
             for k, v in tiles.items()}

    sx, sy = TW / tw, TH / th
    canvas = Image.new("RGB", (round(W * sx), round(H * sy)))
    ox, oy = round((tw - (W - tw)) * sx), round((th - (H - th)) * sy)

    for (i, j) in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        t = tiles[(i, j)]
        pos = (round(xs[i] * sx), round(ys[j] * sy))
        if (i, j) == (0, 0):
            canvas.paste(t, pos)
        else:
            canvas.paste(t, pos, blend_mask((TW, TH), ox, oy, i == 1, j == 1))

    canvas.save(out_path, quality=92, optimize=True, progressive=True)
    print("wrote", out_path, canvas.size, os.path.getsize(out_path), "bytes")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
