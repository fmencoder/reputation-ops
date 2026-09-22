# Novra Intelligence — production-readiness report

> **State as of 2026-09-22 — read this first.**
>
> This document was written for an earlier candidate and its evidence still
> refers to it. Both states are true; they are different states.
>
> | | |
> | --- | --- |
> | HISTORICAL | `d4d0ab2` was prepared as a Vercel **production** deployment (`dpl_8irAdBUujNDHccrozcM9yrhH3DTc`) while public DNS stayed on WordPress. |
> | CURRENT PRE-MERGE | The candidate is `ce2cf336` plus the closure commits on `claude/novra-founder-worldmap-0rf06p`. It is **preview only** and has **not** been promoted. |
> | PRODUCTION NOW | Still `dpl_8irAdBUujNDHccrozcM9yrhH3DTc` at `d4d0ab2`. |
> | PUBLIC DNS NOW | Still WordPress.com — apex `192.0.78.24` / `192.0.78.25`. Re-verified against the authoritative Cloudflare nameservers 2026-09-22. |
> | CUTOVER | Has **not** occurred. |
>
> Nothing below should be read as saying the newer candidate is deployed.

Prepared 2026-09-19. **No production DNS was changed. No production system was
touched.** WordPress is still serving `novraintelligence.com`.

Every PASS names the command that produced it. Anything that could not be
tested from this environment is marked NOT VERIFIED, not assumed.

---

## Verdict

**No RED items. One AMBER gate must be closed by you before cutover.**

The hosted preview has never been fetched — by me or by anyone. Egress to
`*.vercel.app` is blocked by this environment's network policy and the preview
is SSO-protected, so local verification is all I can offer, and local
verification is not hosted verification. You can close that gate in about ten
minutes; the checklist is in §2. Until it is closed I am not calling the site
production-ready.

| # | Gate | Status |
| --- | --- | --- |
| 1 | Security headers | **GREEN** |
| 2 | Hosted preview QA | **AMBER** — blocked by egress policy + SSO; owner: you |
| 3 | Performance | **GREEN** |
| 4 | Accessibility — automated + keyboard | **GREEN** |
| 4b | Accessibility — screen reader | **AMBER** — not performed by a human |
| 5 | Dependency scan — frontend | **GREEN** — 0 vulnerabilities |
| 5b | Dependency scan — root dev toolchain | **AMBER** — accepted residual risk |
| 6 | Forms and error paths | **GREEN** |
| 7 | SEO and indexation | **GREEN** |
| 8 | Monitoring | **AMBER** — plan written, nothing enabled, needs your decision |
| 9 | Cutover / rollback plan | **AMBER** — prepared; needs registrar access you hold |
| 10 | Positioning and claim discipline | **GREEN** |

---

## Identifiers

| | |
| --- | --- |
| Repository | `fmencoder/reputation-ops` |
| Branch | `claude/optimistic-darwin-b249sn` |
| Head commit | `d4d0ab2fe7208558dc64156fe86648da2ec2d678` |
| Commits this pass | `5285e8e` headers · `ebab172` font + images · `d4d0ab2` keyboard, errors, SEO |
| Vercel project | `novra-intelligence-web` (`prj_zqBKYpUd7lJquswPSsA8dVdqg7UM`) |
| Latest deployment | `dpl_BvJ7GYAPdofVmGHfwiH4iSDZfL6V`, **READY**, from `d4d0ab2` |
| Preview (branch alias, always head) | <https://novra-intelligence-web-git-claude-optimistic-d-bf7df6-fmencoder.vercel.app> |
| Production domain attached | **No** |

## Test commands

    cd frontend
    npm run build        # 17 routes
    npm run typecheck    # clean
    npm run lint         # clean
    npm run qa:browser   # BROWSER_QA=PASS   36 renders @ 390/620/1024/1600
    npm run qa:a11y      # A11Y_QA=PASS      18 axe-core audits, 0 automated violations
    npm run qa:keyboard  # KEYBOARD_QA=PASS  0 failures
    npm run qa:csp       # CSP_QA=PASS       10 routes, 0 violations
    npm run qa:seo       # SEO_QA=PASS       13 URLs
    npm run qa:lighthouse
    npm audit            # 0 vulnerabilities (frontend)

---

## 1. Security headers — GREEN

Served on HTML and on static assets. `X-Powered-By` removed.

    Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none';
      frame-ancestors 'none'; frame-src 'none'; form-action 'none';
      script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
      font-src 'self'; img-src 'self' https://novraintelligence.wordpress.com;
      connect-src 'self'; manifest-src 'self'; upgrade-insecure-requests
    Strict-Transport-Security: max-age=31536000
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    X-Frame-Options: DENY
    Cross-Origin-Opener-Policy: same-origin
    Permissions-Policy: 16 features denied

**The CSP was measured, not guessed.** A Chromium run over all nine routes plus
a 404 requested exactly one origin — its own — used zero `<style>` elements and
carried no inline event-handler attributes. Fonts were the only external origin
and are now self-hosted, so **no third-party host is allowed anywhere in the
policy**. There is no `'unsafe-eval'`.

Two directives are looser, both load-bearing and both documented in
`next.config.mjs`:

- `script-src 'unsafe-inline'` — the App Router ships its RSC payload as inline
  `self.__next_f.push(...)` blocks that change every build. A nonce requires
  `headers()` in the request path, which opts all 17 prerendered routes out of
  static generation; hashes would have to be rewritten into the config on every
  build. Residual risk is bounded by there being no user input, no
  query-parameter reflection, no authentication and no third-party script, and
  by `base-uri`, `object-src`, `frame-ancestors` and `form-action` all being
  `'none'`.
- `style-src 'unsafe-inline'` — `next/image` writes `style="color:transparent"`
  on every image. A style attribute cannot carry a nonce or a hash.

**HSTS carries neither `includeSubDomains` nor `preload`, as instructed.**
`includeSubDomains` would assert that every host under `novraintelligence.com`
is HTTPS-only. That could not be verified: egress to the domain is blocked and
no resolver is available here, so no subdomain was enumerated or tested.
Asserting it blind breaks any plain-HTTP subdomain with no way to click through.

Verified: `CSP_QA=PASS` — 10 routes, 0 `securitypolicyviolation` events, 0
same-origin request failures, 32 images loaded. Network failures are counted
separately so a blocked request is never mistaken for a CSP block.

## 2. Hosted preview QA — AMBER

**NOT VERIFIED. Nothing below was tested against the hosted preview.**

Attempted and refused:

| Route | Result |
| --- | --- |
| `curl https://…vercel.app/` | `000` — CONNECT rejected by egress policy |
| Same, with the proxy CA bundle | `000` — still rejected, so not a TLS-trust issue |
| `curl https://vercel.com/` | `000` |
| Vercel `web_fetch_vercel_url` | "Unable to create shareable URL" |
| Vercel `get_access_to_vercel_url` | "Unable to create shareable URL" |
| Vercel `get_deployment_file_contents` | HTTP 401 |
| Vercel `list_deployment_events` (build logs) | HTTP 404 |

The proxy's own status endpoint records these as `connect_rejected` —
organization policy denials, which the proxy documentation says to report
rather than route around. The control is that `fonts.googleapis.com` **is**
reachable from the same sandbox, so this is host-specific policy, not a blanket
block.

**What is known about the hosted build:** it exists, it is `READY`, and it was
built from commit `d4d0ab2` — confirmed through the Vercel API. The security
headers are present in `.next/routes-manifest.json`, which is the build artifact
Vercel reads to apply headers at the edge. That is good evidence they will be
served. It is not a live response.

**To close this gate (~10 minutes, signed in to Vercel):** open the branch alias
and check `/`, `/capabilities/`, `/global-development/`, one article, and a
deliberately wrong URL. Confirm: pages render with the dark theme and Inter;
nav and mobile menu work; images and the world map appear; DevTools console is
clean; Network shows **no request to fonts.googleapis.com or gstatic**; the
wrong URL shows the 404 page; and the response headers on `/` carry CSP and
HSTS. The repository's suites can also be pointed at the host — see the runbook.

## 3. Performance — GREEN

Lighthouse 13.5.0, local production build, mobile and desktop presets. Full
JSON in `artifacts/lighthouse-final/`.

| Form | Path | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | `/` | 96 | 100 | 100 | 100 | 2.7 s | 0 | 60 ms |
| mobile | `/capabilities/` | 97 | 100 | 100 | 100 | 2.3 s | 0 | 130 ms |
| mobile | `/global-development/` | 97 | 100 | 100 | 100 | 2.5 s | 0 | 70 ms |
| mobile | article | 96 | 100 | 100 | 100 | 2.6 s | 0 | 70 ms |
| desktop | `/` | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| desktop | `/capabilities/` | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| desktop | `/global-development/` | 100 | 100 | 100 | 100 | 0.5 s | 0 | 0 ms |
| desktop | article | 100 | 100 | 100 | 100 | 0.5 s | 0 | 0 ms |

JavaScript transferred: **149 KB** per page. Total page weight 245–348 KB.

### Two material fixes, with before/after

**Google Fonts was one root cause behind three failures.** It cost 780 ms of
render-blocking on mobile, was the only browser console error on the site
(holding Best Practices at 96), and its in-flight request was the *actionable*
reason every page was ineligible for the back/forward cache. The comment
justifying the CDN link claimed the build environment had no egress; that was
wrong — the policy is per-host and both Google Fonts hosts answer 200. Inter is
now fetched at build time by `next/font` and served from our own origin.

| | Before | After |
| --- | --- | --- |
| Best Practices (mobile, all pages) | 96 | **100** |
| Console errors | 1 | **0** |
| Render-blocking (mobile) | 780 ms (fonts) + CSS | **110 ms**, own CSS only |
| bf-cache actionable blocker | present | **gone** (only Chrome-flag reasons remain) |
| External origins in CSP | 2 | **0** |
| Third-party request per page load | 1 (visitor IP to Google) | **0** |

**Both art variants were downloading on every page load.** `BrandImage`
rendered the desktop and phone compositions as two `<img>` and hid one with
`display:none`, on the stated belief that "each viewport downloads the one it
shows". `display:none` suppresses layout, not loading. Measured in Chromium at
390px, the 2000×1573 desktop composition reported `shown=false loaded=true`.
It is now a `<picture>` with `<source media>`, so the choice happens before the
fetch, built with `getImageProps` to keep the optimizer's per-width variants and
AVIF. The LCP image also now carries `fetchpriority=high`, which Lighthouse had
been reporting as missing.

| Homepage art transferred | Before | After |
| --- | --- | --- |
| mobile (390px) | 49 KB / 6 requests | **31 KB / 5 requests** |
| desktop (1440px) | 108 KB / 7 requests | **57 KB / 6 requests** |

**One change was tried and reverted**, because the measurement contradicted the
reasoning. Turning the font preload off to stop it competing with the hero image
did not move LCP at all and broke CLS — 0 → 0.129 on the homepage and 0 → 0.21
on an article — dropping mobile performance to 92 and 87. The numbers are
recorded in `app/layout.tsx` so nobody re-derives it from first principles.

**Caveat:** these are lab numbers on loopback with Lighthouse's throttling. They
are not field data. Mobile LCP at 2.3–2.7 s straddles the 2.5 s "good"
threshold, and only real-user measurement will settle it — see §8.

## 4. Accessibility

### Automated + keyboard + structure — GREEN

`npm run qa:a11y` → **18 axe-core audits, 0 automated violations** (WCAG 2.1
A/AA, 9 pages × 390 and 1440).

`npm run qa:keyboard` → **0 failures**, covering what axe cannot:

| Check | Result |
| --- | --- |
| Skip link | First tab stop, visible on focus, actually moves focus to `#main` |
| Visible focus | All 14 tab stops on the homepage have an outline or box-shadow |
| Focus order | Follows visual order down the page |
| Mobile menu | Opens on Enter, reports `aria-expanded`, Tab enters the drawer |
| Mobile menu | **Escape closes it and returns focus to the toggle** |
| Landmarks | 1 `<main>`, 1 `<h1>`, 3 named `<nav>` per page, `lang="en"` |
| Headings | No level skips on any page checked |
| Form labels | 0 form controls exist, so 0 unlabelled |
| Accessible names | Every link and button on the homepage has one |

**One real defect was found and fixed:** Escape did not close the mobile drawer,
so a keyboard user who opened the menu and changed their mind had no exit but
tabbing through all nine links. Returning focus to the toggle matters as much as
closing — closing without it leaves focus on a `display:none` element and drops
the caret to the top of the document.

### Screen reader — AMBER

**NOT PERFORMED.** No NVDA, JAWS or VoiceOver pass was run; none is available in
this environment, and axe cannot substitute for one. What the structural checks
above establish is that the semantics a screen reader depends on are present —
landmarks, heading order, accessible names, `lang`, live `aria-expanded`. What
they do not establish is how the page actually sounds.

Per your instruction, the claim is stated as: **18 axe-core audits, 0 automated
violations, plus a passing keyboard and structure pass.** Not "WCAG AA passes".

## 5. Dependency and security scan

### Frontend — GREEN

`npm audit` in `frontend/`: **0 vulnerabilities at every severity**, production
and dev. Runtime dependencies are three packages: `next`, `react`, `react-dom`.

Two low-severity dev-only advisories (ReDoS in `@eslint/plugin-kit` via
`eslint`) were closed by moving eslint inside the fixed range — a minor bump,
verified by lint and build still passing. No large upgrade was made.

### Root workspace — AMBER, accepted residual risk

`npm audit --omit=dev` at the repository root: **0 vulnerabilities.** The root
package has **zero production dependencies**.

`npm audit` including dev reports 5 (1 critical, 1 high, 3 moderate), all in the
`vitest` → `vite` → `esbuild` chain:

| Advisory | Severity | Why it is not being fixed |
| --- | --- | --- |
| `@vitest/mocker` path traversal | critical | Requires running vitest against a hostile test or config. Not reachable in CI or production |
| `esbuild` dev-server request forgery | moderate | Affects `vite dev`, which is never started here |
| `vite` / `vite-node` transitive | moderate/high | Same chain |

**None of this ships.** The deployed artifact is `frontend/` alone; the root
package is the local toolchain for the art pipeline and the search scanner. The
fix is `vitest@5`, a breaking major, which is exactly the "large dependency
upgrade" to avoid for a vulnerability that has no reachable path. Revisit when
vitest is upgraded for its own reasons.

### Static analysis

The repository has no SAST tool configured. ESLint (with `eslint-config-next`
and `jsx-a11y`) and `tsc --noEmit` both run clean and both gate the build.
Adding CodeQL would be a reasonable next step; it was not in scope here.

## 6. Forms and error paths — GREEN

| Path | Result |
| --- | --- |
| Contact form | **There is none.** Contact is a `mailto:` link — no endpoint, no validation, no spam surface, nothing to fail |
| `/no-such-page/` | HTTP **404** (a real status, not a soft 404) |
| `/2026/08/31/not-an-article/` | HTTP **404** |
| Unslashed URL | HTTP **308** → slashed form |
| `robots.txt`, `sitemap.xml` | HTTP 200 |
| Route error boundary | **Added** — `app/error.tsx` |
| Global error boundary | **Added** — `app/global-error.tsx` |
| CMS/API failure at runtime | Not possible — all 17 routes are prerendered; WordPress is read at build time only |
| CMS failure at build | Fails closed — the build throws rather than publishing a hollow article |

There were no error boundaries at all before this pass. Every page is
prerendered, but the masthead is a client component and a hydration failure
there would have shown a visitor the framework's unstyled error screen. Both
boundaries deliberately print no error message — a message can carry a path, a
stack frame or a dependency name, none of which helps the reader. They show the
digest instead, which is what Vercel's runtime logs key on.

No message was sent anywhere during testing. No external destination was
contacted.

## 7. SEO and indexation — GREEN

`npm run qa:seo` → **PASS across all 13 URLs.**

| Check | Result |
| --- | --- |
| Eleven currently indexed URLs | All 200, all paths unchanged |
| Canonicals | Every page points at `https://novraintelligence.com` + its own path |
| Canonical collisions | **None** — uniqueness asserted across all 13 |
| `noindex` | **None anywhere** — asserted per page |
| Titles / descriptions | Present and non-trivial on every page |
| Open Graph | title, description, url, image on every page; `og:type` `website`/`article` correctly |
| Twitter card | Present on every page |
| Structured data | Valid JSON on every page; 1 block on pages, 2 on articles |
| `sitemap.xml` | All 13 URLs, all on the canonical host, no off-host entries |
| `robots.txt` | Does not disallow; advertises the sitemap |
| Trailing slash | Unslashed URLs 308 to the slashed form — parity with WordPress |
| Soft 404 | None — missing pages return a real 404 |

**No redirects are required for the migration.** `trailingSlash: true` means the
frontend answers on exactly the paths WordPress serves. The two new URLs,
`/capabilities/` and `/global-development/`, are additive.

## 8. Monitoring — AMBER

**Nothing was enabled. No third-party analytics was added.** Full plan in
`docs/cutover-runbook.md` §7.

- **No new data flow:** deployment notifications (recommended), Vercel runtime
  logs and 4xx/5xx (already on), an external uptime check.
- **Vercel first-party but still visitor data:** Speed Insights (**recommended**
  — the lab LCP above needs field confirmation) and Web Analytics
  (**hold until a privacy notice is published**, given the European and
  institutional audience).
- **Third party, needs your approval:** Sentry and PostHog. Neither is justified
  by the current site — no forms, no auth, no transactions, no user content —
  and the browser SDKs would add to a 149 KB bundle. Recommended configurations
  and their privacy implications are in the runbook.
- **Form failure monitoring is not applicable.** There is no form.

## 9. Cutover and rollback — AMBER

Full runbook: `docs/cutover-runbook.md`. **No DNS was changed.**

**The most important finding of this pass, and it corrects the earlier plan:**

    domain_type ................................. domain_connection
    is_root_domain_registered_with_automattic ... false
    has_wpcom_nameservers ....................... false
    can_manage_name_servers ..................... false
    points_to_wpcom ............................. true
    a_records_required_for_mapping .............. 192.0.78.24, 192.0.78.25
    is_dnssec_enabled ........................... false
    ssl_status .................................. active
    domain_status ............... active, paid_until 2027-08-31, auto-renewing

The domain is **connected, not registered** at WordPress.com, and **does not use
WordPress.com nameservers**. The authoritative DNS zone lives at a third-party
registrar. The records WordPress.com holds are a dormant copy that is not in
effect, and its DNS write API refuses changes in this configuration anyway.

**So the cutover is performed at that external registrar** — not in WordPress,
not in Vercel. Which registrar, and the live records and TTLs, **could not be
determined from here**: egress to the domain is blocked and no resolver is
available. You hold that access.

Two consequences worth stating plainly:

1. **Export the live zone from the registrar before changing anything.** That
   export, not the table in the runbook, is the rollback artefact.
2. **Check for mail records.** The dormant copy has no MX, but it is dormant. If
   the live zone carries MX, SPF, DKIM or DMARC, they must survive the change.
   Repointing an apex without preserving mail records is how a cutover silently
   stops a company's email.

DNSSEC being off is genuinely good news — there is no DS record to coordinate.

Rollback is a DNS change and nothing else: restore the apex A records to
`192.0.78.24` / `192.0.78.25` and `www` to `CNAME novraintelligence.com.`, or
restore the saved export. Nothing was migrated out of WordPress — the frontend
only ever read from it, no content was deleted, no permalink changed, no media
moved — so the rollback loses nothing.

## 10. Positioning and claim discipline — GREEN

No claim was added, strengthened or implied in this pass. The content changes
were zero; everything above is headers, fonts, images, keyboard behaviour, error
boundaries and test scripts.

Standing state, re-confirmed:

- The `standing` note on `/capabilities/` and `/global-development/` is a
  **required field in the TypeScript type**, so a layout pass cannot quietly
  drop it.
- `/global-development/` states in its own voice that Novra has no contractual,
  partnership, vendor or advisory relationship with the IDB, World Bank Group,
  CDB, AfDB, CAF, the EU, or any other multilateral or government institution.
- The board's six unsupported counters are still not rendered. Panel C's
  research-area percentages (42/28/18/12) are still not rendered — five articles
  in one category cannot produce that split.
- The browser QA suite fails the build if any forbidden counter string appears
  on a page, so this is enforced rather than remembered.
- The one new number introduced anywhere is the reliability curve on
  `/capabilities/`, which is arithmetic on a stated assumption (0.99ⁿ) and says
  so in its own caption.

---

## Outstanding

| Item | Severity | Owner |
| --- | --- | --- |
| Hosted preview never fetched | AMBER — blocks the readiness claim | You (~10 min) |
| Screen-reader pass not performed | AMBER | You or an accessibility reviewer |
| Registrar unknown; live zone not enumerated | AMBER — blocks cutover | You |
| Monitoring not enabled | AMBER — decision, not a defect | You |
| Root dev-toolchain advisories | AMBER — accepted, unreachable | Revisit at next vitest upgrade |
| No SAST (e.g. CodeQL) | Low | Optional follow-up |
| Mobile LCP 2.3–2.7 s is lab-only | Low | Confirm with Speed Insights after cutover |
| Two throwaway Vercel projects from an earlier pass | Cosmetic | Safe to delete |
