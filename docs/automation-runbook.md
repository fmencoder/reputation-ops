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

**AUTH_SETUP_REQUIRED=YES**, but the manual parts are now automated. The
`oauth-bootstrap/` service performs the authorization-code exchange server-side,
so nobody copies a code, pastes a client secret into a browser tool, or POSTs to
the token endpoint by hand.

The existing WordPress.com application is `NOVRA Deployment Automation`,
client ID `147112`. Its client secret is human-held and must never be requested
in chat, printed, or committed.

1. In the Vercel project for `oauth-bootstrap`, set the four environment
   variables from `oauth-bootstrap/README.md`. The client secret goes in
   through Vercel's encrypted environment store.
2. Add the deployed callback URL as an **additional** Redirect URL on the
   WordPress application at <https://developer.wordpress.com/apps/>. Keep the
   existing one; WordPress supports several.
3. Open `/api/wordpress/oauth/start` in a browser and approve.
4. Copy the token from the one-time panel.

The bootstrap validates the token with a read-only call before showing it, and
refuses to display it at all if it reaches the wrong site.

**Delete the Vercel project once the token is stored.** See
`oauth-bootstrap/README.md` — including the one exposure this design cannot
close, which is that Vercel logs the callback request line containing the
single-use authorization code.

If the bootstrap is unavailable, the manual fallback still works: exchange at
`https://public-api.wordpress.com/oauth2/token` with
`grant_type=authorization_code`. The password grant fails when two-factor
authentication is on, which is expected rather than a misconfiguration.

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

## Canonical production ref

    CANONICAL_PRODUCTION_REF = claude/fredrick-mendez-reputation-ijjnbq

This is the repository's default branch and it carries the entire automation
layer. Every workflow trigger, and every commit an automated job makes, targets
`github.ref_name` — the ref the run checked out — never a hardcoded branch.

**`main` is not the production ref and must not be used as one right now.** It
sits at `8e60fd3`, four commits behind, and contains none of this: no workflows,
no `src/novra/`, no deployer, no launch state. Committing `site/wp-media.json`
to `main` would put deployment state on a branch that has none of the code that
produced it — a manifest with no exporter to read it, and an exporter on another
branch with no manifest.

That was the state of `novra-deploy.yml` before this correction: it triggered on
`push: branches: [main]` (where the workflow file does not exist, so it could
never fire) and pushed the manifest with `git push origin HEAD:main`. Fixed.

### Promoting `main` to canonical, when that is wanted

Not done here — it is a repository-topology decision, and this phase has an
un-launched site and an unresolved contact address. When you want it:

1. Confirm `main` has no commits the working branch lacks:

       git fetch origin
       git rev-list --left-right --count origin/main...origin/claude/fredrick-mendez-reputation-ijjnbq

   The current answer is `0  4` — `main` is strictly behind, so this is a
   fast-forward with nothing to lose.

2. Fast-forward `main`:

       git push origin origin/claude/fredrick-mendez-reputation-ijjnbq:main

   No force, no rebase, no history rewrite. If it is ever rejected as
   non-fast-forward, stop: something landed on `main` independently and needs
   looking at rather than forcing.

3. Change the default branch in GitHub Settings, then update the one trigger
   that names a branch:

       .github/workflows/novra-deploy.yml -> on.push.branches

   Everything else already follows `github.ref_name` and needs no edit.

4. Re-point the `production` and `launch` environments' branch restrictions at
   `main`.

Until all four are done, the working branch stays canonical.

---

## Daily commands

| Command | What it does | Writes to WordPress |
| --- | --- | --- |
| `npm run site:validate` | placeholders, policy, schema, links, alt text, headings, canonicals, front matter | no |
| `npm run site:visual-qa` | renders at every validated width and checks what pixel maths cannot | no |
| `npm run site:deploy:auth-check` | authenticate, probe capabilities, compute the plan — read-only client | no |
| `npm run site:deploy:dry-run` | full plan: assets to upload, pages to update, gates still open | no |
| `npm run site:deploy` | the real thing | yes |
| `npm run site:launch` | reports gate state | no |
| `npm run search:monitor` | one search snapshot plus the scoreboard | no |
| `npm run search:t0` | captures the baseline — possible once, ever | no |
| `npm run source:watch` | checks the three watched publisher pages | no |

---

## Deploying

Three modes, gated differently:

| Mode | Content gate | Writes | Answers |
| --- | --- | --- | --- |
| `auth_check` | **skipped** | none, enforced | do the credentials work, and what would happen |
| `dry_run` | full | none | the same plan through the ordinary deploy path |
| `deploy` | full, fail-closed | yes | the real thing |

    npm run site:deploy:auth-check  # first, once, to prove the token
    npm run site:deploy:dry-run
    npm run site:deploy

### Why `auth_check` skips the content gate

`site:validate` fails while `PLACEHOLDER_CONTACT_EMAIL` remains, and that is
correct — the site is not fit to publish. But "is the site fit to publish" and
"does the token authenticate" are different questions. Gating the second on the
first means the first live deployment attempt is also the first time anyone
finds out the token is wrong, which is the worst possible moment to discover it.

`auth_check` answers only the second question. It still runs the tests and the
typecheck, because a probe run from broken code is worth refusing. It still
prints the content blocker. It just does not treat a publishing blocker as a
reason to be unable to test a credential.

Its "no writes" claim is not a promise about what the code happens to call: the
client is wrapped by `readOnly()`, which replaces every write method with a
throw. A connectivity check that *can* write is a deployment with no gates in
front of it, so the capability is removed rather than left unused.

Nothing about the write path changed. `deploy` remains fail-closed behind full
validation and will refuse while any public-content placeholder remains.

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
| `novra-deploy.yml` | dispatch (3 modes), push to the canonical ref | `production` | WordPress + the manifest, on `github.ref_name` |
| `novra-launch.yml` | dispatch only, typed confirmation | `launch` | visibility, gated |
| `novra-search-monitor.yml` | daily 06:17 UTC | `search` | snapshots |
| `novra-source-watch.yml` | daily 07:41 UTC | **none** | the check ledger |

CI runs on `pull_request`, not `pull_request_target`, so a fork's code never sees
a secret. Deployment never runs from a pull request at all.

No workflow targets a hardcoded branch for a write. Every automated commit goes
to `github.ref_name`, so state lands on the ref it came from.

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
