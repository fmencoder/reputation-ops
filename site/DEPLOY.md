# WordPress deployment

Target: `novraintelligence.com` — WordPress.com Personal, Coming Soon, DNS
verified via Cloudflare.

## Status: blocked on MCP abilities, not on the site ID

The site ID was never the real blocker. With the domain supplied, the connector
accepts `novraintelligence.com` directly as `wpcom_site` — but **every operation
is disabled in the account's MCP settings**. `content-authoring` returns an empty
`operations` array.

Probed 2026-08-31. Exact ability names, all reported as
*"not enabled in your MCP settings"*:

| Ability | Needed for |
| --- | --- |
| `wpcom/user-sites` | Site discovery |
| `wpcom/site-settings` | Title, tagline, front page, permalinks, visibility |
| `wpcom/theme-active` | Reading the active theme and its presets |
| `wpcom/pages-create` | **Creating the six pages — the critical one** |
| `wpcom/pages-update` `wpcom/pages-get` `wpcom/pages-list` `wpcom/pages-delete` | Page management and QA verification |
| `wpcom/posts-create` `wpcom/posts-update` `wpcom/posts-get` `wpcom/posts-list` | Publishing the article drafts |
| `wpcom/media-create` `wpcom/media-list` `wpcom/media-get` | Logo, favicon, Open Graph card |
| `wpcom/patterns-list` `wpcom/patterns-get` | Pattern reuse |
| `wpcom/page-sections-*` `wpcom/post-sections-*` | Block-level editing |
| `wpcom/categories-*` `wpcom/tags-*` | Taxonomy |
| `wpcom/comments-*` | Comment management |
| `wpcom/content-search` | Duplicate-content QA |

Enable at **https://wordpress.com/me/mcp**.

Minimum set to deploy anything: `wpcom/pages-create`, `wpcom/pages-list`,
`wpcom/media-create`, `wpcom/site-settings`. Add `wpcom/posts-create` for the
articles.

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
blocks and the two stylesheets go into **Appearance → Customize → Additional
CSS** (concatenate `tokens.css` then `components.css`).

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
2. Logo, favicon, site icon — needs `wpcom/media-create`
3. Additional CSS: `tokens.css` + `components.css`
4. Pages, in payload order; About first
5. Home set as static front page
6. Article drafts — needs `wpcom/posts-create`
7. Structured data from `structured-data.json`
8. Open Graph assets
9. Responsive verification
10. Publication gates, then visibility change

Site stays **Coming Soon** throughout. Visibility is the last step and is not
automated.

## Placeholder gate

`node site/wp-export.mjs` fails loudly on unresolved placeholders and lists them
per page. Current state:

| Page | Placeholder | Needs |
| --- | --- | --- |
| `about` | `PLACEHOLDER_BIO_PARAGRAPH_1` / `_2` | Two short paragraphs, written from fact |
| `contact` | `PLACEHOLDER_CONTACT_EMAIL` | A working address |
| `structured-data.json` | `PLACEHOLDER_ONE_SENTENCE_VERIFIED` | Person description |
| `structured-data.json` | `PLACEHOLDER_VERIFIED_PROFILE_URL` | `sameAs` — only profiles that resolve and are controlled |

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
