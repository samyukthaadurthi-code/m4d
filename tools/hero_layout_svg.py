#!/usr/bin/env python3
"""The plotted layout, drawn onto the ground plane of the oblique aerial.

The layout is defined in unit space (0..1 across, 0..1 deep) and mapped onto a
quad picked off the photo, so the plots sit on the field in perspective instead
of looking like a flat rectangle pasted on top.

    svg()                          -> overlay + photo, whole frame
    svg(view="950 340 1000 1000")  -> the same, cropped to a window
"""
import sys

# photo pixel size — the overlay is emitted in these coordinates
W, H = 2400, 1340

# the patch of empty field the layout sits on, in photo pixels:
# far-left, far-right, near-right, near-left  (perspective quad)
QUAD = ((1000, 812), (1885, 798), (1995, 938), (895, 962))

COLS, ROWS = 6, 2          # plot blocks
ROAD = 0.035               # road width in unit space
PARK = (2, 0)              # which block is kept as open space
PHOTO = "hero-plate.jpg"


def at(u, v):
    """Bilinear map of unit (u, v) onto the ground quad."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = QUAD
    tx, ty = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
    bx, by = x3 + (x2 - x3) * u, y3 + (y2 - y3) * u
    return round(tx + (bx - tx) * v, 1), round(ty + (by - ty) * v, 1)


def poly(pts):
    return " ".join(f"{x},{y}" for x, y in pts)


def cell(u0, v0, u1, v1):
    return poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)])


def svg(view=None, photo=PHOTO, cls="layout"):
    """Overlay markup. `view` overrides the viewBox to crop to a window."""
    o = [f'<svg class="{cls}" viewBox="{view or f"0 0 {W} {H}"}" '
         'preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">']
    if photo:
        o.append(f'<image href="{photo}" x="0" y="0" width="{W}" height="{H}" '
                 'preserveAspectRatio="xMidYMid slice"/>')

    # boundary first — it traces the whole holding before anything fills in
    o.append(f'<polygon class="bound" points="{poly(QUAD)}"/>')

    o.append('<g class="plots">')
    i = 0
    for r in range(ROWS):
        for c in range(COLS):
            if (c, r) == PARK:
                continue
            u0, u1 = c / COLS + ROAD / 2, (c + 1) / COLS - ROAD / 2
            v0, v1 = r / ROWS + ROAD, (r + 1) / ROWS - ROAD
            for k in range(3):                      # three plots per block
                a = u0 + (u1 - u0) * k / 3
                b = u0 + (u1 - u0) * (k + 1) / 3
                o.append(f'<polygon points="{cell(a + .004, v0, b - .004, v1)}" style="--i:{i}"/>')
                i += 1
    o.append('</g>')

    pu, pv = PARK
    o.append('<polygon class="park" points="'
             + cell(pu / COLS + ROAD / 2, pv / ROWS + ROAD,
                    (pu + 1) / COLS - ROAD / 2, (pv + 1) / ROWS - ROAD) + '"/>')

    o.append('<g class="roads">')
    for c in range(1, COLS):
        u = c / COLS
        (x1, y1), (x2, y2) = at(u, 0), at(u, 1)
        o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" style="--i:{c}"/>')
    for r in range(1, ROWS):
        v = r / ROWS
        (x1, y1), (x2, y2) = at(0, v), at(1, v)
        o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" style="--i:{r}"/>')
    o.append('</g>')

    o.append('</svg>')
    return "\n".join(o)


if __name__ == "__main__":
    sys.stdout.write(svg(sys.argv[1] if len(sys.argv) > 1 else None))
