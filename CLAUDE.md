# MRC Landmarks — site and forms

Static marketing site (19 HTML pages + `mrc.css` + `chat-widget.js`) and a
Next.js forms/automation app in `forms/`. Both deploy to MRC's own Vercel team.

## Design rules for this client

The global UI rules in `~/.claude/CLAUDE.md` apply. On top of them:

- **Reference set** — before any new design work, open these and screenshot
  them: gsquarehousing.com (the client names it as the benchmark), and the
  pages of this site the client has already approved — `locations.html`,
  `project-anantaa.html`. Design against those, not from scratch.
- **Ask the client for a reference first.** This client reviews visually and
  rejects written descriptions. Every accepted design so far started from an
  image or a link they sent.
- **Words they have approved are locked.** Do not rewrite an approved headline
  while changing a design. Change one thing at a time.
- **Vocabulary** — "residential plots", never "villa plots" or "villas".
  "Crafting Landmarks, Creating Legacies" is the tagline. ANANTAA is set in
  caps with no full stop.
- **No invented facts.** Distances, approvals, plot counts, amenities: only
  what is in `forms/lib/mrc-knowledge.ts`. No figures the client has not given.
- **Yanaimalai (the hill) is background, not the subject.** The client asked
  for less focus on it.
- **The collage** (`south-collage-v5.jpg`) belongs to the homepage roots
  section. Don't reuse a collage elsewhere.
- Check every change at 375px as well as desktop. Most of this client's
  feedback has been about the phone.

## Working on the site

- Pages are edited directly; there is no page generator (the old one was lost).
- Bump the `mrc.css?v=` stamp on every page when the CSS changes.
- `tools/` holds the build scripts — keep generators here, never only in a
  session scratchpad.

## Deploy

```bash
cd ~/mrc-site && npx vercel --prod --yes          # project mrc-landmarks
cd ~/mrc-site/forms && npx vercel --prod --yes    # project mrc-forms
```

Git pushes to `github.com/samyukthaadurthi-code/m4d` need the `brezzergit`
account: `gh auth switch -u brezzergit`, push, then switch back.
