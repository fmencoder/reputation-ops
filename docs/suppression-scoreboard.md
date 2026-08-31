# Suppression scoreboard

**Append-only. Never rewrite a prior observation.** A measurement history that
gets edited is worthless — the entire value of a baseline is that it was taken
before anyone knew how things would turn out.

---

## T0 — NOT YET CAPTURED

    T0_STATUS         BLOCKED
    BLOCKER           SERPAPI_API_KEY rejected as invalid
    CONSEQUENCE       No before-state exists

This is the one genuinely unrecoverable item in the project. Once NOVRA
Intelligence launches and begins to rank, the pre-launch first page cannot be
reconstructed. Every later claim of progress will rest on a baseline nobody took.

**Capture T0 before the site goes public.** The scanner is built, tested and
waiting on one credential.

Historical note, recorded now so it is not lost: as of 2026-08-31 the negative
footprint consists of four surfaces (DOJ, Bloomberg Law on two URL paths,
Hoodline, MoreLaw case CO/188850 plus Colorado index pages), and a syndication
sweep across seven query forms found no scraped, mirrored, translated or AMP
copies. That is a qualitative baseline, not a measurement, and it does not
substitute for T0.

---

## Tracked queries

Run all five against Google, Bing and DuckDuckGo each scan:

    "Fredrick Mendez"
    "Fredrick Mendez" AI
    "Fredrick Mendez" technology
    "Fredrick Mendez" NOVRA
    "Fredrick Mendez" NOVRA Intelligence

The last two will return nothing until the site is public. That is expected and
should be recorded as a real zero, not skipped — the first scan where they
return something is a meaningful event.

---

## Classification

| Class | Definition |
| --- | --- |
| `POSITIVE` | Owned or professional; subject is the author or focus |
| `NEUTRAL` | About the subject, no adverse content |
| `NEGATIVE` | Concerns the conviction |
| `UNRELATED` | A different person of the same or similar name |

`UNRELATED` matters and is easy to mis-handle. There are 400+ same-name
profiles; counting them as neutral wins would inflate every number here. They
occupy positions and dilute the name, which helps — but they are not assets, and
they are not progress.

---

## Metrics per scan

    TOP10_POSITIVE
    TOP10_NEUTRAL
    TOP10_NEGATIVE
    TOP20_POSITIVE
    TOP20_NEGATIVE
    NOVRA_HIGHEST_POSITION
    AUTHOR_PAGE_POSITION
    ARTICLE_POSITIONS          per article
    THIRD_PARTY_POSITIONS      per profile
    SHARE_OF_VOICE             weighted, duplicate-collapsed

Share of voice is the honest headline metric. Raw counts move when a same-name
stranger's profile shifts; weighted share reflects what a searcher actually
encounters. It collapses duplicate URL clusters first — without that, Bloomberg's
two paths double-count and a consolidation win would register as progress when
visibility had not changed at all.

---

## Observation log

Append one block per scan. Never edit an earlier block.

```
SCAN: <id>
DATE: <ISO>
ENGINE: <google|bing|duckduckgo>
QUERY: <query>
RESULTS:
  <rank> | <class> | <domain> | <title>
NOTES: <anything unusual — SERP feature changes, personalisation suspicion, engine outage>
```

### 2026-08-31 — no scan

    Reason: SERPAPI_API_KEY invalid. No results recorded.
    Nothing is estimated or back-filled. A gap in this log is honest; an
    invented row is not.

---

## Reading the numbers

Three cautions, worth writing down before there is any pressure to read the data
optimistically:

**Movement is slow and non-monotonic.** A new site takes months to rank for
anything, and positions oscillate for reasons unrelated to anything you did.
Weekly readings are noise; monthly trend is signal.

**Personalisation and locale distort everything.** SerpApi returns
non-personalised results, which is why the scanner uses it rather than manual
searching. Do not compare a scanner reading against what you see in your own
browser — they measure different things, and yours is the less reliable of the two.

**The negative results are unlikely to leave.** DOJ is a government record.
Bloomberg Law is a publication of record. The realistic goal is that professional
results accumulate around them, not that they disappear. A scoreboard that only
counts removals will read as failure indefinitely, which is why share of voice is
the metric that matters.

---

## Interlock with the removal track

A `dropped_out` delta or a title change on any tracked negative URL is the
trigger condition for the search-engine refresh workflows in
`outreach/execution-queue.md`. The monitor detects it; it must then be verified
on the live page before any submission.

A publisher's promise to act is not a source change.
