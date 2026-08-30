/**
 * Core domain types.
 *
 * Scope note: this package tracks where a subject's name surfaces in search
 * results and whether legitimate owned assets are gaining ground. It does not
 * model removal, deindexing, or publisher-outreach campaigns.
 */

export type Engine = "google" | "bing" | "duckduckgo";

/** How a result relates to the subject's reputation. */
export type Sentiment = "negative" | "neutral" | "positive" | "unrelated";

/**
 * Who controls the page. Only `owned` pages may be edited by this project;
 * everything else is observed and never touched.
 */
export type Control = "owned" | "third_party" | "government" | "unknown";

export interface SearchQuery {
  /** Stable identifier, used as the cache and dedupe key. */
  readonly id: string;
  readonly q: string;
  readonly engine: Engine;
  /** Why this query is in the set — keeps the query list auditable. */
  readonly rationale: string;
}

export interface RawResult {
  readonly position: number;
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly displayedDomain?: string;
  readonly publishedDate?: string;
}

export interface ClassifiedResult extends RawResult {
  readonly queryId: string;
  readonly engine: Engine;
  /** Registrable domain, lowercased, `www.` stripped. */
  readonly domain: string;
  /** URL with tracking params removed — the cross-engine identity key. */
  readonly normalizedUrl: string;
  readonly sentiment: Sentiment;
  readonly control: Control;
  /** True when the title or snippet contains the subject's exact name. */
  readonly exactNameMatch: boolean;
  /** 0-100. How much this result shapes the first impression of the name. */
  readonly serpWeight: number;
  readonly observedAt: string;
}

export interface RankObservation {
  readonly normalizedUrl: string;
  readonly queryId: string;
  readonly engine: Engine;
  readonly position: number;
  readonly observedAt: string;
}

export interface RankDelta {
  readonly normalizedUrl: string;
  readonly queryId: string;
  readonly engine: Engine;
  readonly previousPosition: number | null;
  readonly currentPosition: number | null;
  readonly trend: "new" | "up" | "down" | "flat" | "dropped_out";
}

export interface ScanSummary {
  readonly scanId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly queriesRun: number;
  readonly queriesFailed: number;
  readonly resultsSeen: number;
  readonly newUrls: readonly string[];
  readonly deltas: readonly RankDelta[];
  readonly alerts: readonly Alert[];
}

export type AlertKind =
  | "negative_entered_top_10"
  | "negative_entered_top_3"
  | "negative_left_results"
  | "positive_entered_top_10"
  | "new_url_discovered";

export interface Alert {
  readonly kind: AlertKind;
  readonly normalizedUrl: string;
  readonly queryId: string;
  readonly engine: Engine;
  readonly detail: string;
}
