import type { ClassifiedResult } from "./types.js";

/**
 * A cluster groups URLs that are the same underlying article.
 *
 * Publishers routinely expose one piece under several paths — Bloomberg Law
 * carries the same story under both /us-law-week/ and
 * /white-collar-and-criminal-law/. Counted separately, that one article
 * contributes its SERP weight twice and inflates negative share of voice, which
 * makes the headline metric wrong in the direction that matters most: it would
 * report progress when a duplicate is consolidated even though nothing about
 * the underlying visibility changed.
 */
export interface ClusterRule {
  /** Stable identifier for the cluster. */
  readonly id: string;
  /** Domain the rule applies to, matched exactly against the result domain. */
  readonly domain: string;
  /**
   * Path prefixes that resolve to the same article. A result whose path starts
   * with any of these belongs to the cluster.
   */
  readonly pathPrefixes: readonly string[];
}

/** Known duplicate surfaces, verified 2026-08-31. */
export const DEFAULT_CLUSTER_RULES: readonly ClusterRule[] = [
  {
    id: "bloomberglaw:covid-relief-sentencing",
    domain: "news.bloomberglaw.com",
    pathPrefixes: [
      "/us-law-week/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
      "/white-collar-and-criminal-law/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
    ],
  },
];

/**
 * Resolve a result to its cluster id.
 *
 * Falls back to the normalized URL, so an unclustered result is its own
 * cluster and downstream code can treat every result uniformly.
 */
export function clusterIdFor(
  result: Pick<ClassifiedResult, "domain" | "normalizedUrl">,
  rules: readonly ClusterRule[] = DEFAULT_CLUSTER_RULES,
): string {
  let path: string;
  try {
    path = new URL(result.normalizedUrl).pathname;
  } catch {
    return result.normalizedUrl;
  }

  for (const rule of rules) {
    if (rule.domain !== result.domain) continue;
    if (rule.pathPrefixes.some((prefix) => path.startsWith(prefix))) return rule.id;
  }
  return result.normalizedUrl;
}

/**
 * Collapse a result set to one entry per cluster per query and engine.
 *
 * Keeps the best-ranked member, because that is the one a searcher actually
 * encounters — the duplicate sitting at rank 30 adds no visibility the rank-4
 * copy has not already produced.
 */
export function collapseToClusters(
  results: readonly ClassifiedResult[],
  rules: readonly ClusterRule[] = DEFAULT_CLUSTER_RULES,
): ClassifiedResult[] {
  const best = new Map<string, ClassifiedResult>();

  for (const result of results) {
    const key = `${result.queryId} ${result.engine} ${clusterIdFor(result, rules)}`;
    const incumbent = best.get(key);
    if (!incumbent || result.position < incumbent.position) best.set(key, result);
  }

  return [...best.values()];
}
