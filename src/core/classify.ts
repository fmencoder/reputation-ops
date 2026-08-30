import type { ClassifiedResult, Control, Engine, RawResult, Sentiment } from "./types.js";
import { normalizeUrl, toDomain } from "./url.js";

/** Domains whose content is a public record and is never treated as actionable. */
const GOVERNMENT_SUFFIXES = [".gov", ".mil"];

const ADVERSE_TERMS = [
  "fraud", "sentenced", "sentencing", "convicted", "conviction", "guilty",
  "indicted", "indictment", "prison", "charged", "scheme", "restitution",
  "lawsuit", "arrested", "plea",
];

const POSITIVE_TERMS = [
  "biography", "profile", "appointed", "award", "speaker", "founder",
  "volunteer", "published", "interview",
];

export interface ClassifyOptions {
  readonly subjectName: string;
  /** Domains the subject controls and may legitimately edit. */
  readonly ownedDomains: readonly string[];
}

function detectControl(domain: string, owned: readonly string[]): Control {
  if (!domain) return "unknown";
  if (owned.some((d) => domain === d || domain.endsWith("." + d))) return "owned";
  if (GOVERNMENT_SUFFIXES.some((s) => domain.endsWith(s))) return "government";
  return "third_party";
}

function detectSentiment(haystack: string, isSubjectPage: boolean): Sentiment {
  if (!isSubjectPage) return "unrelated";
  if (ADVERSE_TERMS.some((t) => haystack.includes(t))) return "negative";
  if (POSITIVE_TERMS.some((t) => haystack.includes(t))) return "positive";
  return "neutral";
}

/**
 * Weight a result by how much it shapes the impression left by the name.
 *
 * Position dominates: rank 1 is worth far more than rank 10, and anything past
 * the first page contributes little because few searchers get there. Exact-name
 * matches count for more than incidental mentions of a similar name.
 */
export function serpWeight(position: number, exactNameMatch: boolean): number {
  if (position < 1) return 0;
  const positional = 100 / (1 + Math.log2(position));
  const nameFactor = exactNameMatch ? 1 : 0.4;
  return Math.round(Math.max(0, Math.min(100, positional * nameFactor)));
}

export function classify(
  raw: RawResult,
  queryId: string,
  engine: Engine,
  options: ClassifyOptions,
  now: () => Date = () => new Date(),
): ClassifiedResult {
  const domain = toDomain(raw.url);
  const haystack = (raw.title + " " + raw.snippet).toLowerCase();
  const name = options.subjectName.trim().toLowerCase();
  const exactNameMatch = name.length > 0 && haystack.includes(name);

  return {
    ...raw,
    queryId,
    engine,
    domain,
    normalizedUrl: normalizeUrl(raw.url),
    control: detectControl(domain, options.ownedDomains),
    sentiment: detectSentiment(haystack, exactNameMatch),
    exactNameMatch,
    serpWeight: serpWeight(raw.position, exactNameMatch),
    observedAt: now().toISOString(),
  };
}
