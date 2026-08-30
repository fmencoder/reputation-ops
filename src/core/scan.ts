import type { SerpApiClient } from "../adapters/serpapi.js";
import { classify, type ClassifyOptions } from "./classify.js";
import { computeDeltas, deriveAlerts } from "./diff.js";
import type { ClassifiedResult, RankObservation, ScanSummary, SearchQuery } from "./types.js";

export interface ScanDeps {
  readonly client: SerpApiClient;
  readonly queries: readonly SearchQuery[];
  readonly classifyOptions: ClassifyOptions;
  /** Prior observations to diff against; empty on a first run. */
  readonly previous: readonly RankObservation[];
  readonly log?: (event: Record<string, unknown>) => void;
  readonly now?: () => Date;
  readonly scanId?: string;
}

export interface ScanOutcome {
  readonly summary: ScanSummary;
  readonly results: readonly ClassifiedResult[];
}

/**
 * Run one monitoring pass over the query set.
 *
 * A query that fails is logged and skipped rather than aborting the scan: a
 * partial picture across the remaining engines is more useful than none, and
 * the failure count surfaces in the summary so a degraded run is never mistaken
 * for a clean one.
 */
export async function runScan(deps: ScanDeps): Promise<ScanOutcome> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});
  const startedAt = now().toISOString();
  const scanId = deps.scanId ?? "scan_" + startedAt;

  const results: ClassifiedResult[] = [];
  let queriesFailed = 0;

  for (const query of deps.queries) {
    try {
      const raw = await deps.client.search(query);
      for (const item of raw) {
        if (!item.url) continue;
        results.push(classify(item, query.id, query.engine, deps.classifyOptions, now));
      }
      log({ event: "query_ok", scanId, queryId: query.id, results: raw.length });
    } catch (error) {
      queriesFailed++;
      log({
        event: "query_failed",
        scanId,
        queryId: query.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const deltas = computeDeltas(results, deps.previous);
  const alerts = deriveAlerts(results, deltas);
  const knownUrls = new Set(deps.previous.map((p) => p.normalizedUrl));
  const newUrls = [...new Set(results.map((r) => r.normalizedUrl))].filter(
    (u) => !knownUrls.has(u),
  );

  const summary: ScanSummary = {
    scanId,
    startedAt,
    finishedAt: now().toISOString(),
    queriesRun: deps.queries.length - queriesFailed,
    queriesFailed,
    resultsSeen: results.length,
    newUrls,
    deltas,
    alerts,
  };

  log({
    event: "scan_complete",
    scanId,
    queriesRun: summary.queriesRun,
    queriesFailed,
    resultsSeen: results.length,
    newUrls: newUrls.length,
    alerts: alerts.length,
  });

  return { summary, results };
}
