# Findings

## Verified record

Consistent across every source reachable from this environment:

- **Fredrick Mendez**, 45, of Boca Raton, Florida.
- **Pleaded guilty** to wire fraud. Prosecuted by the U.S. Attorney's Office for
  the District of Colorado; announced January 2025.
- Sentenced to **41 months**, three years supervised release, restitution of
  **$1,589,565.75**.
- Conduct: fraudulent EIDL and PPP applications submitted March 2020 – November
  2021 on behalf of several entities, with false statements about employee
  counts, gross revenues and cost of goods sold.

## The correction premise did not hold

The original brief hypothesized that MoreLaw states "found guilty" where the
authoritative record shows a guilty plea, and treated that as the lead
correction target.

**No source found says "found guilty."** Every retrievable source — the DOJ
release, Bloomberg Law, Hoodline, and MoreLaw's own indexed text — describes a
guilty plea. No dedicated MoreLaw page for this subject surfaced at all; only
Colorado practice-area index pages carrying a syndicated summary.

A correction request asserting an error that the evidence contradicts would be a
false statement to a publisher. None was drafted.

One figure is worth noting but is not an error: MoreLaw's index text references
"more than $3.3 million" in fraudulent loans, while the DOJ release states
restitution of $1,589,565.75. Those measure different things — attempted or
obtained loan value versus ordered restitution — and are not inconsistent on
their face.

## Footprint

Small and stable. Four surfaces carry the story:

| Surface | Nature | Notes |
| --- | --- | --- |
| justice.gov (D. Colo.) | Government press release | Public record. Not removable. |
| Bloomberg Law | Trade press | Accurate; sourced from DOJ. |
| Hoodline | Local aggregator | Accurate; sourced from DOJ. |
| MoreLaw | Case-index aggregator | Category pages only; no dedicated page found. |

A FINRA BrokerCheck entry also appears for the name. Whether it is the same
individual was not established. Regulatory records of that kind are not
removable by request in any case.

## Why the removal and deindexing tracks were not built

The content is an accurate account of a recent federal fraud conviction. Three
things follow:

1. **It is not removable.** A DOJ press release is a government public record.
   Bloomberg Law and Hoodline report accurately from it. Requests would fail,
   and volume outreach with an escalation cadence would fail more visibly.
2. **Deindexing tooling would not apply.** Google and Bing stale-content removal
   exists for pages that have actually changed or gone. These pages are live and
   accurate; submitting them would be submitting false claims to a search engine.
3. **The public interest runs the other way.** A fraud conviction is precisely
   what a counterparty, lender or employer is checking for. Suppressing it moves
   risk onto people who have no way to price it.

## What does work

Time and legitimate presence. The conviction is roughly 19 months old as of this
writing. What durably changes a name's first page is real, substantive, indexable
material the subject actually owns — a genuine professional site, complete
profiles, real work, published under the real name — accumulating authority.

That is slow, it is not guaranteed to displace a Bloomberg Law result, and it is
the honest version of this project. The monitoring in this repository measures
whether it is working: see the share-of-voice metric in each report.

## Blockers

| Blocker | Effect |
| --- | --- |
| `SERPAPI_API_KEY` rejected as invalid | No live scan has run. |
| Web egress blocked except package registries | No direct page inspection possible. |
| No dedicated Supabase project | Migration written, not applied. |
