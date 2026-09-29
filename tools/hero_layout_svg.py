#!/usr/bin/env python3
"""Generate the hero layout overlay: a plotted layout drawn onto the ground plane
of an oblique aerial photo.

The layout is defined in unit space (0..1 across, 0..1 deep) and mapped onto a
quad picked off the photo, so the plots sit on the field in perspective instead
of looking like a flat rectangle pasted on top.

    python3 tools/hero_layout_svg.py > /tmp/overlay.svg
"""
import sys

# photo pixel size — overlay is emitted in these coordinates
W, H = 2400, 1340

# the patch of empty field the layout sits on, in photo pixels:
# far-left, far-right, near-right, near-left  (perspective quad)
QUAD = ((1000, 812), (1885, 798), (1995, 938), (895, 962))

COLS, ROWS = 6, 2          # plot blocks
ROAD = 0.035               # road width in unit space


def at(u, v):
    """Bilinear map of unit (u, v) onto the ground quad."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = QUAD
    top = (x0 + (x1 - x0) * u, y0 + (y1 - y0) * u)
    bot = (x3 + (x2 - x3) * u, y3 + (y2 - y3) * u)
    return (round(top[0] + (bot[0] - top[0]) * v, 1),
            round(top[1] + (bot[1] - top[1]) * v, 1))


def poly(pts):
    return " ".join(f"{x},{y}" for x, y in pts)


def cell(u0, v0, u1, v1):
    return poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)])


def main(out=sys.stdout):
    w = out.write
    w(f'<svg class="layout" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" '
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n')

    # --- plots: drawn block by block, park reserved in the middle ---
    w('<g class="plots">\n')
    i = 0
    park = (2, 0)
    for r in range(ROWS):
        for c in range(COLS):
            if (c, r) == park:
                continue
            u0 = c / COLS + ROAD / 2
            u1 = (c + 1) / COLS - ROAD / 2
            v0 = r / ROWS + ROAD
            v1 = (r + 1) / ROWS - ROAD
            # split each block into 3 plots along the road
            for k in range(3):
                a = u0 + (u1 - u0) * k / 3
                b = u0 + (u1 - u0) * (k + 1) / 3
                w(f'<polygon points="{cell(a + .004, v0, b - .004, v1)}" '
                  f'style="--i:{i}"/>\n')
                i += 1
    w('</g>\n')

    # --- the park ---
    pu, pv = park
    w(f'<polygon class="park" points="'
      f'{cell(pu / COLS + ROAD / 2, pv / ROWS + ROAD, (pu + 1) / COLS - ROAD / 2, (pv + 1) / ROWS - ROAD)}"/>\n')

    # --- roads drawn as strokes down the middle of each gap ---
    w('<g class="roads">\n')
    for c in range(1, COLS):
        u = c / COLS
        w(f'<line x1="{at(u,0)[0]}" y1="{at(u,0)[1]}" x2="{at(u,1)[0]}" y2="{at(u,1)[1]}" style="--i:{c}"/>\n')
    for r in range(1, ROWS):
        v = r / ROWS
        w(f'<line x1="{at(0,v)[0]}" y1="{at(0,v)[1]}" x2="{at(1,v)[0]}" y2="{at(1,v)[1]}" style="--i:{r}"/>\n')
    w('</g>\n')

    # --- boundary, drawn first, traces the whole holding ---
    w(f'<polygon class="bound" points="{poly(QUAD)}"/>\n')
    w('</svg>\n')


if __name__ == "__main__":
    main()
