# Novra Intelligence — cutover and rollback runbook

Prepared 2026-09-19. **No DNS record was changed. No production system was
touched.** This is the plan, not a record of work done.

---

## 1. Where the DNS actually lives

This is the single most important fact in this document, and it is not what the
earlier plan assumed.

Queried through the WordPress.com account API on 2026-09-19:

| Field | Value | What it means |
| --- | --- | --- |
| `domain_type` | `domain_connection` | The domain is **connected**, not registered at WordPress.com |
| `is_root_domain_registered_with_automattic` | `false` | The registrar is a third party |
| `has_wpcom_nameservers` | `false` | **The authoritative DNS zone is not at WordPress.com** |
| `can_manage_name_servers` | `false` | Nameservers can only be changed at that registrar |
| `can_manage_dns_records` | `true` | A WordPress.com zone exists, but it is dormant |
| `points_to_wpcom` | `true` | The live records currently resolve to WordPress.com |
| `a_records_required_for_mapping` | `192.0.78.24`, `192.0.78.25` | The apex IPs that map it to WordPress.com |
| `ssl_status` | `active` | Certificate currently issued |
| `is_dnssec_enabled` | `false` | No DS record to coordinate — this makes the cutover simpler |
| `domain_status` | `active`, `paid_until` 2027-08-31, auto-renewing | Not expiring during the cutover window |

**Consequence: the cutover is performed at the external registrar, not in
WordPress.com and not in Vercel.** Changing records through the WordPress.com
tools would edit a zone that is not in effect and would change nothing, and the
API refuses such writes anyway when `has_wpcom_nameservers` is false.

**Superseded 2026-09-19, corrected here.** This section originally said the
authoritative zone could not be read from this environment. That was wrong:
HTTPS egress to the domain is blocked by policy, but the system resolver on
UDP/53 is not, and the zone was subsequently read directly from its own
nameservers. `docs/dns-authoritative-snapshot.md` holds that reading and is the
authority; the dormant WordPress.com copy below is kept only for contrast.

What is now known: DNS is hosted at **Cloudflare** (`ulla.ns.cloudflare.com`,
`igor.ns.cloudflare.com`), the apex records are **DNS-only, not proxied**, and
**every record the cutover touches already has a TTL of 300**. Re-verified
2026-09-22 — unchanged.

Still not determinable from here: which **registrar** holds the domain. That
only matters if nameservers change, and this cutover does not change them.

**Take a full export of the live zone from Cloudflare before step 1.** That
export — not any table in this document — is the rollback artefact.

### Records WordPress.com holds (dormant copy)

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `novraintelligence.com.` | A | `192.0.78.24`, `192.0.78.25` (protected/default) | — |
| `www` | CNAME | `novraintelligence.com.` | 14400 |
| `_domainconnect` | TXT | `public-api.wordpress.com/rest/v1.3/domain-connect` | 3600 |

**Take a full export of the live zone from the registrar before step 1.** That
export — not this table — is the rollback artefact.

---

## 2. TTL preparation — not required

**This step is no longer needed, and doing it would only cost a wait.**

It was written when the authoritative TTLs were unknown and the only visible
value was the 14400 on WordPress.com's dormant `www` CNAME. Reading the live
zone settled it: the apex `A` records and the `www` record are already at
**TTL 300**. Re-verified 2026-09-22.

So there is nothing to lower and no old TTL to wait out. Rollback propagates in
about five minutes.

1. Confirm at Cloudflare that the apex `A` and `www` records still read TTL 300.
2. If either has been raised since, lower it to 300 and **wait out the previous
   value** before cutting over — lowering a TTL does not take effect until the
   old one has expired from resolver caches, and that is the step whose absence
   is discovered during a rollback that will not propagate.
3. After the site has been stable for 48 hours, raising the TTL to 3600 is
   optional housekeeping.

---

## 3. Before touching DNS

- [ ] Preview reviewed and approved by the founder.
- [ ] `novraintelligence.com` and `www.novraintelligence.com` added to the
      `novra-intelligence-web` Vercel project. Vercel then **displays the exact
      records to create.** Use those values. Do not use values from memory or
      from this document — Vercel's recommended apex record has changed over
      time and the dashboard is the only current source.
- [ ] A production deployment promoted on that project and verified on its
      `.vercel.app` production URL, before any DNS points at it.
- [ ] Full zone export saved from the registrar.
- [ ] TTLs lowered and the old TTL waited out (§2).
- [ ] Confirm whether anything else uses the domain — **email in particular.**
      There are no MX records in the WordPress.com copy, but that copy is
      dormant; if the live zone has MX, SPF, DKIM or DMARC records, they must
      be carried across unchanged. Repointing an apex without preserving mail
      records is how a cutover silently stops a company's email.

---

## 4. Cutover

Performed at the external registrar.

1. Change the apex `A` records from `192.0.78.24` / `192.0.78.25` to the value
   Vercel displays. If the registrar supports `ALIAS`/`ANAME` at the apex,
   prefer it over `A` — it follows Vercel's address if it changes.
2. Change `www` to the CNAME target Vercel displays.
3. Leave every other record alone — MX, SPF, DKIM, DMARC, TXT verification
   records, and anything on a subdomain.
4. Watch Vercel until certificate issuance for both names completes. Do not
   proceed while it is pending.

## 5. Post-cutover smoke test

Run against `https://novraintelligence.com` — not the preview.

**The eleven URLs that must not break.** Each must return 200 with a canonical
tag pointing at its own `https://novraintelligence.com` address:

- [ ] `/`
- [ ] `/insights/`
- [ ] `/research/`
- [ ] `/technology/`
- [ ] `/about/`
- [ ] `/contact/`
- [ ] `/2026/08/31/recoverability-architecture/`
- [ ] `/2026/08/31/human-oversight-architecture/`
- [ ] `/2026/08/31/deterministic-boundaries-ai-smart-contracts/`
- [ ] `/2026/08/31/context-engineering-production-ai/`
- [ ] `/2026/08/31/agentic-ai-reliability-budget/`

**Then:**

- [ ] `/capabilities/` and `/global-development/` return 200.
- [ ] `https://www.novraintelligence.com/` reaches the site.
- [ ] A URL without its trailing slash 308-redirects to the slashed form.
- [ ] `/no-such-page/` returns a real **404**, not 200.
- [ ] `/robots.txt` and `/sitemap.xml` return 200, and the sitemap lists 13 URLs
      on the canonical host.
- [ ] Response headers carry CSP, HSTS, `X-Content-Type-Options`,
      `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and no
      `X-Powered-By`.
- [ ] No browser console errors on the homepage.
- [ ] Hero image, capability icons and the world map all render.
- [ ] Mobile menu opens, closes on Escape, and its links navigate.
- [ ] Re-submit `sitemap.xml` in Search Console; watch coverage for two weeks.

The first five groups can be driven by the repository's own suites against the
live host:

    cd frontend
    npm run qa:seo      -- --base https://novraintelligence.com
    npm run qa:browser  -- --base https://novraintelligence.com
    npm run qa:a11y     -- --base https://novraintelligence.com
    npm run qa:keyboard -- --base https://novraintelligence.com
    npm run qa:csp      -- --base https://novraintelligence.com

`qa:seo` asserts the canonical host, so it is the one that proves URL parity.

## 6. Rollback

Rollback is a DNS change and nothing else, because nothing was migrated out of
WordPress: the frontend only ever read from it, no content was deleted, no
permalink changed, no media moved.

1. At the registrar, restore the apex `A` records to `192.0.78.24` and
   `192.0.78.25`, and `www` to `CNAME novraintelligence.com.` — or restore the
   saved zone export wholesale, which is preferable because it also restores
   anything this runbook did not anticipate.
2. With TTL at 300, expect resolution within minutes.
3. Confirm the eleven URLs resolve against WordPress again.
4. Detach the domain from the Vercel project so it cannot re-acquire the
   certificate or the traffic.

**WordPress stays running and unmodified until the new site has been stable for
at least two weeks.** It is both the rollback target and still the CMS this
frontend reads at build time. Do not delete it, do not change its visibility,
do not remove its content, and do not cancel the domain connection
subscription — that last one would take the mapping down independently of DNS.

---

## 7. Monitoring plan

Nothing was enabled. This is the recommendation, split by whether it introduces
a new third-party data flow.

### Available without a new third party

| Capability | Where | Notes |
| --- | --- | --- |
| Build and deployment health | Vercel, already on | Every deployment reports state; failures surface in the dashboard and in GitHub checks |
| Runtime logs, 4xx/5xx | Vercel runtime logs, already on | Retention depends on plan; enough for incident triage, not for trend analysis |
| Deployment notifications | Vercel project settings | Email/Slack on failed deployment. **Recommended, no new data flow** |
| Uptime | External checker against `/` and one article URL | Any provider; a 5-minute interval is sufficient for a content site |

### Vercel first-party, but still visitor data collection

| Product | What it adds | Privacy implication |
| --- | --- | --- |
| Vercel Web Analytics | Page views, referrers, countries | Cookieless and IP-anonymised by Vercel's description, but it is still per-visitor collection and belongs in a privacy notice |
| Vercel Speed Insights | Real-user Core Web Vitals | Same. It is the only way to learn what LCP real visitors see, as opposed to the lab numbers in this report |

**Recommendation: enable Speed Insights, hold Web Analytics** until there is a
published privacy notice. The site's stated audience is European and
institutional; a public body reviewing it will look for one.

### Third party — not enabled, needs approval

| Service | Recommended configuration if approved | Privacy implication |
| --- | --- | --- |
| Sentry | Error monitoring only. `sendDefaultPii: false`, `tracesSampleRate: 0`, release tagging on the commit SHA, server-side only if possible | Error payloads can carry URLs and user agents. The browser SDK also adds ~30KB to a bundle currently at 149KB |
| PostHog | Product analytics. EU cloud region, autocapture **off**, session recording **off**, cookieless persistence | Session recording on a site with no login is almost all downside; autocapture records interactions indiscriminately |

Neither is justified by the current site: there are no forms, no authentication,
no transactions, and no user-generated content. The error boundary added in this
pass logs to the console with a digest that matches Vercel's runtime logs, which
covers triage without a new processor.

### What to watch, whatever is chosen

| Signal | Threshold | Action |
| --- | --- | --- |
| Uptime | Any failed check | Investigate; roll back if the cause is the cutover |
| 5xx rate | Any sustained 5xx | Static pages should never 5xx; treat as a deployment fault |
| 404 rate | A rise after cutover | Almost certainly a lost URL — compare against the eleven above |
| Deployment state | Any `ERROR` | The branch is not deployable; do not promote |
| Core Web Vitals | LCP p75 above 2.5s on mobile | The lab numbers here are 2.3–2.7s; real-user data is the one that counts |
| Form failures | **Not applicable** | There is no form. Contact is a `mailto:` link, so there is no submission to fail and no endpoint to monitor |
