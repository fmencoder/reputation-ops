# reputation-ops

Search-visibility monitoring for a single named subject.

## What this is

A scheduled scanner that records what search engines return for the subject's
name, tracks how those results move over time, and alerts on meaningful changes.
It measures a footprint; it does not try to alter one.

## What this is not

This repository deliberately contains no machinery for:

- publisher outreach or removal requests,
- search-engine deindexing or "stale content" submissions,
- automated follow-up or escalation campaigns.

Those were part of the original brief and were left out on purpose. See
[`docs/findings.md`](docs/findings.md) for the reasoning and the verified record.

The only pages this project ever modifies are ones listed in `OWNED_DOMAINS` —
assets the subject actually controls. Third-party and government pages are
observed and never touched.

## Usage

```bash
npm install
cp .env.example .env   # then fill in SERPAPI_API_KEY
npm test
npm run scan
```

`npm run scan` writes a Markdown report to `reports/` and stores the current
rankings in `.cache/last-scan.json`, which the next run diffs against.

## Design notes

- **Query set** (`src/core/queries.ts`) is name- and locale-based only. It does
  not include offence-specific terms: the goal is to measure what an ordinary
  searcher encounters, and seeding the set with adverse keywords would distort
  that measurement.
- **URL identity** (`src/core/url.ts`) normalizes scheme, `www.`, tracking
  params, AMP suffixes and param order so the same article seen on three engines
  collapses to one tracked row.
- **Share of voice** (`src/core/report.ts`) is the headline metric. Progress
  here comes from legitimate owned pages accumulating first-page weight.
- **Resilience** — a failed query is logged and skipped, never fatal; the
  failure count appears in every report so a degraded scan is not mistaken for a
  clean one. SerpApi calls are rate-limited, cached, and retried only on 429/5xx.

## Environment blockers

Two things prevent this from running as-is in the environment it was built in:

1. **`SERPAPI_API_KEY` is rejected** by SerpApi (`Invalid API key`). The code
   paths are covered by tests against a stubbed client, but no live scan has run.
2. **General web egress is blocked** by the network proxy — only package
   registries are reachable. Server-side search works; direct page fetches do not.

## Database

`supabase/migrations/0001_init.sql` defines the schema. It has not been applied:
the only Supabase projects on this account belong to an unrelated application,
and this data — about one identifiable person — should live in its own project
with row-level security policies written before any client sees it.
