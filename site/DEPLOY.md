# WordPress deployment

Target: `novraintelligence.com` — WordPress.com Personal, Coming Soon, DNS
verified via Cloudflare.

## Status: blocked on MCP abilities, not on the site ID

The site ID was never the real blocker. With the domain supplied, the connector
accepts `novraintelligence.com` directly as `wpcom_site` — but **every operation
is disabled in the account's MCP settings**. `content-authoring` returns an empty
`operations` array.

**The ability IDs use two different namespaces.** This matters: content
authoring is namespaced `wpcom-mcp/`, while site, theme and account abilities
are namespaced `wpcom/`. An earlier revision of this file listed the content
abilities under `wpcom/`, which is wrong — searching the settings page for
`wpcom/pages-create` will not find anything.

Re-probed 2026-08-31 after an enablement attempt. Still rejected; the
`describe` and `execute` paths return the same rejection as the capability
listing, so this is not a stale cache.

**Verified by direct probe** (exact strings returned by the connector):

| Ability ID | Needed for | Probe result |
| --- | --- | --- |
| `wpcom-mcp/pages-create` | **Creating the six pages — the critical one** | Rejected (describe) |
| `wpcom-mcp/pages-list` | Duplicate detection, post-create verification | Rejected (execute) |
| `wpcom/user-sites` | Site discovery | Rejected |
| `wpcom/theme-active` | Active theme and presets | Rejected |
| `wpcom/site-settings` | Title, front page, permalinks, visibility | Rejected |

**Reported disabled by the capability listing** (namespace inferred as
`wpcom-mcp/` by the pattern above, not individually probed):

`pages-get` `pages-update` `pages-delete` · `posts-create` `posts-get`
`posts-list` `posts-update` `posts-delete` · `media-create` `media-get`
`media-list` `media-update` `media-delete` · `patterns-list` `patterns-get` ·
`synced-patterns-list` `synced-patterns-get` · `page-sections-*`
`post-sections-*` · `categories-*` `tags-*` `comments-*` · `content-search`

Enable at **https://wordpress.com/me/mcp**.

Minimum set to deploy anything:

    wpcom-mcp/pages-create     <- without this, nothing can be deployed
    wpcom-mcp/pages-list       <- required by the duplicate-detection gate
    wpcom-mcp/media-create     <- logo, favicon, Open Graph card
    wpcom/site-settings        <- front page, title, visibility

Add `wpcom-mcp/posts-create` for the article drafts.

Nothing was guessed and nothing was written. No site was modified.

## What is ready

`node site/wp-export.mjs` generates `site/wp-payload/` — one JSON per page
containing the exact `pages.create` parameter object, in deployment order, plus
`manifest.json`. Once the abilities are on, deployment is a loop over those
files. Nothing about what gets published is decided at deploy time.

    01-about.json        <- first: holds the Person node every Article references
    02-home.json         <- set as static front page after creation
    03-technology.json
    04-insights.json
    05-research.json
    06-contact.json
    manifest.json

## How the design transfers on a Personal plan

No theme upload, no file access, no GitHub deployment. The approved design is a
custom system rather than a theme, so the markup travels inside `core/html`
blocks and the stylesheet goes into **Appearance → Customize → Additional CSS**.

**Paste `site/novra.css` — the whole file, nothing else.** It is the merged,
deployment-ready build of `tokens.css` + `components.css`, already hardened for
the two sanitisation traps below. Pasting the two source files separately is
wrong: `novra.css` carries fixes that are not in them.

Rebuilding the layout from core blocks would mean re-deriving the design through
whatever the active theme imposes — the stock-theme outcome the brief rules out.

Two honest caveats:

- `core/html` content is not meaningfully editable in the block editor. Edits
  happen in this repository and redeploy. That is consistent with the repo being
  the source of truth, but it is a real constraint, not a free lunch.
- WordPress silently strips markup it disallows. **Check `_content_warnings` on
  every create response** rather than assuming the payload landed intact. If the
  inline SVGs are stripped, they move to media uploads and `<img>` references.

## Deployment order

1. Site identity, title, canonical URL — needs `wpcom/site-settings`
2. Logo, favicon, site icon — needs `wpcom-mcp/media-create`
3. **Diagram assets** — upload the three `.webp` files below, record the returned
   URLs in `site/wp-media.json`, re-run `node site/wp-export.mjs`
4. Additional CSS: paste `site/novra.css` (see below)
5. Pages, in payload order; About first
6. Home set as static front page
7. Article drafts — needs `wpcom-mcp/posts-create`
8. Structured data from `structured-data.json`
9. Open Graph assets
10. Responsive verification
11. Publication gates, then visibility change

Site stays **Coming Soon** throughout. Visibility is the last step and is not
automated.

## Diagram assets

Three rasters must exist in the Media Library before the Technology page or the
reliability article can be published. They are generated from committed SVG
sources by `node site/render-assets.mjs`, and `--check` verifies the committed
`.webp` still matches its source.

| File | Size | Used by |
| --- | --- | --- |
| `site/assets/novra-convergence-architecture.webp` | 1600×900, 17.8 KB | Technology — default source |
| `site/assets/novra-convergence-architecture-mobile.webp` | 900×1200, 23.1 KB | Technology — `<source media="(max-width: 620px)">` |
| `site/assets/reliability-budget-agentic-ai.webp` | 1600×900, 7.6 KB | Reliability-budget article hero |

**Do not upload the `.svg` sources.** WordPress rejects `image/svg+xml`, and they
are the editable originals, not deliverables. `wp-export.mjs` throws if an `.svg`
is ever referenced as an image source.

After each upload, record the URL returned by `media.create` in
`site/wp-media.json`:

    { "assets": { "/assets/novra-convergence-architecture.webp": "https://…" } }

Never hand-write one of these URLs. `wp-export.mjs` rewrites every `src`/`srcset`
through this map and **fails the export** on any unmapped asset — a page carrying
an unrewritten `/assets/` path renders a broken image, because WordPress.com on
the Personal plan has no file access and that path 404s.

### One thing to verify on the Technology page

The Technology payload contains the only `<picture>` element on the site. KSES
support for `<picture>` and `<source>` is WordPress-version-dependent and has not
been verified against this install. Diff the echoed content after `pages.create`:

- **Survived** → nothing to do; mobile viewports get the portrait composition.
- **Stripped** → the inner `<img>` still renders everywhere, so the page is not
  broken, only desktop-only on mobile. Switch strategies with one command:

      node site/wp-export.mjs --picture-fallback

  That rewrites the `<picture>` block into two `<img>` elements classed
  `figure__desktop` and `figure__mobile`, derived from the same source markup so
  the two forms cannot drift. Redeploy `03-technology.json` and read back again.

  Do not enable it speculatively. `<picture>` lets the browser skip the request
  it does not need by contract; the fallback pair relies on the hidden image not
  being fetched, which held in Chromium under `loading="lazy"` but is not
  guaranteed everywhere.

Checking `_content_warnings` is not sufficient here. It reports stripped
*elements* inconsistently and stripped *CSS properties* not at all — which is how
`inset` was silently removed. Diff the echo.

## Placeholder gate

`node site/wp-export.mjs` fails loudly on unresolved placeholders and lists them
per page. Current state:

| Page | Placeholder | Needs |
| --- | --- | --- |
| `contact` | `PLACEHOLDER_CONTACT_EMAIL` | A working address. **The only one blocking launch.** |
| `structured-data.json` | `PLACEHOLDER_TITLE` / `_META_DESCRIPTION` / `_ISO_DATE` / `_SLUG` | Per-article, filled from each post's front matter at publish. Not launch blockers. |

Resolved since the last pass: the About bio paragraphs and the Person
description are written; `sameAs` was removed from the schema outright rather
than left as a placeholder, because a wrong entry merges the subject with one of
400+ same-name people.

`wp-export.mjs` now also fails on any `/assets/` path with no Media Library URL
in `site/wp-media.json`. Both gates must be clear before a visibility change.

Pages may be created as drafts with placeholders present. None may be published
with them. Run `grep -R "PLACEHOLDER" site/ --exclude-dir=dist --exclude-dir=wp-payload`
before any visibility change.

## Entity rules

`NOVRA_LEGAL_ENTITY = NOT_YET_ASSERTED`. No Organization node is emitted.
`WebSite.name` carries the masthead; `publisher` and `Article.author` both
resolve to the Person. Forbidden types are listed in `structured-data.json`.

When a legal entity exists and its exact registered name is supplied,
`publisher` moves to a new Organization node and nothing else in the graph
changes.

---

# Deployment record — 2026-08-31

Deployed to blog_id **257059568** (`novraintelligence.com`). All six pages are
**drafts**; the site remains **Coming Soon** and was not launched.

| Page | ID | Slug | Status |
| --- | --- | --- | --- |
| About | 1 | `about` | draft |
| Home | 6 | `home` | draft |
| Insights | 7 | `insights` | draft |
| Research | 8 | `research` | draft |
| Contact | 9 | `contact` | draft |
| Technology | 10 | `technology` | draft |

Edit: `https://novraintelligence.com/wp-admin/post.php?post=<ID>&action=edit`
Preview: `https://novraintelligence.com/?page_id=<ID>&preview=true`

## Duplicate handling

The site shipped with a default WordPress page at ID 1, slug `about`, holding
boilerplate ("This is an example of a page…"), unmodified since provisioning.
Creating a second About would have produced `about-2`, so ID 1 was **updated in
place** instead. No duplicates exist: `pages.list` returns exactly six.

A default post remains: **ID 3, "Hello World!", published**. It was left alone —
deletion is destructive and was not authorised. Remove it from wp-admin, or say
the word and it goes to trash.

## What WordPress actually strips

Confirmed by comparing every submitted payload against its echo.

**1. All inline SVG is removed.** Reported in `_content_warnings`:
`<svg> <defs> <radialgradient> <stop> <lineargradient> <circle> <ellipse> <g> <path>`.

**2. SVG cannot be uploaded either.** `media.create` rejects `image/svg+xml`.
Supported: JPEG, PNG, GIF, WebP, BMP, TIFF, PDF, DOC/DOCX, XLS/XLSX, MP3, WAV,
OGG, MP4, WebM. So the media-upload fallback for SVG does not exist on this plan.

**3. `inset` is stripped from `style` attributes — silently, with no warning.**
This is the dangerous one. `position:absolute;inset:0` came back as
`position:absolute`, which collapses the element to zero size while
`_content_warnings` stays empty. Use longhand
`top:0;left:0;width:100%;height:100%`, which survives.

The lesson generalises: `_content_warnings` catches stripped *elements*, not
stripped *CSS properties*. Diff the echoed content against what was sent.

## How the decorative visuals were handled

Rebuilt as pure CSS — layered `radial-gradient` fields, `border-radius:50%`
rings with `transform:rotate()`, and glow dots via `box-shadow`. Inline styles
survive sanitisation, so this is the faithful route that actually renders. It
also costs zero bytes and adds no image request.

The original artwork is preserved in the repo and rasterised for anyone who
wants the exact composition:

    site/assets/hero-network.svg / .png / .webp
    site/assets/tech-cubes.svg / .png / .webp
    site/assets/logo.svg / .png / .webp
    site/assets/share-card.svg / .png

To use the raster versions instead, upload the `.webp` files through wp-admin
(Media → Add New) and replace the CSS visual divs with `<img>` tags pointing at
the resulting URLs.

## Still outstanding

- Additional CSS not yet installed. Paste `site/novra.css` into Appearance →
  Customize → Additional CSS. **Until that happens the pages render unstyled** —
  every class is defined there, including the new `.figure` rules the Technology
  diagram depends on.
- Three diagram `.webp` files not uploaded; `site/wp-media.json` is empty, so
  `wp-export.mjs` currently blocks the Technology payload.
- Site title, front page, and permalinks need `wpcom/site-settings`.
- Structured data not yet injected.
- Articles not published, per instruction.
- `PLACEHOLDER_CONTACT_EMAIL` unresolved — the one launch blocker.

## Plan note

`wpcom-user-sites` reports this site as **free, in a 30-day MCP grace period**
(`reason_code: wpcom_free_grace`, created 2026-08-31), not Personal as assumed.
MCP access to it may lapse around 2026-09-30.
