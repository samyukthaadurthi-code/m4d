#!/usr/bin/env python3
"""Build docs/hero-options.html — hero directions for review.

Same headline, eyebrow, sub and buttons as the live homepage; what changes
between options is the design language. Run from the site root:

    python3 tools/build_hero_options.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hero_layout_svg import svg  # noqa: E402

PHOTO = "../hero-plate.jpg"      # docs/ sits one level below the images

# --- wording locked to the live homepage ---------------------------------
EYEBROW = "MRC Landmarks"
H1 = 'Crafting landmarks<br>for the <em>South.</em>'
SUB = ("Across Southern Tamil Nadu, we plan, document and deliver land "
       "that families can build a future on.")
CTA_1, CTA_1_HREF = "Begin the Journey &rarr;", "../locations.html"
CTA_2, CTA_2_HREF = "Schedule a Visit", "https://forms.mrclandmarks.com/visit"
TRUST = ["DTCP approved", "TNRERA registered", "Survey verified",
         "Bank-loan eligible", "Clear documentation", "Planned infrastructure",
         "Family-first communities"]

TITLE_BLOCK = [
    ("Project", "ANANTAA &middot; Othakadai, Madurai"),
    ("Approval", "DTCP 7CGTNBEB &middot; TNRERA"),
    ("Layout", "50 residential plots &middot; 601 sq.m park"),
    ("Status", "Pre-launch"),
]


def ticker(cls="tick"):
    row = "".join(f"<span>{t}</span>" for t in TRUST)
    return f'<div class="{cls}"><div class="{cls}-track">{row}{row}</div></div>'


def cta(cls=""):
    return (f'<div class="cta-row {cls}">'
            f'<a class="btn btn-gold" href="{CTA_1_HREF}">{CTA_1}</a>'
            f'<a class="btn btn-line" href="{CTA_2_HREF}">{CTA_2}</a></div>')


SHELL_CSS = """
/* MRC palette, unchanged from the live site */
:root{
  --text:#1A2A2D; --text-body:#4A5450; --text-muted:#8A8D82;
  --bg:#F7F5EF; --bg-alt:#EEF1EC; --white:#FFFFFF; --border:#E4E2DA;
  --teal:#176A70; --teal-mid:#1A8085; --teal-deep:#12474C; --teal-pale:#E2EDEB;
  --gold:#C4A97D; --gold-light:#EDE4D4;
  --font-d:'Instrument Sans',system-ui,sans-serif;
  --font-b:'Inter',system-ui,sans-serif;
  --font-m:'IBM Plex Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
  --gut:clamp(1.25rem,4vw,3rem); --max:1240px;
}
*{box-sizing:border-box;margin:0;padding:0}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
html,body{background:var(--bg)}
body{font-family:var(--font-b);color:var(--text);-webkit-font-smoothing:antialiased;overflow-x:hidden}
img,svg{max-width:100%}
.wrap{width:min(100% - var(--gut)*2,var(--max));margin-inline:auto}
h1{font-family:var(--font-d);font-weight:600;letter-spacing:-.025em;line-height:1.04;text-wrap:balance}
h1 em{font-style:normal}
.eyebrow{font-family:var(--font-m);font-size:.7rem;letter-spacing:.24em;text-transform:uppercase;font-weight:500}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.95rem 1.8rem;border-radius:2px;
  font-family:var(--font-d);font-weight:600;font-size:.95rem;text-decoration:none;
  transition:background .3s var(--ease),color .3s var(--ease),border-color .3s}
.btn-gold{background:var(--gold);color:var(--text)}
.btn-gold:hover{background:#B59665}
.cta-row{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:2.4rem}
.label{font-family:var(--font-m);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
/* section marker for this review page only */
.tagbar{background:var(--text);color:#fff;padding:.85rem var(--gut);font-family:var(--font-d);font-size:.92rem;
  position:sticky;top:env(safe-area-inset-top,0px);z-index:40;display:flex;flex-wrap:wrap;gap:.35rem 1rem;align-items:baseline}
.tagbar b{color:var(--gold);font-family:var(--font-m);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase}
.tagbar i{font-style:normal;opacity:.6;font-family:var(--font-b);font-size:.8rem}
/* the layout drawing — shared by every option */
.layout .bound{fill:rgba(196,169,125,.12);stroke:#E6D0AA;stroke-width:6;stroke-dasharray:3000;stroke-dashoffset:3000;
  animation:trace 2s var(--ease) .3s forwards}
.layout .roads line{stroke:rgba(255,255,255,.75);stroke-width:9;stroke-linecap:round;opacity:0;
  animation:fade .6s ease calc(1.7s + var(--i)*.07s) forwards}
.layout .plots polygon{fill:rgba(255,255,255,.3);stroke:rgba(235,214,176,.95);stroke-width:2.4;opacity:0;
  animation:fade .45s var(--ease) calc(2.05s + var(--i)*.02s) forwards}
.layout .park{fill:rgba(196,169,125,.45);stroke:#E6D0AA;stroke-width:2.5;opacity:0;animation:fade .7s ease 2.9s forwards}
@keyframes trace{to{stroke-dashoffset:0}}
@keyframes fade{to{opacity:1}}
@keyframes riseIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
"""

# ---------------------------------------------------------------- option D
D_CSS = """
/* D — the approval sheet: white paper, ruled margin, title block, mono data */
.d{background:var(--bg);padding-block:clamp(1.6rem,3.5vw,3rem)}
.d .sheet{position:relative;background:var(--white);border:1px solid rgba(23,106,112,.22);
  padding:clamp(1.6rem,3.2vw,3.2rem);box-shadow:0 26px 70px rgba(23,106,112,.08)}
.d .sheet::after{content:"";position:absolute;inset:9px;border:1px solid rgba(196,169,125,.5);pointer-events:none}
.d .tick{position:absolute;width:13px;height:13px;border:0 solid var(--teal);opacity:.45}
.d .tick.tl{top:-1px;left:-1px;border-top-width:2px;border-left-width:2px}
.d .tick.tr{top:-1px;right:-1px;border-top-width:2px;border-right-width:2px}
.d .tick.bl{bottom:-1px;left:-1px;border-bottom-width:2px;border-left-width:2px}
.d .tick.br{bottom:-1px;right:-1px;border-bottom-width:2px;border-right-width:2px}
.d .top{display:flex;justify-content:space-between;gap:1rem;padding-bottom:1.1rem;
  border-bottom:1px solid var(--border);color:var(--text-muted)}
.d .top .eyebrow{color:var(--teal)}
.d .top span{font-family:var(--font-m);font-size:.66rem;letter-spacing:.18em;text-transform:uppercase}
.d .body{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(1.6rem,4vw,3.2rem);
  align-items:center;padding-block:clamp(1.8rem,4vw,3.2rem)}
.d h1{font-size:clamp(2.1rem,4.3vw,3.6rem)}
.d h1 em{color:var(--teal-mid)}
.d .sub{margin-top:1.3rem;max-width:40ch;font-size:1.04rem;line-height:1.66;color:var(--text-body)}
.d .rule{height:1px;background:var(--gold);margin-top:1.8rem;transform-origin:left;animation:grow 1s var(--ease) .2s both;max-width:180px}
.d .win{position:relative;aspect-ratio:4/3;overflow:hidden;border:1px solid rgba(23,106,112,.3)}
.d .win svg.layout{width:100%;height:100%;display:block}
.d .win .n{position:absolute;top:14px;right:16px;z-index:3;font-family:var(--font-m);font-size:.6rem;
  letter-spacing:.16em;color:#fff;text-align:center;opacity:0;animation:fade .6s ease 3.1s forwards}
.d .win .n svg{display:block;margin:0 auto 3px}
.d .win .scale{position:absolute;left:14px;bottom:13px;z-index:3;opacity:0;animation:fade .6s ease 3.1s forwards}
.d .win .scale i{display:block;width:78px;height:5px;background:linear-gradient(90deg,#fff 0 50%,transparent 50% 100%);
  border:1px solid #fff}
.d .win .scale span{display:block;margin-top:4px;font-family:var(--font-m);font-size:.58rem;letter-spacing:.14em;color:#fff}
.d .win .stamp{position:absolute;left:14px;top:12px;z-index:3;font-family:var(--font-m);font-size:.58rem;
  letter-spacing:.18em;text-transform:uppercase;color:#12474C;background:rgba(255,255,255,.9);
  border:1px solid rgba(23,106,112,.35);padding:.35rem .6rem}
.d .block{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border)}
.d .block div{padding:1rem 1.1rem 0 0;opacity:0;animation:riseIn .6s var(--ease) calc(3.2s + var(--i)*.1s) both}
.d .block div+div{border-left:1px solid var(--border);padding-left:1.1rem}
.d .block b{display:block;margin-top:.4rem;font-family:var(--font-m);font-size:.79rem;font-weight:500;
  letter-spacing:.01em;color:var(--text);line-height:1.45}
.d .btn-line{border:1px solid var(--teal);color:var(--teal)}
.d .btn-line:hover{background:var(--teal);color:#fff}
.d .tick-strip{margin-top:1.1rem;overflow:hidden;border-top:1px solid var(--border);padding-top:.85rem}
.d .tick-track{display:flex;gap:2.4rem;white-space:nowrap;animation:slide 40s linear infinite;
  font-family:var(--font-m);font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;color:var(--text-muted)}
@keyframes slide{to{transform:translateX(-50%)}}
@media(max-width:860px){.d .body{grid-template-columns:1fr}.d .block{grid-template-columns:1fr 1fr}
  .d .block div:nth-child(3){border-left:0;padding-left:0}.d .block div:nth-child(n+3){border-top:1px solid var(--border);margin-top:.9rem}}
"""


def option_d():
    fields = "".join(
        f'<div style="--i:{i}"><span class="label">{k}</span><b>{v}</b></div>'
        for i, (k, v) in enumerate(TITLE_BLOCK))
    return "<style>" + D_CSS + "</style>" + f"""
<section class="d"><div class="wrap"><div class="sheet">
  <i class="tick tl"></i><i class="tick tr"></i><i class="tick bl"></i><i class="tick br"></i>
  <div class="top"><p class="eyebrow">{EYEBROW}</p><span>Sheet 01 &mdash; Southern Tamil Nadu</span></div>
  <div class="body">
    <div>
      <h1>{H1}</h1>
      <div class="rule"></div>
      <p class="sub">{SUB}</p>
      {cta()}
    </div>
    <div class="win">
      {svg(view="880 500 1120 840", photo=PHOTO)}
      <span class="stamp">Approved layout</span>
      <div class="n"><svg width="14" height="20" viewBox="0 0 14 20" fill="none"><path d="M7 1 L11 9 L7 7 L3 9 Z" fill="#fff"/><path d="M7 9 v10" stroke="#fff" stroke-width="1.2"/></svg>N</div>
      <div class="scale"><i></i><span>0&mdash;50 m</span></div>
    </div>
  </div>
  <div class="block">{fields}</div>
  <div class="tick-strip"><div class="tick-track">{"".join(f"<span>{t}</span>" for t in TRUST * 2)}</div></div>
</div></div></section>
"""


# ---------------------------------------------------------------- option E
E_CSS = """
/* E — editorial: type fills the page, the land runs as a letterbox band under it */
.e{background:var(--bg);min-height:94vh;display:flex;flex-direction:column;padding-top:clamp(1.4rem,3vw,2.4rem)}
.e .masthead{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;
  padding-bottom:.9rem;border-bottom:2px solid var(--text)}
.e .masthead span{font-family:var(--font-m);font-size:.64rem;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted)}
.e .lede{display:grid;grid-template-columns:1.35fr .65fr;gap:clamp(1.6rem,4vw,4rem);
  align-items:end;padding-block:clamp(2rem,5vw,4rem);flex:1}
.e h1{font-size:clamp(2.7rem,8.2vw,7.2rem);letter-spacing:-.04em;line-height:.92;max-width:11ch}
.e h1 em{color:var(--gold)}
.e .sub{font-size:clamp(1rem,1.25vw,1.16rem);line-height:1.64;color:var(--text-body);
  padding-top:1.2rem;border-top:1px solid var(--text)}
.e .btn-line{border:1px solid var(--text);color:var(--text)}
.e .btn-line:hover{background:var(--text);color:#fff}
.e .band{position:relative;height:clamp(200px,32vh,320px);overflow:hidden;background:var(--teal-deep)}
.e .band svg.layout{width:100%;height:100%;display:block}
.e .band .over{position:absolute;inset:auto 0 0 0;display:flex;justify-content:space-between;gap:1rem;
  padding:1rem var(--gut);background:linear-gradient(180deg,transparent,rgba(16,40,43,.82));
  font-family:var(--font-m);font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.88)}
.e .band .over b{color:var(--gold);font-weight:500}
.e .marks{display:flex;flex-wrap:wrap;gap:.4rem 1.6rem;padding:.85rem 0;
  font-family:var(--font-m);font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;color:var(--text-muted)}
.e .marks i{font-style:normal;color:var(--gold)}
@media(max-width:860px){.e .lede{grid-template-columns:1fr;align-items:start}.e h1{max-width:none}}
"""


def option_e():
    marks = "".join(f"<span><i>&middot;</i> {t}</span>" for t in TRUST)
    return "<style>" + E_CSS + "</style>" + f"""
<section class="e">
  <div class="wrap">
    <div class="masthead"><p class="eyebrow">{EYEBROW}</p><span>Residential plots &mdash; Southern Tamil Nadu</span></div>
    <div class="lede">
      <h1>{H1}</h1>
      <div><p class="sub">{SUB}</p>{cta()}</div>
    </div>
    <div class="marks">{marks}</div>
  </div>
  <div class="band">
    {svg(view="360 620 2040 700", photo=PHOTO)}
    <div class="over"><span><b>Othakadai, Madurai</b> &mdash; 50 plots, drawn to the approval</span><span>Ring Road 1.8 km</span></div>
  </div>
</section>
"""


# ---------------------------------------------------------------- option F
F_CSS = """
/* F — layered: a pale panel of type overlapping a tall window of land */
.f{position:relative;background:var(--teal-deep);padding-block:clamp(3rem,7vw,6rem);overflow:hidden}
.f::before{content:"";position:absolute;inset:0;
  background:radial-gradient(85% 70% at 16% 8%,rgba(26,128,133,.55),transparent 60%)}
.f .grid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;align-items:center}
.f .panel{position:relative;z-index:3;background:var(--bg);padding:clamp(1.8rem,3.6vw,3.4rem);
  margin-right:-4.5rem;box-shadow:0 34px 80px rgba(0,0,0,.34)}
.f .panel::before{content:"";position:absolute;left:-10px;top:14px;bottom:14px;width:2px;background:var(--gold)}
.f .panel .eyebrow{color:var(--teal)}
.f h1{margin-top:1rem;font-size:clamp(2.2rem,4.2vw,3.7rem)}
.f h1 em{color:var(--teal-mid)}
.f .sub{margin-top:1.2rem;max-width:36ch;font-size:1.02rem;line-height:1.66;color:var(--text-body)}
.f .btn-line{border:1px solid var(--teal);color:var(--teal)}
.f .btn-line:hover{background:var(--teal);color:#fff}
.f .win{position:relative;aspect-ratio:5/6}
.f .win svg.layout{width:100%;height:100%;display:block}
.f .win::after{content:"";position:absolute;inset:-14px -14px 14px 14px;border:1px solid rgba(196,169,125,.55);z-index:-1}
.f .cap{position:absolute;left:0;right:0;bottom:0;padding:1.1rem 1.2rem;
  background:linear-gradient(180deg,transparent,rgba(12,40,43,.88));color:#fff}
.f .cap span{font-family:var(--font-m);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.f .cap b{display:block;margin-top:.35rem;font-family:var(--font-d);font-size:1.02rem;line-height:1.3}
.f .rail{position:relative;z-index:2;margin-top:clamp(1.8rem,4vw,3rem);display:flex;flex-wrap:wrap;gap:.5rem 2rem;
  padding-top:1rem;border-top:1px solid rgba(255,255,255,.2);
  font-family:var(--font-m);font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.f .rail i{font-style:normal;color:var(--gold)}
@media(max-width:900px){.f .grid{grid-template-columns:1fr;gap:0}
  .f .panel{margin-right:0;margin-bottom:-3rem;position:relative}
  .f .win{aspect-ratio:4/3}.f .win::after{display:none}}
"""


def option_f():
    rail = "".join(f"<span><i>&middot;</i> {t}</span>" for t in TRUST)
    return "<style>" + F_CSS + "</style>" + f"""
<section class="f"><div class="wrap">
  <div class="grid">
    <div class="panel">
      <p class="eyebrow">{EYEBROW}</p>
      <h1>{H1}</h1>
      <p class="sub">{SUB}</p>
      {cta()}
    </div>
    <div class="win">
      {svg(view="880 120 1100 1220", photo=PHOTO)}
      <div class="cap"><span>Othakadai, Madurai</span><b>50 plots, and the town already beside them</b></div>
    </div>
  </div>
  <div class="rail">{rail}</div>
</div></section>
"""


BAR = ('<div class="tagbar"><b>Option {n}</b>'
       '<span style="font-family:var(--font-d)">{t}</span><i>{s}</i></div>')


def main():
    parts = [
        "<title>MRC Hero Directions</title>",
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700'
        '&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">',
        f"<style>{SHELL_CSS}</style>",
        BAR.format(n="D", t="The approval sheet",
                   s="White paper, ruled margin, title block — the land presented as a document"),
        option_d(),
        BAR.format(n="E", t="Editorial",
                   s="Type fills the page; the land runs as a letterbox band beneath it"),
        option_e(),
        BAR.format(n="F", t="Layered panel",
                   s="A pale panel of type overlapping a tall window of land"),
        option_f(),
    ]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "hero-options.html")
    with open(os.path.normpath(out), "w") as f:
        f.write("<!doctype html>\n<html lang=\"en\"><head>\n<meta charset=\"utf-8\">\n"
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
                + "\n".join(parts[:5]) + "\n</head><body>\n"
                + "\n".join(parts[5:]) + "\n</body></html>\n")
    print("wrote", os.path.normpath(out))


if __name__ == "__main__":
    main()
