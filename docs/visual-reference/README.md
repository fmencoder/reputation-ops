# NOVRA visual reference

## The image file is NOT in this directory

The concept board (panels A/B/C/D) was shown to me in conversation. I can see it,
but I have no way to write those bytes to disk — the image never existed as a
file in this environment, and there is no tool here that persists a conversation
attachment.

**Save it yourself to `docs/visual-reference/novra-concept-board.jpg`.** Once it
is there it becomes the persistent benchmark for all future work. Until then,
the written specification below is the benchmark, derived from the board itself.

I would rather tell you the file is missing than let you believe a reference is
committed when it is not.

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
| E | Convergence architecture | Not built — see below |
| F | Blockchain / smart contracts | Not built |
| G | AI & autonomous agents | Not built |
| H | Financial technology | Not built |
| I | Digital infrastructure | Not built |
| J | Research modules | Not built |
| K | Article experience | Template exists; hero graphics not built |
| L | Contact | **Implemented** — intentionally minimal |

### On E through J

These are multi-node architecture diagrams with labelled layers — genuinely the
strongest visual idea in the brief, and the one CSS reproduces worst. Layered
gradients handle atmosphere well; they do not handle labelled topology with
connecting edges.

`GRAPHIC_STATUS = MANUAL_ASSET_REQUIRED` for all six. Producing them as
half-quality CSS approximations would undercut the design system rather than
extend it, which the brief explicitly rules out.

Asset specification for each: 1600×900 minimum, WebP at quality 80 with PNG
fallback, transparent or `#05070f` ground, palette strictly as above, thin
strokes (1–1.5px at 1× scale), labels in white at ≥14px effective size, node
glow via soft shadow only. Deliver to `site/assets/` and they can be uploaded
and referenced as `<img>` — that path is proven to work.
