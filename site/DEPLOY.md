# WordPress deployment adapter

Everything below is ready to run. The only missing input is the site ID.

## The one blocker

`wpcom/user-sites` and `wpcom/ai-agent-sites-list` are both disabled in the
account's MCP settings, so the site cannot be discovered from here. A site ID
will not be guessed: a wrong identifier writes content into someone else's
property, and that is not a recoverable mistake.

Unblock either way:

- send the site URL or numeric blog ID, or
- enable `wpcom/user-sites` at https://wordpress.com/me/mcp

## Deployment sequence

Once the ID is known, in order:

1. `site.settings.get` — record title, tagline, permalink structure, privacy
   and visibility state as the pre-change baseline.
2. `site.plugin.list` — determine whether an SEO plugin already owns the
   `<head>`. If one does, schema and meta go through it rather than through the
   theme, or they will be emitted twice.
3. `site-editor-context theme.active` then `theme.presets` — read the real
   design tokens. The palette in `tokens.css` maps onto preset slugs; where the
   active theme already defines an equivalent, use the theme's slug rather than
   introducing a duplicate custom property.
4. `content-authoring patterns.list` / `patterns.get` — reuse existing patterns
   where they fit rather than importing raw HTML.
5. Create the six pages as **drafts**, in this order: About first (it holds the
   Person node every Article references), then Home, Technology, Insights,
   Research, Contact.
6. Create the two articles as drafts, with `Article` schema pointing at the
   About page's `#person` id.
7. Visual comparison against the approved reference; fix discrepancies.
8. Surface one publish confirmation for the whole set.

## Known permission gaps

These are disabled and will need to be done by hand in wp-admin. They are
site-level settings the connector cannot write:

| Setting | Operation | Why it matters |
| --- | --- | --- |
| Site title / tagline | `settings.update` | Masthead and `WebSite.name` |
| Theme selection | `theme.set` | Base theme for the block templates |
| Permalink structure | `settings.update` | `/insights/<slug>/` URL shape |
| Site visibility / launch | `manage-site.set-visibility` | Taking the site public |

Everything else — pages, posts, media, taxonomies, schema in block markup —
goes through `content-authoring`, which is enabled.

## Asset mapping

| Local | WordPress destination |
| --- | --- |
| `tokens.css` + `components.css` | Additional CSS, or a child theme stylesheet |
| `assets/favicon.svg` | Site icon |
| `assets/logo.svg` | Site logo block |
| `assets/share-card.svg` | Default Open Graph image |
| `templates/article.html` | Single-post block template |
| `templates/archive.html` | Archive / category / author templates |
| `structured-data.json` | Head injection, per the note below |

## Structured data

Emit `website` and `person` sitewide, `article_template` per post.

**Do not emit any Organization node.** NOVRA AI is a masthead, not a registered
entity, and asserting otherwise in machine-readable form is a false claim to
search engines. `structured-data.json` lists the forbidden types explicitly.
That restriction lifts only when a legal entity exists and its exact registered
name is supplied — at which point `publisher` moves from the Person to the new
Organization node, and nothing else in the graph changes.

## Placeholders that must not reach production

The build will happily ship these. Check before publishing:

- `PLACEHOLDER_DOMAIN` — pass the real domain: `node site/build.mjs --domain example.com`
- `PLACEHOLDER_BIO_PARAGRAPH_1` / `_2` — About page, written from fact
- `PLACEHOLDER_CONTACT_EMAIL` — Contact page
- `PLACEHOLDER_ONE_SENTENCE_VERIFIED` — Person description
- `PLACEHOLDER_VERIFIED_PROFILE_URL` — `sameAs`, only profiles that resolve and are controlled

Grep for `PLACEHOLDER` across `site/` before any publish. A non-empty result
means the site is not ready.

## Not rendered, by design

The reference's metric counters (1,248 / 87 / 342 / 98.7%, and 10+ Years /
50+ Research Papers) are design placeholders. They are absent from the markup
rather than zeroed, and the layouts close over the gap so nothing looks broken.
They return only if each becomes a real countable number.
