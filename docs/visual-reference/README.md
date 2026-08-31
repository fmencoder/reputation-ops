# NOVRA visual reference

## Contents

| File | Role |
| --- | --- |
| `novra-concept-board.jpg` | **PRIMARY BENCHMARK.** The canonical board, panels A/B/C/D. 1536×1024, 559 KB. |
| `README.md` | Implementation specification — palette, typography, graphic language, prohibitions |
| `asset-specs.md` | Buildable specs for panels E–J and article heroes |
| `board.html` | Secondary. Live HTML/CSS reproduction from the shipping tokens; useful for spotting palette drift in a diff. |

Verified present 2026-08-31 at `0b19196`: valid JPEG, 1536×1024, sha256 `b2c6b471…`,
all four panels confirmed by inspection.

---

## ONE RULE THAT OVERRIDES THE BOARD

**The metrics rendered in panels C and D are not to be reproduced.** The board is
canonical for composition, palette, typography and graphic language. It is not
canonical for content, and six values on it are unsupported:

| Panel | Rendered on the board | Status |
| --- | --- | --- |
| C | 1,248 Projects Tracked | Unsupported — removed from the live site |
| C | 87 Research Papers | Unsupported — removed |
| C | 342 Systems Analyzed | Unsupported — removed |
| C | 98.7% Impact Score | Unsupported — removed |
| D | 10+ Years of Experience | Unsupported — removed |
| D | 50+ Research Papers | Unsupported — removed |

The two qualitative D tiles ("Global — Perspective", "Impact — Focused") were
removed as well: sitting in a counter frame makes them read as metrics whether or
not they carry a number.

Live replacements: panel C's modules become topic navigation; panel D's tiles
become the four focus areas (AI & Autonomous Systems, Blockchain & Smart
Contracts, Digital Infrastructure, Technology Innovation).

This rule exists because a canonical reference is consulted repeatedly. Without
it stated at the top, every future contributor reads the board, sees the
counters, and reintroduces them in good faith. `board.html` renders the corrected
treatment for exactly this reason.

---

## Written specification — derived from the concept board

### Environment

- Background: near-black with a deep navy cast. `#05070f`, raised panels `#0a0e1c`.
- Panels: 1px borders at `#1b2340`, strengthening to `#2a3560` on hover.
- Corner radius: 10px on controls, 14px on panels.
- Depth from layered gradients and hairline borders, never from heavy shadow.

### Illumination

- Primary: electric blue `#2f6bff`, bright variant `#4d84ff`.
- Secondary: violet `#7b4dff`, soft `#a07cff`. **Supporting, never dominant.**
- Brand gradient runs blue → royal → violet at roughly 100°.
- Glow is restrained: `0 0 24px rgba(47,107,255,0.28)`. Node points carry a
  tighter `box-shadow`, never a bloom.

### Typography

- Bright white `#ffffff` for display and headings; nothing dimmer at large sizes.
- Muted `#9aa6c8` for body, subtle `#6b779c` for meta.
- Display type is heavy (800), tight (1.08 line-height), slightly negative
  tracking. Eyebrows are small, uppercase, wide-tracked (0.18em), blue.
- The final display line takes the brand gradient as a text clip.

### Graphic language

What the board actually does, and what to reproduce:

- **Panel A** — luminous globe with an orbital arc and a network overlay.
  Concentric rings, rotated ellipses, discrete bright nodes on thin connecting
  paths.
- **Panel B** — distributed wireframe cubes at varied scale and depth, connected
  by faint paths. Reads as architecture, not decoration.
- **Panel C** — institutional dashboard: bordered modules, restrained data
  display, editorial card row beneath.
- **Panel D** — flowing network wave, violet-to-blue, over a fine grid.

Common to all four: **thin architectural lines, discrete luminous nodes, a fine
grid substrate, and generous negative space.** Density without clutter.

### Prohibited

Robot heads, humanoid AI figures, glowing brains, crypto coins, candlestick
charts as decoration, cyberpunk cityscapes, neon circuitry, stock-business
imagery, cheap 3D icons, heavy continuous animation.

---

## Implementation constraints — measured, not assumed

Three sanitisation behaviours were confirmed by diffing every payload against
its echo during deployment:

| Behaviour | Detection |
| --- | --- |
| All inline SVG stripped | Reported in `_content_warnings` |
| SVG upload rejected (`image/svg+xml`) | `media.create` error |
| **`inset` silently stripped from `style`** | Only by diffing — no warning at all |

The third is the trap. `_content_warnings` catches stripped *elements*, not
stripped *CSS properties*. Always diff the echo.

**Therefore:** graphics are built from layered `radial-gradient` /
`linear-gradient` fields, `border-radius: 50%` rings with `transform: rotate()`,
`box-shadow` glow nodes, and repeating-gradient grids — all via inline `style`,
all longhand positioning. This survives sanitisation, costs zero bytes, stays
sharp at any density, and adds no image request.

Rasterised versions of the original artwork are kept at `site/assets/` as
`.svg` / `.png` / `.webp` for anyone who wants the exact composition via manual
media upload.

---

## Status per surface

| Panel | Surface | Status |
| --- | --- | --- |
| A | Home hero | **Implemented** — CSS orbital network, deployed |
| B | Technology band | **Implemented** — CSS gradient field with nodes, deployed |
| C | Insights | **Partial** — layout deployed; metric tiles deliberately absent |
| D | About | **Implemented** — CSS wave/grid field, deployed |
| E | Convergence architecture | **BUILT + INTEGRATED** — desktop 1600×900 / 17.8 KB, mobile 900×1200 / 23.1 KB. Placed on Technology. |
| F | Blockchain / smart contracts | Not built |
| G | AI & autonomous agents | Not built |
| H | Financial technology | Not built |
| I | Digital infrastructure | Not built |
| J | Research modules | Not built |
| K | Article experience | Template carries an optional hero block; **reliability-budget hero BUILT + WIRED** (1600×900, 7.6 KB), 4 heroes outstanding |
| L | Contact | **Implemented** — intentionally minimal |

### These are buildable here — earlier assessment corrected

An earlier revision marked E–J `MANUAL_ASSET_REQUIRED` on the grounds that CSS
cannot render labelled topology with connecting edges. That reasoning was sound
about CSS and wrong about the pipeline: **SVG renders it precisely, and `sharp`
rasterises SVG to WebP locally.** WordPress rejects SVG upload and strips inline
SVG, but it accepts WebP without complaint — so authoring in SVG and shipping
the raster clears every constraint at once.

Panel E and the reliability hero were produced exactly this way.

**Pipeline** (canonical — `node site/render-assets.mjs`):

1. Author the diagram as `site/assets/<name>.svg`. DejaVu Sans is installed and
   rasterises correctly.
2. Register it in the `TARGETS` table in `site/render-assets.mjs` with its output
   dimensions.
3. `node site/render-assets.mjs` renders every target at density 160, quality 72,
   effort 6.
4. **Render a PNG and look at it before committing.** This is not optional and it
   is not a formality: it has caught a real defect in every asset built so far —
   E's flow spine was invisible, the hero's lower half was dead, and the mobile
   variant's control labels rendered underneath the plates. None of the three
   would have been caught any other way.
5. Validate at the real content widths, which are `min(viewport, 1200) − 48`:
   1152 / 976 / 812 / 572 / 342. A composition carrying type needs a second
   portrait composition for the bottom of that range — check by rendering, not
   by assuming it will hold.
6. `node site/render-assets.mjs --check` fails if a committed `.webp` no longer
   matches its `.svg`, so a stale asset cannot sit in the tree unnoticed.
7. Upload the `.webp` to the Media Library and record the returned URL in
   `site/wp-media.json`. **The `.svg` is never uploaded** — WordPress rejects
   `image/svg+xml`, and it is the editable original.

### Why quality 72

The first cuts were quality 80. 82 / 76 / 72 / 68 were then compared as 1:1 crops
at native resolution: plate gradients, hairline borders, 1px curves and the focal
glow are indistinguishable at 72, which removes about 17% of the bytes. Below 68
the dark gradients begin to band — that is the failure mode this palette is prone
to, and the reason quality is not pushed further.

### Why two compositions for Panel E

At a 572px content column (the 620px breakpoint) the desktop composition's
rotated `SECURITY` / `GOVERNANCE` / `OBSERVABILITY` / `HUMAN OVERSIGHT` labels
render as illegible smudges. Verified by rendering at that width and looking.
Shrinking the landscape composition further only makes it worse, so a portrait
composition with horizontal labels takes over below 620px via a `<picture>`
`media` source.

F, G, H, I and J remain unbuilt but are no longer blocked — the specifications in
`asset-specs.md` are directly buildable through this pipeline.

---

## Responsive QA record — 2026-08-31

Measured in headless Chromium against the built pages, not estimated. The
content column is `min(viewport, 1200) − 48` on `.wrap`, and `760 − 48` inside
`.wrap--narrow`, which is why the article hero never exceeds 710px however wide
the screen is.

### Panel E on `/technology/`

| Viewport | Content column | Source served | Result |
| ---: | ---: | --- | --- |
| 1600 | 1152 | desktop 1600×900 | Pass |
| 1280 | 1152 | desktop | Pass |
| 1024 | 976 | desktop | Pass |
| 860 | 812 | desktop | Pass |
| 620 | 572 | **mobile 900×1200** | Pass |
| 390 | 342 | **mobile** | Pass |

No horizontal overflow at any width. The `<picture>` `media` switch fires at the
620px breakpoint exactly as intended.

The desktop composition was also rendered at 572 for comparison: its rotated
control labels are illegible there. That is the measurement the second
composition exists because of.

### Reliability hero on the article template

| Viewport | Content column | Result |
| ---: | ---: | --- |
| 1600 | 710 | Pass |
| 1024 | 710 | Pass |
| 620 | 570 | Pass |
| 390 | 340 | Pass |

One composition serves the whole range because it carries no type. The dashed
reference line was strengthened from 0.22/1.2 to 0.45/1.9 during this pass: at
340px the original was effectively invisible, which erased the comparison the
figure exists to make.

### Fallback strategy QA — 2026-08-31

The dual-`<img>` fallback was rendered and measured rather than assumed ready,
which found a defect that would have shipped silently.

`.figure__mobile { display: none }` has specificity 0,1,0. `.figure__frame img
{ display: block }` has 0,1,1 and wins. Both images therefore rendered at every
width and the breakpoint switch did nothing at all — with no error, no warning,
and a page that looks plausible until you notice it is twice as tall.

Fixed by qualifying the toggles as `.figure__frame img.figure__mobile` /
`.figure__frame img.figure__desktop` (0,2,1).

Verified after the fix, in Chromium against the generated fallback payload:

| Viewport | Visible | In a11y tree | Hidden image fetched |
| ---: | --- | --- | --- |
| 1600 | desktop | desktop only | no |
| 860 | desktop | desktop only | no |
| 620 | mobile | mobile only | no |
| 390 | mobile | mobile only | no |

Exactly one image is displayed and exactly one is exposed to assistive
technology at every width, which is why both carry the same `alt` rather than
one being nulled. The hidden image was not fetched under `loading="lazy"`, but
that is a Chromium observation, not a guarantee — `<picture>` remains the
primary strategy because it makes the same promise by contract.

### Accessibility

- Both figures carry substantive `alt`; neither is `aria-hidden`.
- Every label in Panel E appears in the prose beside it. The diagram is never
  the only place the information exists.
- `figcaption` is `#6b779c` on `#05070f` — **4.55:1**, over the 4.5:1 floor but
  not by much. Do not darken this token further.
- Body text is `#9aa6c8` on `#05070f` — 8.30:1.
- Heading order on `/technology/` was h1 → h3, skipping a level. Fixed with a
  visually-hidden h2 over the four focus cards.

### Performance

| Asset | Transferred | Notes |
| --- | ---: | --- |
| Panel E, desktop | 17.8 KB | `loading="lazy"`, below the fold |
| Panel E, mobile | 23.1 KB | Only fetched under 620px |
| Reliability hero | 7.6 KB | `fetchpriority="high"`, no lazy — it is the LCP candidate |
| `novra.css` | 11.1 KB raw / 3.3 KB gzip | Pasted into Additional CSS |

Intrinsic `width`/`height` are set on every image and on the `<source>`, so the
box is reserved before the bytes arrive. Verified: at 390px the figure occupied
340×453 (the 3:4 mobile ratio) before the image finished loading. Zero layout
shift.

WebP is already compressed; gzip recovers under 1% and is not worth configuring
for these.
