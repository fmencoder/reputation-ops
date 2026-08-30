import type { Alert, ClassifiedResult, RankDelta, RankObservation } from "./types.js";

/** Composite key a delta is computed over: one URL, as seen for one query. */
function keyOf(r: { normalizedUrl: string; queryId: string }): string {
  return r.queryId + " " + r.normalizedUrl;
}

/**
 * Compare this scan against the previous one.
 *
 * Emits a delta for every URL on either side, so a result that disappeared is
 * reported as `dropped_out` rather than silently vanishing from the report.
 */
export function computeDeltas(
  current: readonly ClassifiedResult[],
  previous: readonly RankObservation[],
): RankDelta[] {
  const prevByKey = new Map(previous.map((p) => [keyOf(p), p]));
  const deltas: RankDelta[] = [];
  const seen = new Set<string>();

  for (const result of current) {
    const key = keyOf(result);
    seen.add(key);
    const prior = prevByKey.get(key);
    const previousPosition = prior ? prior.position : null;

    let trend: RankDelta["trend"];
    if (previousPosition === null) trend = "new";
    else if (result.position < previousPosition) trend = "up";
    else if (result.position > previousPosition) trend = "down";
    else trend = "flat";

    deltas.push({
      normalizedUrl: result.normalizedUrl,
      queryId: result.queryId,
      engine: result.engine,
      previousPosition,
      currentPosition: result.position,
      trend,
    });
  }

  for (const prior of previous) {
    if (seen.has(keyOf(prior))) continue;
    deltas.push({
      normalizedUrl: prior.normalizedUrl,
      queryId: prior.queryId,
      engine: prior.engine,
      previousPosition: prior.position,
      currentPosition: null,
      trend: "dropped_out",
    });
  }

  return deltas;
}

/** Raise alerts for the movements worth a human's attention. */
export function deriveAlerts(
  current: readonly ClassifiedResult[],
  deltas: readonly RankDelta[],
): Alert[] {
  const byKey = new Map(current.map((r) => [keyOf(r), r]));
  const alerts: Alert[] = [];

  for (const delta of deltas) {
    const result = byKey.get(keyOf(delta));
    const entered = (n: number): boolean =>
      delta.currentPosition !== null &&
      delta.currentPosition <= n &&
      (delta.previousPosition === null || delta.previousPosition > n);

    const was = delta.previousPosition === null ? "absent" : String(delta.previousPosition);

    if (result && result.sentiment === "negative") {
      if (entered(3)) {
        alerts.push({
          kind: "negative_entered_top_3",
          normalizedUrl: delta.normalizedUrl,
          queryId: delta.queryId,
          engine: delta.engine,
          detail: "Now rank " + delta.currentPosition + " (was " + was + ").",
        });
      } else if (entered(10)) {
        alerts.push({
          kind: "negative_entered_top_10",
          normalizedUrl: delta.normalizedUrl,
          queryId: delta.queryId,
          engine: delta.engine,
          detail: "Now rank " + delta.currentPosition + " (was " + was + ").",
        });
      }
    }

    if (result && result.sentiment === "positive" && entered(10)) {
      alerts.push({
        kind: "positive_entered_top_10",
        normalizedUrl: delta.normalizedUrl,
        queryId: delta.queryId,
        engine: delta.engine,
        detail: "Owned or positive asset reached rank " + delta.currentPosition + ".",
      });
    }

    if (delta.trend === "dropped_out") {
      alerts.push({
        kind: "negative_left_results",
        normalizedUrl: delta.normalizedUrl,
        queryId: delta.queryId,
        engine: delta.engine,
        detail: "No longer returned (was rank " + delta.previousPosition + ").",
      });
    }
  }

  return alerts;
}
