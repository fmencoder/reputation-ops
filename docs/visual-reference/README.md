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
| E | Convergence architecture | **BUILT** — `site/assets/novra-convergence-architecture.webp`, 1600×900, 21 KB |
| F | Blockchain / smart contracts | Not built |
| G | AI & autonomous agents | Not built |
| H | Financial technology | Not built |
| I | Digital infrastructure | Not built |
| J | Research modules | Not built |
| K | Article experience | Template exists; **reliability-budget hero BUILT** (1600×900, 8.6 KB), 4 heroes outstanding |
| L | Contact | **Implemented** — intentionally minimal |

### These are buildable here — earlier assessment corrected

An earlier revision marked E–J `MANUAL_ASSET_REQUIRED` on the grounds that CSS
cannot render labelled topology with connecting edges. That reasoning was sound
about CSS and wrong about the pipeline: **SVG renders it precisely, and `sharp`
rasterises SVG to WebP locally.** WordPress rejects SVG upload and strips inline
SVG, but it accepts WebP without complaint — so authoring in SVG and shipping
the raster clears every constraint at once.

Panel E and the reliability hero were produced exactly this way.

**Pipeline** (reproducible, no external tooling):

1. Author the diagram as SVG. DejaVu Sans is installed and rasterises correctly.
2. `sharp(svg, {density: 144}).resize(1600, 900).webp({quality: 80, effort: 6})`
3. Render a PNG alongside and **look at it** before committing. Both assets here
   went through a review pass that changed them — E's flow spine was invisible
   at first, and the hero's composition left the lower half dead.
4. Keep the `.svg` source in `site/assets/` next to the `.webp`. It is the
   editable original; regenerating from it is one command.

F, G, H, I and J remain unbuilt but are no longer blocked — the specifications in
`asset-specs.md` are directly buildable through this pipeline.
