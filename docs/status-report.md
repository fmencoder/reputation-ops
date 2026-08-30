# REPUTATION-OPS — STATUS REPORT

Subject: Fredrick Mendez
Date: 2026-08-30
Branch: claude/fredrick-mendez-reputation-ijjnbq
Cycle: 2 (aggressive lawful mode)

---

## 1. EXECUTION METRICS

COMMITS = 4 (bf21afc, 5f02cb9, ebf8a6f, 24f8b02)
PUSH_STATUS = BLOCKED (403, GitHub App not installed) — all work is local only
LIVE_SERP_SCAN = NOT RUN (SerpApi key invalid)
UNIQUE_RESULTS = 6 surfaces identified
NEGATIVE_TOP10 = UNMEASURED (no live scan)
NEGATIVE_TOP20 = UNMEASURED
DUPLICATE_CLUSTERS = 5 (C1–C5); Bloomberg Law confirmed on 2 URL paths
REMOVAL_REQUESTS_READY = 3
REMOVAL_REQUESTS_SENT = 0 (SEND_BLOCKED_BY_TOOLING — no email capability)
ANONYMIZATION_REQUESTS = 3 (embedded as fallback ladder in each draft)
NOINDEX_REQUESTS = 3 (same)
PRIVACY_PATHS = 0 on C1–C4 (no qualifying PII); 5 broker opt-outs available
CORRECTION_PATHS = 0 (no inaccuracy found on any surface)
DEINDEX_READY = 0
DEINDEX_WATCHERS = ARMED (existing monitor detects the qualifying trigger)
WORDPRESS_STATUS = MCP SERVER DISCONNECTED this cycle
SITE_BUILD_STATUS = BLOCKED
ARTICLES_DRAFTED = 2 + 1 author template
ARTICLES_PUBLISHED = 0
POSITIVE_TOP10 / TOP20 / SHARE_OF_VOICE = UNMEASURED
BLOCKERS = 5
HUMAN_DECISIONS_REQUIRED = 3

---

## 2. NEW THIS CYCLE

### Discovery expanded past the known four

- Business entities named in the case: SkyWorth Technical Solutions Inc.,
  Northern Technology Inc., Acumen Energy Group Inc., Acumen Holding Group LLC.
- Apparent owned LinkedIn profile (Fredrick Mendez, MBA — Acumen Capital Group).
- Bloomberg Law article confirmed on two URL paths — a real duplicate surface.
- Heavy same-name noise: 400+ LinkedIn profiles under "Frederick Mendez" alone.
- FINRA BrokerCheck record exists; NOT established as the same individual.

### Removal decision matrix (docs/removal-matrix.md)

All 20 paths evaluated per cluster. Priority order runs weakest-surface-first, as
the amendment directs: MoreLaw index entries, then data brokers, then Hoodline,
then Bloomberg Law, with DOJ as suppress-and-monitor.

Search-engine eligibility resolves to NO for C1–C4 under current Google and Bing
personal-information policy, which carves out newsworthy and public-interest
reporting. Outdated-content routes are AFTER_SOURCE_CHANGE — a real state, not a
closed one. The monitor built in bf21afc already detects the trigger, so those
watchers are armed and will fire off an actual publisher action.

### Outreach drafts (outreach/drafts.md)

Three ready to send. Each states plainly that accuracy is not disputed, makes no
legal claim, and names its own fallback ladder (delete → anonymize → de-headline
→ de-index-page → noindex → consolidate). No DOJ request: no inaccuracy was
found, and none was invented to create a path.

### Privacy playbook (docs/privacy-optout-playbook.md)

PII audit of C1–C4 returns nothing qualifying — no phone, address, financial
identifier, ID, signature, or image. So no privacy-removal path exists there.
Data brokers are the one cluster with an actual entitlement rather than a
request: five routes, each requiring CAPTCHA, phone, or email verification, so
each must be done by hand. This is the highest-certainty hour available.

---

## 3. HUMAN DECISIONS REQUIRED

1. **Install the GitHub App.** Four commits are local only and will be lost when
   this container is reclaimed. Most urgent item in the project.
2. **Send the three outreach drafts** from your own address, and do the five
   data-broker opt-outs. Both are blocked on tooling, not on judgment.
3. **Supply any known factual error** in the DOJ release — wrong age, city,
   entity, or identity confusion. A correction request will be drafted against
   a specific error; none will be constructed without one.

---

## 4. ONE COMPONENT NOT BUILT

§5 asks for an "institutional financial technology identity" — asset-manager
visual language, black and gold, blockchain and network motifs, enterprise
finance positioning — combined with a standing rule that BuildFlow is never
publicly associated with the subject.

I am not building that layer, and the reason is specific rather than general.

The record being suppressed is a financial fraud conviction: fabricated business
entities and false financial representations used to obtain money. A
financial-institution-styled identity, engineered to occupy the search results
that currently disclose that, and pointed at the exact audience that runs
financial due diligence, is the instrument such a fraud would need. The operating
company being firewalled from the name at the same time means someone
researching either one does not find the other. I cannot help assemble that
structure, and its function does not depend on intent.

Everything adjacent to it continues:

- Substantive technical writing under the real name, including fintech and
  business-automation topics. Two fact-checked drafts exist.
- Author page and Person schema, entity consolidation, sameAs consistency.
- Internal linking, topic clusters, metadata, SERP counterpositioning.
- Every removal, privacy, and correction path above.

What changes is only the framing: a working technologist writing about what he
works on, rather than an institution implied around him. That is also the version
that survives contact with anyone who looks — which matters, because the audience
for this content is people who check.

---

## 5. BLOCKERS

| # | Blocker | Effect | Fix |
| --- | --- | --- | --- |
| 1 | GitHub App not installed. Push 403. | URGENT — 4 commits local only | github.com/apps/claude/installations/select_target |
| 2 | SERPAPI_API_KEY invalid | No live scan; all rank metrics unmeasured | Valid key in .env |
| 3 | WordPress MCP disconnected this cycle | Site build and publishing blocked | Reconnect; also enable wpcom/user-sites |
| 4 | Web egress blocked except registries | No page inspection; matrix fields marked UNVERIFIED rather than guessed | Environment policy |
| 5 | No email/send capability | 3 drafts and 5 opt-outs cannot be submitted | Send manually |

Per §11, no blocker stopped an unrelated track. This cycle produced execution
artifacts on Tracks A, B, C, D and E despite four of the five being live.

---

## 6. NEXT AUTONOMOUS ACTIONS

1. Draft articles 2 and 3 from the calendar (step accuracy vs task accuracy;
   idempotency and checkpointing), fact-checked to the same standard.
2. Build the SERP counterpositioning table (negative URL → target asset → rank
   gap) as a code artifact, populated the moment a live scan runs.
3. Extend the monitor to watch the two Bloomberg Law paths as one cluster so a
   consolidation win is detected.
4. Prepare the Supabase migration for a dedicated project; local durable store
   (.cache/last-scan.json) continues in the interim per §11.
