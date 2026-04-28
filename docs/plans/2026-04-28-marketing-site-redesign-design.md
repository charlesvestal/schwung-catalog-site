# Schwung Marketing Site Redesign

**Date:** 2026-04-28
**Status:** Design approved, ready for implementation

## Goal

Reframe `schwung-catalog-site` from a single-page module catalog into a four-page marketing site for Schwung. The catalog becomes one page among others; the home page introduces what Schwung is and why it exists.

## Pages

Four separate static HTML files, deployed to GitHub Pages. No client-side routing or build step.

| File | Role |
|------|------|
| `index.html` | Landing — hero, "What Schwung adds", module ecosystem, CTAs |
| `catalog.html` | Existing module grid (current `index.html` content, lightly adjusted) |
| `install.html` | Installer download + CLI instructions + troubleshooting |
| `about.html` | Project background, bio, LLM disclosure, safety notice, credits |

## Shared chrome

- **Header:** wordmark on left, four text links on right (`Overview · Catalog · Install · About`). Active page highlighted via per-page `<body class="page-X">` and `.nav-link.active`. Markup hand-copied across files (no JS includes).
- **Footer:** existing GitHub link, plus license/version line.
- **Disclaimer line:** "*Independent project. Not approved, endorsed, or supported by Ableton.*" appears on landing hero, install page intro, and as a callout on About.

## Landing page (`index.html`)

Sections, top to bottom:

1. **Hero** — pitch headline (TODO: revise wording later), Ableton disclaimer line, two CTA buttons: `Install Schwung`, `Browse Catalog`.
2. **What it is** — short paragraph drafted from README (Shadow UI, runs alongside Move, MIT, unofficial).
3. **What Schwung adds** — 4×2 grid of curated cards covering host built-ins:
   - Shadow UI
   - Skipback
   - Quantized Resampler
   - Song Mode
   - RNBO Runner
   - Schwung Manager
   - Screen Reader
   - Native Sampler Bridge
4. **Module ecosystem** — short tagline + category cards (Sound Generators, Audio FX, MIDI FX, Tools, Overtake) with module counts. Each card links to `catalog.html?filter=<slug>`. Counts computed at runtime by fetching `data/module-catalog.json`.
5. **CTA strip** — "Ready to try it?" with `Install` and `GitHub` buttons.

## Catalog page (`catalog.html`)

The current `index.html` content moves here, with these changes:

1. Header replaced with the shared four-link nav (Catalog active).
2. Drop the redundant `<h1>Schwung Modules</h1>`; keep "Schwung Module Catalog" as the page heading.
3. Add `?filter=<category>` deep-link support to `app.js` (~10 lines): read query param on load, apply as active filter, update URL via `history.replaceState` when user changes filters.
4. No other behavior changes — sort, filter, download counts, audio preview plumbing all unchanged.

Audio previews remain a follow-up task. The `data/audio-previews.js` plumbing already exists; populating it is content work, not in scope here.

## Install page (`install.html`)

Sections:

1. **Intro** — short paragraph: Schwung runs alongside stock Move, install via desktop installer (recommended) or CLI. Includes Ableton disclaimer.
2. **Prereqs** — Move on Wi-Fi, computer on same network, Git Bash on Windows for CLI.
3. **Desktop installer (recommended)** — three platform buttons (macOS / Windows / Linux), all linking to `https://github.com/charlesvestal/schwung-installer/releases/latest`. Short blurb about SSH setup, module selection, accessibility.
4. **Command line** — curl one-liner with copy button. Accessible variant (screen-reader-only flags) below.
5. **After install** — three bullets: open Shadow UI, install modules, see MANUAL.md.
6. **Uninstall** — curl one-liner + note about backups.
7. **Troubleshooting / community** — links to MANUAL.md, GitHub Issues, Discord (`https://discord.gg/GHWaZCC9bQ`).

Tiny copy-to-clipboard JS for the curl blocks (~10 lines, vanilla).

## About page (`about.html`)

Sections:

1. **What it is** — drafted from README: unofficial framework for Ableton Move, adds Shadow UI alongside stock firmware, MIT, built on Move Anything.
2. **Ableton disclaimer callout** — boxed/styled, prominent.
3. **Who makes it** — bio paragraph (TODO marker for Charles to fill in). Below: "Built with the community" note crediting external module authors (handcraftedcc, fillioning, j3threejay, chaolue, jrucho, dom, mestela, …).
4. **LLM disclosure** — drafted from README line 23: heavily written by coding agents with human supervision.
5. **Safety notice** — brief: this is a hack, modifies software on Move, back up sets/samples, familiarize yourself with DFU restore. Link to Centercode DFU article.
6. **Credits / licenses** — links to `THIRD_PARTY_LICENSES`, `LICENSE`.
7. **Contact / community** — Discord, GitHub.

## Styling

Extend existing `style.css` (no new file). New classes:

- `.site-nav` — top nav row with wordmark + four links, active state
- `.hero` — large heading, italic disclaimer, CTA buttons
- `.section` — generic content section wrapper with vertical rhythm
- `.feature-grid` — 4-column grid (2 on tablet, 1 on mobile) for "What Schwung adds"
- `.category-grid` — 3-column grid for category cards with counts
- `.cta-strip` — full-width CTA section
- `.callout` — boxed notice for Ableton disclaimer on About
- `.code-block` — pre/code wrapper with copy button

Reuse existing color palette and font stack.

## Out of scope

- Audio previews (deferred as content work)
- Hero pitch wording (placeholder; user will revise)
- Build-time GitHub asset URL resolution for installer download buttons (current plan: just link to releases page)
- Search across pages
- Analytics changes

## Implementation order

1. Move current `index.html` → `catalog.html`, update header, add `?filter=` support to `app.js`.
2. Create new `index.html` (landing).
3. Create `install.html`.
4. Create `about.html`.
5. Extend `style.css` with shared chrome and new section styles.
6. Verify all four pages render and inter-link correctly in a browser.
