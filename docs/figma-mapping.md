# NOVRA Figma → WordPress mapping

**File:** NOVRA Intelligence — Design System
**Key:** `IqMDZx0x3UcM0ckW8aiKAg`
**URL:** https://www.figma.com/design/IqMDZx0x3UcM0ckW8aiKAg

Figma is the canonical visual workspace for NOVRA. It is not a second frontend
and nothing is deployed from it. The published site remains
novraintelligence.com on WordPress.com; this file is where the visual system is
designed and where its rules are written down.

The brand was not invented here. Every token below was read out of
`site/tokens.css`, and every string in the components was taken from live
published content. A value that appears in Figma and nowhere on the site is a
bug in Figma, not a design decision.

---

## 1. Tokens

Three variable collections, each named for the CSS custom property it carries.

| Figma collection | Variables | Source |
| --- | --- | --- |
| `NOVRA/Color` | `bg`, `bg-raised`, `bg-inset`, `border`, `border-strong`, `text`, `text-muted`, `text-subtle`, `accent`, `accent-bright`, `accent-2`, `accent-2-soft` | `--c-*` in `site/tokens.css` |
| `NOVRA/Space` | `s-1` … `s-32` (4px base) | `--s-*` |
| `NOVRA/Radius` | `radius` 10, `radius-lg` 14, `radius-pill` | `--radius`, `--radius-lg` |

### The light palette is not in Figma

`site/tokens.css` defines a light variant as a legibility floor for anyone
forcing a light colour scheme. It could not be modelled: the Figma Starter plan
allows **one mode per variable collection**, so the collection carries the
canonical Dark values only. The light values remain authoritative in
`tokens.css`:

```
bg #ffffff · bg-raised #f6f8fc · bg-inset #eef2f9
border #dbe2ef · border-strong #b9c4da
text #0a0e1c · text-muted #46527a · text-subtle #6b779c
```

If the plan ever gains multiple modes, add a `Light` mode and paste those in —
do not re-derive them.

### Type

Eleven text styles, all Inter, matching the ramp in `tokens.css`:

`NOVRA/Display/XL` 64 · `Display/L` 44 · `Display/M` 36 ·
`Heading/H2` 32 · `Heading/H3` 22 ·
`Body/Lead` 18 · `Body/Base` 16 · `Body/Small` 15 ·
`Meta/Caption` 13 · `Meta/Eyebrow` 12 (0.18em, uppercase) · `Meta/NavItem` 13

`--fs-h1` is a `clamp(2.25rem, 5.5vw, 4rem)` on the site. Figma has no fluid
type, so the clamp is split: `Display/XL` is the 64px ceiling and `Display/M`
the 36px floor.

---

## 2. Components → where they ship

| Figma component | Ships as |
| --- | --- |
| `NOVRA/Header` | `site/wp-templates/parts/header.html` (`pub/assembler//header`) |
| `NOVRA/MobileHeader` | same part below 620px — `wp:navigation` overlay, `customOverlayBackgroundColor` |
| `NOVRA/Nav` | the `wp_navigation` menu, id 63 — six live sections |
| `NOVRA/Footer` | `site/wp-templates/parts/footer.html` (`pub/assembler//footer`) |
| `NOVRA/Hero` | `.hero-split` in `site/novra.css`, flattened into page 21 by `site/build-inline.mjs` |
| `NOVRA/SectionHeading` | `.section-head` / eyebrow + H2 + lead, all six pages |
| `NOVRA/PrimaryButton` | `.btn` / `.btn--primary` |
| `NOVRA/ArticleCard` | the listing card in `site/wp-templates/index.html`, `archive.html`, `home.html`, `search.html` |
| `NOVRA/ResearchCard` | `.card` on `/research/` |
| `NOVRA/PublicationCard` | dated entry on `/insights/` |
| `NOVRA/AuthorCard` | `.byline` at the head of every article |
| `NOVRA/ArticleHero` | `pub/assembler//single` title block + the article's own `figure` |
| `NOVRA/ArchitectureVisual` | the hero SVGs in `site/assets/`, uploaded per `site/wp-media.json` |

---

## 3. Rules the components encode

These exist because each one was a defect that reached production or came close.

**The accent phrase is a solid colour, never a gradient.** WordPress.com strips
`background-clip` and `-webkit-background-clip` from inline styles while keeping
`background` and `color: transparent`. Four public headlines rendered as
invisible text on a coloured block before this was caught. `NOVRA/Hero` models
the accent as `accent-bright`; `site/build-inline.mjs` throws if either property
is ever emitted inline.

**The article hero appears once.** `NOVRA/ArticleHero` shows the title from the
template and the figure from the article body. The `single` template must not
also render `wp:post-featured-image`, which cropped every hero from 16:9 to 4:3
and printed it a second time.

**Listing cards are 16:9.** The theme default was 4:3.

**The footer says only what is true.** Wordmark, one descriptive line,
`contact@novraintelligence.com`, section links. No postal address, phone number,
business hours or legal entity — none exist, and none may be invented to fill
the space. The theme shipped placeholders for all four.

**`NOVRA/AuthorCard` carries name, role and subject areas.** No credentials,
employer, years of experience, client work, awards or affiliations. None are
verified.

---

## 4. The visual motif

`NOVRA/ArchitectureVisual` replaces the generic atom/orbit, which was decoration
that made no claim.

**Multi-layer convergence map.** Four classes of input — model output, retrieved
context, policy and limits, external tool results — converge on a single
deterministic gate before anything commits. Inputs of untrusted origin are drawn
dashed and in violet; attested inputs are solid and in blue. A legend states the
notation, because the diagram is making an argument.

It is the same argument the published articles make, so it has to stay accurate:
do not add a layer the architecture does not have, and never draw a path that
reaches `COMMIT` without passing the gate.

Its children carry `SCALE` constraints on both axes, so an instance resizes as
one unit exactly the way the live SVG does at `width:100%;height:auto`. Resize
instances on **both** axes at the 640:400 ratio — scaling one axis alone
distorts it.

---

## 5. What is not done

**The four breakpoint frames (390 / 620 / 1024 / 1600) are not built.** The
Figma Starter plan cut off MCP tool calls partway through composing them. The
components they would be assembled from are all in place and each carries its
own responsive behaviour, so the frames are composition work, not design work.

Widths to use when they are built, from `site/tokens.css` and the deployed
payloads:

| Frame | Shell | Content | Convergence map | Cards |
| --- | --- | --- | --- | --- |
| 1600 | full bleed | 1200 | 640 × 400 | 3 up |
| 1024 | full bleed | 976 | 540 × 338 | 2 up |
| 620 | full bleed | 572 | 572 × 358 | 1 up |
| 390 | full bleed | 342 | 342 × 214 | 1 up |

The hero wraps to one column when its copy column reaches its 342px floor,
which lands between 1024 and 620. That is the layout, not a breakpoint override:
the live page expresses it as an auto-fit grid because an inline style cannot
carry a media query.

**Rendered visual parity is not claimed.** The sandbox egress proxy answers 403
to CONNECT for novraintelligence.com, so no page of the live site has been
loaded in a browser from here. Figma screenshots verify the Figma file only.
