# Novra Intelligence — pre-cutover report

Prepared 2026-09-19. **Production is untouched and cutover has not been
attempted.** This report is the evidence for the approval decision.

Every PASS below names the command that produced it. Where something could not
be tested from this environment, it is marked NOT VERIFIED rather than assumed.

---

## 1. Existing architecture discovered

WordPress.com **Simple**, free plan, blog ID `257059568`, serving
`novraintelligence.com` as **hosting + frontend + CMS**. Permalinks are
`/YYYY/MM/DD/slug/` with a trailing slash. Six published pages, five published
articles, one category, no tags.

The root cause the migration exists to fix is recorded in
`docs/headless-migration-status.md`: Custom CSS is plan-gated on that tier, so
the design was flattened to inline `style` attributes and then filtered by the
platform sanitiser. An inline style cannot express a media query, a hover
state, a pseudo-element or a stacking context — so breakpoints, art direction
and interaction states were removed from the design before any visitor saw it.

## 2. New architecture implemented

    novraintelligence.com  →  WordPress (unchanged, still serving production)

    Vercel  →  Next.js 16.3.4 App Router, TypeScript, CSS Modules
            →  WordPress REST API, read-only
               public-api.wordpress.com/wp/v2/sites/257059568

WordPress is retained as headless CMS. The frontend never writes to it.
`frontend/content/cms-snapshot.json` is the canonical committed copy; live REST
is an overlay that may correct a title, date or excerpt, and may replace a body
only when that body parses as a whole article. The build fails rather than
publishing a hollow one.

No Supabase, PostHog, Sentry or AWS resource was provisioned — see §19.

## 3–5. Repository, branch, commit

| | |
| --- | --- |
| Repository | `fmencoder/reputation-ops` |
| Branch | `claude/optimistic-darwin-b249sn` |
| Commits | `fbb623a` institutional pages + hero fix, `62617e5` accessibility fix |
| Frontend root | `frontend/` |

## 6. Vercel preview deployment

| | |
| --- | --- |
| Project | `novra-intelligence-web` (`prj_zqBKYpUd7lJquswPSsA8dVdqg7UM`) |
| Team | `fmencoder` (`team_OfFB8yCjcnAoj8znWRdliDGB`) |
| Current deployment | `dpl_GQYYmbHAXjZrHcXaFq79sM34Tca6`, state **READY**, from `62617e5` |
| **Preview URL (review this one)** | <https://novra-intelligence-ixlda1zou-fmencoder.vercel.app> |
| Branch alias (always latest) | <https://novra-intelligence-web-git-claude-optimistic-d-bf7df6-fmencoder.vercel.app> |
| Previous deployment | `dpl_4jXtyDmE7QzvEZ8ymyFcp8uDw5fb`, READY, from `fbb623a` |
| Production domain attached | **No.** `novraintelligence.com` is not on this project. |

**The Vercel blocker recorded in the previous pass is resolved.** That pass
concluded the token could create a project with its first deployment but could
not deploy into an existing one. That is no longer the behaviour: the project
is git-linked, and pushing to the branch produced a preview build automatically
with no API upload. Both pushes produced their own READY build, confirmed
through the Vercel API — the git-linked path works end to end.

## 7–8. Pages migrated and content preserved

All eleven published URLs keep their exact paths. 17 routes build: 6 original
pages, 2 new pages, 5 articles, sitemap, robots, 404.

The five articles render from the CMS with their real titles, dates, excerpts
and bodies — 1,106 to 1,839 words each, verified by the QA run. No publication
title was invented to fill a card.

## 9–10. Migration and redirect manifest

`docs/migration-manifest.md`. **No redirects are required**: `trailingSlash:
true` in `next.config.mjs` makes the frontend answer on exactly the paths
WordPress serves, so no indexed URL changes. The two new URLs
(`/capabilities/`, `/global-development/`) are additive and collide with
nothing indexed.

## 11. Design implementation report

The approved 2026-09-18 board is committed at
`docs/visual-reference/novra-concept-board-approved-2026-09-18.jpg` and
documented as the baseline. It supersedes the earlier board and, notably,
already drops panel D's unsupported counters — ratifying the correction the
repository's existing rule required rather than reversing it.

| Ref | Implemented | Components | Graphics | Responsive verified | Material differences and why |
| --- | --- | --- | --- | --- | --- |
| **A — Homepage** | Yes | `app/page.tsx`, `Masthead`, `Wordmark`, `DomainGrid`, `ArticleCard`, `Button` | `home-earth` illuminated Earth (2000×1573, art-directed narrow variant) | 390/620/1024/1600 | Three-line headline restored — it was breaking to five lines at every width above 1200. An institutional band was **added below** the hero, not inside it, so panel A's composition is unchanged. |
| **B — Technology** | Yes | `app/technology/page.tsx`, `StackMap`, capability cards | `tech-cubes` cube field (2080×1360) | 390/620/1024/1600 | None material. |
| **C — Insights/Research** | Yes | `app/insights/page.tsx`, `app/research/page.tsx`, `ArticleCard` | `insights-map` world map (2027×1067) | 390/620/1024/1600 | The "System Overview" counters and the research-area percentages are **not rendered**. Five articles in one category cannot produce a 42/28/18/12 split, and the four counters are unsupported. The board's four publication cards are replaced by the five real articles. |
| **D — About** | Yes | `app/about/page.tsx` | `about-orbital` network field (1707×1413) | 390/620/1024/1600 | Panel D's counter tiles are the four capability tiles, which is what the approved board itself now shows. |

New graphics built this pass:

- `global-map` / `global-map-narrow` — a world map generated from the existing
  seeded scene at its own seed and density, so Global Development does not
  share one picture with Insights.
- `CapabilityIcon` — nine inline SVG marks for the new capability areas. No
  robot heads, no glowing brains, no stock photography.
- `ReliabilityChain` — a computed decay curve replacing a decorative rail that
  had been captioned as though it carried evidence.

## 12. Responsive results

`node scripts/browser-qa.mjs` — **BROWSER_QA=PASS, 36 renders** across 9 pages
at 390 / 620 / 1024 / 1600. Screenshots in `artifacts/frontend-qa/`.

The suite fails on horizontal scroll, overflowing headings, broken images,
missing canonical/description/OG tags, missing navigation, WordPress chrome in
the markup, a wrong masthead lockup, and any of the forbidden counter strings
appearing on a page. Headline setting was additionally measured at seven widths:
three lines from 620 to 1920, no horizontal overflow at any width.

## 13. BrowserStack / Mabl

**NOT RUN.** Both drive a browser from their own infrastructure against a
publicly reachable URL. The preview has Vercel SSO protection enabled
(`all_except_custom_domains`) and the local server is not externally
reachable, so neither service can load the site. Enabling them requires either
disabling preview protection or issuing a protection-bypass token — a decision
for the founder, see §21. The equivalent coverage was obtained locally through
Playwright against a real Chromium at four widths.

## 14. Build and test results

| Command | Result |
| --- | --- |
| `npm run build` | PASS — 17 routes |
| `npm run typecheck` | PASS — clean |
| `npm run lint` | PASS — clean |
| `node scripts/browser-qa.mjs` | PASS — 36 renders |
| `node scripts/a11y-qa.mjs` | PASS — 18 audits, 0 violations |

## 15. Accessibility results

`node scripts/a11y-qa.mjs` — axe-core over 9 pages at 390 and 1440 against
WCAG 2.1 A and AA. **PASS, 18 audits, 0 violations.**

The first run found 10 violation types, all one root cause: `--text-subtle`
(#6b779c) gave 4.19:1 on `--ink-inset` and 4.34:1 on `--ink-raised` against a
4.5:1 requirement for normal-size text. It was fixed, not documented — lifted
to #717ea5, the smallest scaling of the same colour that clears the worst case
(4.62 / 4.79 / 5.01:1). The audit is now a committed script that exits
non-zero, so this cannot regress silently.

This is an AA automated pass. It is not a manual audit: keyboard-only
traversal, screen-reader semantics and focus order were not tested by a person,
and axe cannot assess them.

## 16. SEO verification

- Every indexed URL unchanged, trailing slash preserved — §9.
- Canonical, meta description and Open Graph asserted on every page by the QA
  suite; a missing one fails the run.
- `sitemap.xml` enumerates `site.nav` plus every article, so the two new pages
  entered it automatically. `robots.txt` generated.
- Structured data parsed and validated; an `Organization` node is rejected on
  purpose, because the publication is not a legal entity.
- Alt text present on all artwork; no broken images at any width.

## 17. Performance results

Measured locally against the production build at 1440px:

| Page | Requests | Transfer | DOMContentLoaded |
| --- | --- | --- | --- |
| `/` | 37 | 110 KB | 308 ms |
| `/capabilities/` | 30 | 2 KB | 295 ms |
| `/global-development/` | 32 | 30 KB | 280 ms |
| `/insights/` | 40 | 36 KB | 348 ms |
| `/technology/` | 36 | 98 KB | 310 ms |
| article | 32 | 20 KB | 334 ms |

594 KB of JavaScript across all chunks. Every page is prerendered; imagery is
WebP with a separately composed narrow variant swapped by CSS, so a phone
downloads the phone render rather than a scaled desktop one.

**These are local numbers on loopback.** They are not Core Web Vitals, and no
Lighthouse run or field measurement was taken against the hosted preview.

## 18. Security review

- No secret is committed. The frontend holds no credential: it reads a public
  REST endpoint and has no write path to WordPress.
- No WordPress admin credential or API secret is exposed to the browser.
- Preview deployment is SSO-protected, so the unreleased site is not publicly
  crawlable — which also protects the SEO gate, since the pages carry canonical
  tags pointing at `novraintelligence.com`.
- Dependencies are three runtime packages: `next`, `react`, `react-dom`.
- No form posts anywhere. Contact is a `mailto:` link, so there is no endpoint
  to validate, rate-limit or spam-protect.
- **NOT DONE:** no dependency CVE scan was run, and HTTP security headers
  (CSP, HSTS, X-Frame-Options, Referrer-Policy) are **not configured**. See §20.

## 19. Analytics and monitoring status

**NONE CONFIGURED.** No PostHog project, Sentry project, or Vercel Analytics
was provisioned. The directive says not to introduce infrastructure that is not
justified, and each of these is a live third-party data flow on a site with no
production traffic yet and no stated privacy posture. They are cheap to add
after cutover and are listed in §21 as a decision rather than done silently.

## 20. Unresolved issues

1. **HTTP security headers are not configured.** No CSP, HSTS,
   X-Frame-Options or Referrer-Policy. Worth adding to `next.config.mjs`
   before cutover; it is a contained change.
2. **The hosted preview's pages were not fetched.** See §22.
3. **No dependency vulnerability scan.**
4. **Accessibility is automated-only** — no manual keyboard or screen-reader
   pass.
5. **Performance is local-only** — no Lighthouse or field data.
6. **Two throwaway Vercel projects** (`novra-scope-probe`,
   `novra-frontend-preview`) may still exist from the previous pass and are
   safe to delete.
7. **`main` is not the production ref** and is behind; see
   `docs/automation-runbook.md` before changing repository topology.

## 21. Actions requiring human authorization

1. **Production cutover** — §22. Nothing else in this report touches
   production.
2. **Whether to expose the preview.** Disabling SSO protection or issuing a
   bypass token would let BrowserStack, Mabl and Lighthouse run against it, and
   would let you share the link with someone who has no Vercel account. It also
   makes an unreleased site publicly reachable. Recommendation: leave
   protection on, review it while signed in, and enable a bypass only if
   outside review is needed.
3. **Analytics and monitoring** — whether PostHog, Sentry and Vercel Analytics
   should exist at all, and under what privacy posture.
4. **The positioning judgement.** The capability and global-development pages
   describe an independent practice led by its founder. They claim no
   engagements, and the global-development page names the institutions Novra is
   not affiliated with. If any real engagement or relationship exists that
   should be represented, it needs to come from you with evidence — it will not
   be inferred.

## 22. Production cutover procedure

Do not begin until the preview has been reviewed and approved.

1. Review the preview while signed in to Vercel, at desktop and phone widths.
2. Add HTTP security headers and redeploy; confirm the preview still passes.
3. In Vercel, add `novraintelligence.com` and `www.novraintelligence.com` to
   the `novra-intelligence-web` project. Vercel will show the DNS records
   required. **Do not change DNS yet.**
4. Promote the reviewed commit to a production deployment on that project and
   verify it on the `.vercel.app` production URL first.
5. Lower the TTL on the existing DNS records and wait out the old TTL.
6. Point DNS at Vercel. Confirm certificate issuance completes.
7. Immediately verify all eleven URLs resolve 200 on the live domain with the
   correct canonical tags — the five article paths especially.
8. Re-submit `sitemap.xml` in Search Console and watch coverage for two weeks.
9. **Leave WordPress running and unmodified.** It is the rollback, and it is
   also still the CMS this frontend reads from. Do not delete it, do not change
   its visibility, and do not remove its content.

## 23. Rollback procedure

Because WordPress is left running and serving the same content, rollback is a
DNS change and nothing else:

1. Point the DNS records back at WordPress.com. With the lowered TTL from step
   5, propagation is minutes.
2. Confirm the eleven URLs resolve against WordPress again.
3. Detach the domain from the Vercel project so it cannot re-acquire it.

No data migration is reversed, because none was performed: the frontend only
ever read from WordPress. No content was deleted, no permalink changed, no
media item moved. The rollback loses nothing, which is the whole reason the
cutover is safe to attempt.
