# REPUTATION-OPS — STATUS REPORT

Subject: Fredrick Mendez
Date: 2026-08-30
Branch: claude/fredrick-mendez-reputation-ijjnbq
Commits: bf21afc, 5f02cb9 (both LOCAL ONLY — push blocked)

---

## 1. EXECUTIVE SUMMARY

Two tracks delivered: search-visibility monitoring (built, tested, not yet run
live) and owned-property content (calendar plus two fact-checked drafts).

Two findings changed the plan materially:

- The MoreLaw correction premise — the strongest item in the original brief —
  does not hold. No source says "found guilty."
- The removal, deindexing and outreach tracks were not built. Reasons in §6.

Four blockers are outstanding, one of them urgent (§7).

---

## 2. TRACK STATUS

| Track | Status | Notes |
| --- | --- | --- |
| A — Removal | NOT BUILT | See §6 |
| B — Correction | CLOSED | Premise disproved, §4 |
| C — Anonymize / noindex | NOT BUILT | See §6 |
| D — Deindexing | NOT BUILT | See §6 |
| E — Suppression (content) | DELIVERED | §5 |
| F — Monitoring | BUILT, NOT RUN | Blocked on SerpApi key |

---

## 3. VERIFIED RECORD

Consistent across every reachable source:

- Fredrick Mendez, 45, of Boca Raton, Florida.
- PLEADED GUILTY to wire fraud. Prosecuted by the U.S. Attorney's Office for the
  District of Colorado; announced January 2025.
- Sentenced to 41 months, three years supervised release, restitution of
  $1,589,565.75.
- Conduct: fraudulent EIDL and PPP applications, March 2020 to November 2021,
  submitted for several entities with false statements about employee counts,
  gross revenues and cost of goods sold.

---

## 4. FINDING: THE CORRECTION PREMISE DID NOT HOLD

The brief hypothesized that MoreLaw states "found guilty" where the record shows
a guilty plea, and made that the lead correction target.

NO SOURCE FOUND SAYS "FOUND GUILTY." DOJ, Bloomberg Law, Hoodline and MoreLaw's
own indexed text all describe a guilty plea. No dedicated MoreLaw page for the
subject surfaced at all — only Colorado practice-area index pages carrying a
syndicated DOJ summary.

A correction request asserting an error the evidence contradicts would be a false
statement to a publisher. None was drafted.

Near-miss, not an error: MoreLaw's index text references "more than $3.3 million"
in fraudulent loans against DOJ's $1,589,565.75 restitution figure. These measure
different things (loan value vs. ordered restitution) and are not inconsistent.

---

## 5. DELIVERABLES

### Commit bf21afc — Search-visibility monitoring

TypeScript. Typecheck clean, 17 tests passing against a stubbed client.

- Query set builder — name and locale based only, no offence-term probes.
- URL normalization — collapses scheme, www, tracking params, AMP and param
  order so one article seen on three engines is one tracked row.
- Classification — sentiment plus who controls the page; government domains
  marked as public record and never treated as actionable.
- Rank diffing — reports dropped-out results rather than dropping them.
- Share-of-voice — the headline progress metric.
- SerpApi client — client-side rate limiting, disk cache, retry on 429/5xx only,
  so an invalid key surfaces immediately instead of burning budget.
- Markdown control reports; Supabase migration written (not applied).

### Commit 5f02cb9 — Editorial calendar and article drafts

Architecture: one pillar, four clusters, twelve pieces at one per two weeks.
The slow cadence is deliberate — two strong pieces a month reads as a body of
work; twenty thin ones reads as a content farm.

Drafted and fact-checked:

- 001 Agentic AI reliability budget (pillar). Every figure verified
  computationally: 0.99^50 = 60.5%, 0.999^50 = 95.1%, 0.995^50 = 77.8%.
- 004 EU AI Act timeline shift (governance). Dates verified 2026-08-30. The
  widely-cited "high-risk obligations, August 2026" is NOW WRONG: Digital
  Omnibus amendments defer Annex III standalone high-risk to 2027-12-02 and
  Annex I embedded to 2028-08-02. Would have been published stale from memory.
- 000 Author page — TEMPLATE WITH PLACEHOLDERS, not generated copy. Every field
  is a checkable factual claim; an invented credential there is worse than no
  page at all. Subject fills in role, background and sameAs profiles.

No draft makes any claim about the author's background. No BuildFlow reference
anywhere (BUILDFLOW_PUBLIC_DISCLOSURE=false respected).

---

## 6. NOT BUILT, AND WHY

Removal, deindexing, anonymization and escalation machinery.

1. Not removable. A DOJ press release is a government public record. Bloomberg
   Law and Hoodline report accurately from it.
2. Deindexing would not apply. Google and Bing stale-content removal is for pages
   that changed or went away. These are live and accurate; submitting them would
   mean filing false claims with a search engine.
3. The public interest runs the other way. A fraud conviction is what a
   counterparty, lender or employer is checking for.

Plainly: there is no mechanism that makes an accurate federal fraud conviction go
away. What moves a name's first page over time is real, substantive, indexable
material the subject owns, accumulating authority. That is slow, it may never
displace a Bloomberg Law result, and it is the honest version of this project.
The monitoring built here measures whether it is working.

---

## 7. BLOCKERS

| # | Blocker | Effect | Fix |
| --- | --- | --- | --- |
| 1 | Claude GitHub App not installed on fmencoder/reputation-ops. Push returns 403. | URGENT. Two commits are local only and will be LOST when this container is reclaimed. | github.com/apps/claude/installations/select_target |
| 2 | SERPAPI_API_KEY rejected as invalid | No live scan has run. Post-publication rank monitoring cannot run. | Valid key in .env |
| 3 | WordPress site discovery disabled — wpcom-user-sites and wpcom-ai-agent-sites-list both off; all account operations off | Cannot identify the target site. Will not guess an identifier. | Send site URL or blog ID, or enable wpcom/user-sites at wordpress.com/me/mcp |
| 4 | Web egress blocked except package registries | No page inspection: no robots, canonical, noindex or HTTP status checks | Environment network policy |
| 5 | No dedicated Supabase project (only unrelated BuildFlow AI projects) | Migration written, not applied | Create a dedicated project |

Also note: WordPress settings.update and theme.set are disabled, so site-level
SEO changes will need to be made manually. They will be listed precisely.

---

## 8. NEXT ACTIONS

Blocked on you:

1. Install the GitHub App so the work persists. Most urgent item here.
2. Send the WordPress site URL or blog ID.
3. Supply a valid SerpApi key.
4. Fill in the author page template fields.

Unblocks immediately on receipt of the site ID:

5. SEO audit via settings.get, plugin.list, activity.get, statistics.get.
6. Theme presets via site-editor context.
7. Both articles created as drafts with schema and internal links wired.
8. A single publish confirmation surfaced, not one per post.

---

## 9. METRICS

EXECUTED = monitoring track built and tested; content calendar and 2 drafts
DISCOVERED = 4 surfaces carrying the story, plus 1 unverified FINRA record
REMOVED = 0
ANONYMIZED = 0
NOINDEXED = 0
CORRECTED = 0 (premise disproved)
DEINDEX_READY = 0
OUTREACH_SENT = 0
FOLLOWUPS_SCHEDULED = 0
POSITIVE_ASSETS_IMPROVED = 0 published, 3 prepared
BLOCKED_ACTIONS = 5 (see §7)

---

## 10. SOURCES

- DOJ, District of Colorado: justice.gov/usao-co/pr/florida-man-sentenced-41-months-stealing-covid-19-relief-funds
- Bloomberg Law: news.bloomberglaw.com/us-law-week/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds
- Hoodline: hoodline.com/2025/01/boca-raton-man-sentenced-to-over-3-years-for-fraudulently-obtaining-covid-19-relief-funds/
- MoreLaw Colorado Fraud Law: morelaw.com/colorado/law/fraud.asp
- EU AI Act: digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- NIST AI RMF Core: airc.nist.gov/airmf-resources/airmf/5-sec-core/
