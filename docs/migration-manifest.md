# Novra Intelligence — migration manifest

Recorded 2026-09-19. Source of truth for the WordPress → Next.js/Vercel move.

## Phase 0 — production state as found

| Fact | Value | How it was established |
| --- | --- | --- |
| Production site | <https://novraintelligence.com> | WordPress connector, `wpcom-user-sites` |
| WordPress instance | `novraintelligence.wordpress.com`, blog ID `257059568` | same |
| Platform | WordPress.com **Simple**, free plan, MCP grace period | `mcp_access.reason_code = wpcom_free_grace` |
| Custom domain | `novraintelligence.com`, mapped, site launched | `has_custom_domain: true`, `is_site_launched: true` |
| Role of WordPress | hosting **+** frontend **+** CMS | theme-rendered pages served on the custom domain |
| Permalinks | `/YYYY/MM/DD/slug/`, trailing slash | every `link` in the posts listing |
| GitHub | `fmencoder/reputation-ops` | GitHub connector |
| Vercel team | `fmencoder` (`team_OfFB8yCjcnAoj8znWRdliDGB`) | `list_teams` |
| Vercel project | `novra-intelligence-web` (`prj_zqBKYpUd7lJquswPSsA8dVdqg7UM`) | `get_project` |

**Nothing in production was modified.** No DNS record, domain assignment,
WordPress setting, page, post, permalink or media item was written in this pass.
Every WordPress call made was a `list`/`get`; no `*.create`, `*.update` or
`*.delete` operation was issued.

## Phase 1 — content inventory

Six published pages and five published articles. One category (`10544`), no
tags.

### URL manifest

Every row is a currently published URL. `Action` is what the Next.js frontend
does with it.

| Current URL | Content | Target URL | Action | Redirect | SEO notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Home (page 21) | `/` | Rebuilt, same path | none | Title and description preserved in `lib/seo.ts` |
| `/insights/` | Insights (page 20) | `/insights/` | Rebuilt, same path | none | — |
| `/research/` | Research (page 19) | `/research/` | Rebuilt, same path | none | — |
| `/technology/` | Technology (page 24) | `/technology/` | Rebuilt, same path | none | — |
| `/about/` | About (page 22) | `/about/` | Rebuilt, same path | none | — |
| `/contact/` | Contact (page 17) | `/contact/` | Rebuilt, same path | none | — |
| `/2026/08/31/recoverability-architecture/` | Article 56 | unchanged | Rendered from CMS | none | Prerendered, canonical self-referential |
| `/2026/08/31/human-oversight-architecture/` | Article 55 | unchanged | Rendered from CMS | none | same |
| `/2026/08/31/deterministic-boundaries-ai-smart-contracts/` | Article 54 | unchanged | Rendered from CMS | none | same |
| `/2026/08/31/context-engineering-production-ai/` | Article 53 | unchanged | Rendered from CMS | none | same |
| `/2026/08/31/agentic-ai-reliability-budget/` | Article 18 | unchanged | Rendered from CMS | none | same |

**No redirects are required.** Every indexed URL keeps its exact path,
including the trailing slash — `next.config.mjs` sets `trailingSlash: true`
specifically so the frontend answers on the same paths WordPress serves. That
is URL parity, not a style preference, and it is why this migration needs no
redirect map.

### New URLs introduced

These are additions. They collide with nothing indexed today.

| URL | Purpose |
| --- | --- |
| `/capabilities/` | Capability areas + method (Phase 4 of the directive) |
| `/global-development/` | Global Development & Public Sector (Phase 7) |

Both are added to `site.nav`, which is what `app/sitemap.ts` enumerates, so
they enter the XML sitemap automatically.

## Phase 2 — architecture

    novraintelligence.com          (unchanged, still WordPress, until cutover)
            │
            ▼  after approval only
    Vercel ── Next.js 16 frontend ── WordPress REST API (read-only)
                                     public-api.wordpress.com/wp/v2/sites/257059568

WordPress is retained as headless CMS. The frontend **never writes** to it.
`frontend/content/cms-snapshot.json` is the canonical committed copy of the
published payloads; the live REST surface is an overlay that may correct a
title, date or excerpt, and may replace a body only when the body it returns
parses as a whole article. A build with an empty or hollow article fails rather
than publishing one.

No Supabase, PostHog, Sentry or AWS resource was provisioned. None is load
bearing for this site today, and the directive says not to introduce
infrastructure that is not justified. See the pre-cutover report for what that
means for Phase 13.

## Content honesty

The board's panels C and D render six figures that no evidence supports
(`1,248 Projects Tracked`, `87 Research Papers`, `342 Systems Analyzed`,
`98.7% Impact Score`, `10+ Years of Experience`, `50+ Research Papers`). None
is reproduced. The approved 2026-09-18 board has already dropped the panel D
counters; panel C's research-area percentages (42/28/18/12) are likewise not
rendered, because five articles in one category cannot produce them.

Panel C's four publication cards show titles that do not exist. The live
Insights and home surfaces are populated from the five real articles instead.

The two institutional pages each carry a `standing` note stating in the site's
own voice that the capability described is not a record of past performance,
and the Global Development page names the institutions it is *not* affiliated
with. Those notes are typed as required fields so a future layout pass cannot
quietly drop them.
