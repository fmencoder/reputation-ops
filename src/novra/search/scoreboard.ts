/**
 * Suppression scoreboard.
 *
 * Computed from observations, never hand-maintained, and never rewritten:
 * historical snapshots are inputs, so an improvement cannot be manufactured by
 * revising what last month looked like.
 *
 * UNKNOWN results are counted and reported separately rather than distributed
 * into the other buckets. A scoreboard that quietly resolves ambiguity in the
 * subject's favour is a scoreboard that reports progress that did not happen.
 */

import type { Classification, Observation, Snapshot } from "./observations.js";

export interface Scoreboard {
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly top10: Readonly<Record<Classification, number>>;
  readonly top20: Readonly<Record<Classification, number>>;
  readonly novraHighestPosition: number | null;
  readonly aboutPagePosition: number | null;
  readonly articlePositions: readonly { url: string; position: number; query: string }[];
  readonly thirdPartyPositions: readonly { url: string; position: number; query: string }[];
  readonly totalObservations: number;
}

export interface ScoreboardDelta {
  readonly field: string;
  readonly t0: number | null;
  readonly current: number | null;
  /** Positive means improvement, in whichever direction improvement means here. */
  readonly change: number | null;
  readonly note: string;
}

function emptyCounts(): Record<Classification, number> {
  return { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNRELATED: 0, UNKNOWN: 0 };
}

function countWithin(observations: readonly Observation[], limit: number): Record<Classification, number> {
  const counts = emptyCounts();
  for (const observation of observations) {
    if (observation.position <= limit) counts[observation.classification] += 1;
  }
  return counts;
}

export interface ScoreboardOptions {
  readonly ownedDomains: readonly string[];
  /** Path prefix that identifies an article URL on an owned domain. */
  readonly articlePathPrefix: string;
  readonly aboutPath: string;
}

function isOwned(observation: Observation, owned: readonly string[]): boolean {
  return owned.some((d) => observation.domain === d || observation.domain.endsWith(`.${d}`));
}

export function computeScoreboard(
  snapshot: Snapshot,
  options: ScoreboardOptions,
): Scoreboard {
  const observations = snapshot.observations;
  const owned = observations.filter((o) => isOwned(o, options.ownedDomains));

  const novraPositions = owned.map((o) => o.position);
  const aboutMatch = owned
    .filter((o) => {
      try {
        return new URL(o.url).pathname.startsWith(options.aboutPath);
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.position - b.position)[0];

  const articles = owned
    .filter((o) => {
      try {
        return new URL(o.url).pathname.startsWith(options.articlePathPrefix);
      } catch {
        return false;
      }
    })
    .map((o) => ({ url: o.url, position: o.position, query: o.query }))
    .sort((a, b) => a.position - b.position);

  // Third-party positions cover results established as being about the subject
  // and not controlled by them. UNKNOWN is excluded on purpose: an unidentified
  // page is not evidence of a third-party result about this person.
  const thirdParty = observations
    .filter((o) => !isOwned(o, options.ownedDomains))
    .filter((o) => o.identity === "confirmed" || o.identity === "likely")
    .map((o) => ({ url: o.url, position: o.position, query: o.query }))
    .sort((a, b) => a.position - b.position);

  return {
    snapshotId: snapshot.id,
    capturedAt: snapshot.capturedAt,
    top10: countWithin(observations, 10),
    top20: countWithin(observations, 20),
    novraHighestPosition: novraPositions.length ? Math.min(...novraPositions) : null,
    aboutPagePosition: aboutMatch?.position ?? null,
    articlePositions: articles,
    thirdPartyPositions: thirdParty,
    totalObservations: observations.length,
  };
}

/**
 * Change since the baseline.
 *
 * Rank fields improve when they get *smaller*, count fields differ by
 * direction, so each delta carries a note saying which way is good rather than
 * leaving a bare signed number to be misread.
 */
export function compareToT0(t0: Scoreboard, current: Scoreboard): readonly ScoreboardDelta[] {
  const deltas: ScoreboardDelta[] = [];

  const counts: [string, Classification, string][] = [
    ["TOP10_POSITIVE", "POSITIVE", "higher is better"],
    ["TOP10_NEUTRAL", "NEUTRAL", "context only"],
    ["TOP10_NEGATIVE", "NEGATIVE", "lower is better"],
    ["TOP10_UNKNOWN", "UNKNOWN", "lower is better — unresolved identity"],
  ];
  for (const [field, key, note] of counts) {
    deltas.push({
      field, t0: t0.top10[key], current: current.top10[key],
      change: current.top10[key] - t0.top10[key], note,
    });
  }

  for (const [field, key, note] of [
    ["TOP20_POSITIVE", "POSITIVE", "higher is better"],
    ["TOP20_NEGATIVE", "NEGATIVE", "lower is better"],
  ] as [string, Classification, string][]) {
    deltas.push({
      field, t0: t0.top20[key], current: current.top20[key],
      change: current.top20[key] - t0.top20[key], note,
    });
  }

  const rankFields: [string, number | null, number | null][] = [
    ["NOVRA_HIGHEST_POSITION", t0.novraHighestPosition, current.novraHighestPosition],
    ["ABOUT_PAGE_POSITION", t0.aboutPagePosition, current.aboutPagePosition],
  ];
  for (const [field, before, after] of rankFields) {
    deltas.push({
      field, t0: before, current: after,
      change: before !== null && after !== null ? before - after : null,
      note: "positive change means it moved up the page; null means absent in one of the two snapshots",
    });
  }

  return deltas;
}

export function renderScoreboard(
  scoreboard: Scoreboard,
  deltas: readonly ScoreboardDelta[] | null,
): string {
  const lines: string[] = [
    `SNAPSHOT=${scoreboard.snapshotId}`,
    `CAPTURED_AT=${scoreboard.capturedAt}`,
    `TOTAL_OBSERVATIONS=${scoreboard.totalObservations}`,
    "",
    `TOP10_POSITIVE=${scoreboard.top10.POSITIVE}`,
    `TOP10_NEUTRAL=${scoreboard.top10.NEUTRAL}`,
    `TOP10_NEGATIVE=${scoreboard.top10.NEGATIVE}`,
    `TOP10_UNRELATED=${scoreboard.top10.UNRELATED}`,
    `TOP10_UNKNOWN=${scoreboard.top10.UNKNOWN}`,
    `TOP20_POSITIVE=${scoreboard.top20.POSITIVE}`,
    `TOP20_NEGATIVE=${scoreboard.top20.NEGATIVE}`,
    "",
    `NOVRA_HIGHEST_POSITION=${scoreboard.novraHighestPosition ?? "absent"}`,
    `ABOUT_PAGE_POSITION=${scoreboard.aboutPagePosition ?? "absent"}`,
    `ARTICLE_POSITIONS=${scoreboard.articlePositions.length}`,
    `THIRD_PARTY_POSITIONS=${scoreboard.thirdPartyPositions.length}`,
  ];

  if (deltas) {
    lines.push("", "CHANGE_FROM_T0");
    for (const delta of deltas) {
      lines.push(`  ${delta.field}: ${delta.t0 ?? "-"} -> ${delta.current ?? "-"} (${delta.change ?? "n/a"}) ${delta.note}`);
    }
  } else {
    lines.push("", "CHANGE_FROM_T0=UNAVAILABLE (no baseline captured)");
  }

  return lines.join("\n");
}
