# Removal decision matrix

Every path evaluated independently per cluster, per the amendment. Eligibility is
recorded as found, not as wanted. Nothing here is marked applicable in order to
create a path.

Verified 2026-08-30. Page-level inspection was not possible (egress blocked), so
fields depending on it are marked UNVERIFIED rather than guessed.

## Cluster map

| Cluster | Origin | Primary publisher | Derivatives | Resistance |
| --- | --- | --- | --- | --- |
| C1 | DOJ D. Colo. press release, Jan 2025 | justice.gov | Bloomberg Law, Hoodline, MoreLaw all trace here | MAXIMUM |
| C2 | Bloomberg Law article | news.bloomberglaw.com | Appears on two URL paths (us-law-week, white-collar-and-criminal-law) | HIGH |
| C3 | Hoodline article | hoodline.com | Category/tag pages UNVERIFIED | MODERATE |
| C4 | MoreLaw index entries | morelaw.com | Colorado fraud / forfeiture / interference index pages | LOW |
| C5 | Data-broker profiles | various | Not yet confirmed to exist for this subject | LOW |

C1 is the origin of everything else. C4 is the weakest derivative surface and is
therefore the first operational target, per the amendment's own ordering.

## Path evaluation

Values: YES / POSSIBLE / NO / AFTER_SOURCE_CHANGE / N/A

| Path | C1 DOJ | C2 Bloomberg | C3 Hoodline | C4 MoreLaw | C5 Brokers |
| --- | --- | --- | --- | --- | --- |
| Source removal | NO | POSSIBLE | POSSIBLE | POSSIBLE | YES |
| Voluntary/discretionary removal | NO | POSSIBLE (low) | POSSIBLE (moderate) | POSSIBLE (moderate) | YES |
| Editorial review | NO | POSSIBLE | POSSIBLE | POSSIBLE | N/A |
| Anonymization | NO | POSSIBLE (low) | POSSIBLE | POSSIBLE | N/A |
| Name redaction (body) | NO | POSSIBLE (low) | POSSIBLE | POSSIBLE | N/A |
| Title redaction | N/A — name not in title | POSSIBLE (low) | N/A — name not in title | UNVERIFIED | N/A |
| Noindex | NO | POSSIBLE (low) | POSSIBLE | POSSIBLE | N/A |
| Category/tag removal | NO | UNVERIFIED | UNVERIFIED | POSSIBLE — best single target | N/A |
| Duplicate consolidation | NO | POSSIBLE — two paths, one article | UNVERIFIED | POSSIBLE | N/A |
| Privacy removal | NO | NO | NO | NO | YES |
| Personal-information removal | NO — no qualifying PII found | NO | NO | NO | YES |
| Data-broker opt-out | N/A | N/A | N/A | N/A | YES |
| Factual correction | NO — none found | NO — none found | NO — none found | NO — none found | POSSIBLE |
| Snippet correction | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | N/A |
| Image removal | N/A — no images found | N/A | N/A | N/A | POSSIBLE |
| Copyright | NO — not our content | NO | NO | NO | POSSIBLE if own photo used |
| Platform policy | N/A | N/A | N/A | N/A | YES |
| Search-engine policy | NO | NO | NO | NO | POSSIBLE |
| Stale content | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE |
| Suppression | YES | YES | YES | YES | YES |

## Search-engine eligibility

| Cluster | Google | Bing | Basis |
| --- | --- | --- | --- |
| C1–C4 | NO | NO | Google's personal-information removal covers doxxing combinations, explicit imagery, and financial/medical/government-ID data. It carves out content of public interest and newsworthy reporting. An accurate court-derived account of a federal conviction falls in the carve-out, not the policy. Bing's policy is materially similar. |
| C1–C4 outdated-content tool | AFTER_SOURCE_CHANGE | AFTER_SOURCE_CHANGE | The tool exists for pages that have already changed or gone. These pages are live and unchanged. It becomes genuinely available the moment a publisher acts. |
| C5 | POSSIBLE | POSSIBLE | Depends entirely on what a given broker profile actually exposes. Assess per profile. |

No entry above was marked eligible to open a path. Where the honest answer is NO,
submitting anyway would be a false submission, which §10 of the amendment
prohibits and which would also jeopardise every legitimate request alongside it.

## Watchers

`AFTER_SOURCE_CHANGE` is a real state, not a euphemism for closed. The monitoring
built in commit bf21afc already detects the qualifying trigger: `computeDeltas`
emits `dropped_out`, and rank/title changes surface per scan. If any publisher
acts on the requests below, the outdated-content route opens legitimately and the
evidence is already captured.

This is the honest version of the deindex track. It arms itself off a real
source change rather than asserting one.

## Priority order

1. **C4 MoreLaw** — weakest surface, aggregated index entries, no dedicated
   article, most likely to be quietly cleaned up on request.
2. **C5 data brokers** — the only cluster where the subject has a clear
   entitlement rather than a request. Highest certainty of success.
3. **C3 Hoodline** — aggregator rewrite of a government release; lighter
   editorial attachment than a trade publication of record.
4. **C2 Bloomberg Law** — high authority, publication of record, low probability.
   Worth one professional request, not a campaign.
5. **C1 DOJ** — suppress and monitor. No inaccuracy found to correct.
