# NOVRA automation runbook

One page. Everything operational lives here; `site/DEPLOY.md` keeps the
WordPress-specific detail and `docs/visual-reference/README.md` keeps the asset
pipeline.

## The principle

    Claude creates
    GitHub validates
    deterministic code deploys
    automated QA verifies
    humans approve only irreversible or identity-sensitive actions

Deployment does not depend on an MCP connector being enabled in a particular
chat. That dependency is what this layer exists to remove: the connector was
authenticated at the account level and still unavailable in three consecutive
sessions because it was toggled off for the chat. MCP stays useful as an
interactive administrative path; it is no longer the only path.

---

## One-time setup

### 1. WordPress access token

**AUTH_SETUP_REQUIRED=YES.** This cannot be automated: it needs a person signed
in to the WordPress.com account.

1. Create an application at <https://developer.wordpress.com/apps/>. The
   redirect URL can be any URL you control; it is not used at runtime.
2. Exchange credentials for a token:

       curl -X POST https://public-api.wordpress.com/oauth2/token \
         -d client_id=YOUR_CLIENT_ID \
         -d client_secret=YOUR_CLIENT_SECRET \
         -d grant_type=password \
         -d username=YOUR_WPCOM_LOGIN \
         -d password=YOUR_WPCOM_PASSWORD

   **If two-factor authentication is on, this grant fails** — that is expected,
   not a misconfiguration. Use the authorization-code flow instead: open
   `https://public-api.wordpress.com/oauth2/authorize?client_id=…&redirect_uri=…&response_type=code`,
   approve, and exchange the returned `code` at the same token endpoint with
   `grant_type=authorization_code`.
3. WordPress.com access tokens do not expire on a fixed schedule, so this is a
   one-time step until the token is revoked.

The client ID and secret are **not** stored as repository secrets. They are
needed only to mint the token, and storing them would widen the blast radius of
a leak for no operational benefit.

### 2. GitHub secrets — names only

| Secret | Environment | Used by |
| --- | --- | --- |
| `NOVRA_WP_SITE` | `production`, `launch` | site ID or domain, e.g. `novraintelligence.com` |
| `NOVRA_WP_ACCESS_TOKEN` | `production`, `launch` | the bearer token from step 1 |
| `SERPAPI_API_KEY` | `search` | search monitor only |

Three secrets, in three environments, scoped to the workflows that need them.
The CI workflow — the only one a pull request can trigger — has none, so a fork's
code cannot reach any of them.

### 3. Additional CSS

`site/novra.css` is the only production CSS artifact. Paste the whole file into
**Appearance → Customize → Additional CSS**. Do not paste `tokens.css` and
`components.css` separately: `novra.css` is their merged build and carries
hardening they do not have.

The deployer probes the WordPress.com Custom CSS API and reports which regime
applies:

- `CSS_STRATEGY=api-managed` — the API answered; the deployer compares the
  installed stylesheet's hash against the repository's.
- `CSS_STRATEGY=manual-gate` — the API is unavailable for this site; install by
  hand once, and the recorded hash is how later runs verify it.

Either way it is never *assumed* installed. `CSS_INSTALLED` closes only on a
hash comparison.

---

## Daily commands

| Command | What it does | Writes to WordPress |
| --- | --- | --- |
| `npm run site:validate` | placeholders, policy, schema, links, alt text, headings, canonicals, front matter | no |
| `npm run site:visual-qa` | renders at every validated width and checks what pixel maths cannot | no |
| `npm run site:deploy:dry-run` | full plan: assets to upload, pages to update, gates still open | no |
| `npm run site:deploy` | the real thing | yes |
| `npm run site:launch` | reports gate state | no |
| `npm run search:monitor` | one search snapshot plus the scoreboard | no |
| `npm run search:t0` | captures the baseline — possible once, ever | no |
| `npm run source:watch` | checks the three watched publisher pages | no |

---

## Deploying

    npm run site:deploy:dry-run     # always first
    npm run site:deploy

What a real run does, in order:

1. Authenticates and confirms which site the token points at.
2. Hashes every referenced asset and uploads only what changed. An unchanged
   asset is never re-uploaded — a duplicate Media Library object gets its own
   URL and silently invalidates the one already embedded in a page.
3. Records the returned media IDs and URLs in `site/wp-media.json`. **Nothing is
   written there that WordPress did not return.**
4. Rewrites `/assets/…` references to those URLs. An unmapped asset skips its
   page rather than deploying a broken image.
5. Updates the existing page for each slug. It never creates a second page for a
   slug that exists: a duplicate competes with the original in search, which is
   the opposite of the point.
6. **Reads the stored content back and diffs it structurally.** Not optional.
   `_content_warnings` reports stripped elements inconsistently and stripped CSS
   properties not at all — which is how `inset` vanished from a deployed page
   with no signal of any kind.
7. Emits `site/deploy-report.json` with a component state for every stage.

It never changes site visibility.

### If `<picture>` does not survive

The deployer handles this itself, once:

    deploy primary -> read back -> <source> missing?
      -> deploy the dual-<img> fallback -> read back again -> report

The fallback markup is derived from the same `<picture>` source, so the two
forms cannot drift. **Maximum one automatic attempt.** If neither survives, that
is a finding for a person, not a loop to keep retrying.

### If read-back fails

`DEPLOYMENT_STATUS=FAILED_QA`. The deployer restores the previous content when
it captured it and can verify the restore; otherwise it stops and prints exactly
what to do. A rollback that cannot be checked is a second uncontrolled write on
top of a failed one.

---

## Launching

Launch is a separate workflow because it is the one irreversible action here.

Required gates, all in `site/launch-state.json`:

    CONTACT_EMAIL_CONFIRMED   human
    HUMAN_LAUNCH_APPROVAL     human
    CSS_INSTALLED             machine — hash comparison against the live site
    T0_CAPTURED               machine — baseline snapshot exists
    MEDIA_SYNC_COMPLETE       machine — every referenced asset is mapped
    CORE_PAGES_DEPLOYED       machine — read-back verified
    FINAL_QA_PASS             machine — live responsive and accessibility QA

Automation writes machine gates from evidence it verified in the same run. It
**cannot** write a human gate: `applyAutomationUpdates()` drops any attempt, and
`mayLaunch()` additionally rejects a `HUMAN_LAUNCH_APPROVAL` whose `setBy` is
`automation`. That is enforcement in code, not a convention.

    npm run site:launch              # report
    npm run site:launch -- --execute # only if every gate is closed

`--execute` currently stops and prints instructions rather than writing the
visibility setting. That is deliberate: this deployer has never exercised a
WordPress.com visibility write against a real site, and an unverified write to
the one irreversible setting is exactly what the gates exist to prevent.

---

## Search baseline and monitoring

    npm run search:t0        # once, ever
    npm run search:monitor   # daily, via novra-search-monitor.yml

Five fixed queries across Google and Bing, so snapshots stay comparable.

**T0 is immutable.** The write is refused if it already exists, before a single
API credit is spent, and a capture with any failed query is refused as a
baseline. A baseline reconstructed after intervention is not a baseline.

**Identity is resolved before sentiment.** A result containing the exact name is
not evidence that the result is about the subject — there are 400+ people under
the "Frederick" spelling alone. Unresolved results are recorded `UNKNOWN` and
counted separately. They are never distributed into the other buckets: a
scoreboard that resolves ambiguity in the subject's favour reports progress that
did not happen.

The monitor observes. It does not generate pages in response to rankings and it
submits nothing to any search engine.

---

## Source watch

    npm run source:watch     # daily, via novra-source-watch.yml

Watches the three canonical URLs recorded in this repository, Bloomberg Law's
two paths included. Records HTTP status, canonical, robots meta, subject-name
occurrence count and a content hash — enough to prove a material change and date
it, and not a copy of a copyrighted article.

**Only the live page counts.** An acknowledgement, a ticket number, a "we're
reviewing it" — none of those is a source change.

What it will never do:

- File a search-engine removal or outdated-content report. That asserts a live
  page no longer matches its index; the assertion is the user's to make. The
  watch prepares the URL and the evidence and sets an eligibility flag.
- Send a follow-up. The window is 2026-09-07 to 2026-09-10 and one substantive
  follow-up only; the watch flags `FOLLOWUP_DUE=YES` and sends nothing.
- Anything involving a broker opt-out beyond queue state. Those need CAPTCHA,
  email, phone or identity verification, and defeating any of those is out of
  scope permanently, not pending.

---

## Workflows

| File | Trigger | Secrets | Writes |
| --- | --- | --- | --- |
| `novra-ci.yml` | push, PR | **none** | nothing |
| `novra-deploy.yml` | dispatch, push to main | `production` | WordPress + the manifest |
| `novra-launch.yml` | dispatch only, typed confirmation | `launch` | visibility, gated |
| `novra-search-monitor.yml` | daily 06:17 UTC | `search` | snapshots |
| `novra-source-watch.yml` | daily 07:41 UTC | **none** | the check ledger |

CI runs on `pull_request`, not `pull_request_target`, so a fork's code never sees
a secret. Deployment never runs from a pull request at all.

Actions from the `actions/` org are referenced at their major tag. Pinning each
to a verified commit SHA is stricter and worth doing — verify the SHAs yourself
rather than trusting ones transcribed from memory.

---

## Rollback

`site/deploy-report.json` carries a rollback record per page: the previous raw
content and status, captured before the write. Restores are attempted only when
the restore itself is verifiable. Uploaded media is never deleted during a
rollback — a media object may already be referenced elsewhere, and an
unreferenced file costs nothing next to a page full of broken images.
