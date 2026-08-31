/**
 * Search observation model.
 *
 * The measurement problem this solves is identity, not ranking. There are 400+
 * people under the "Frederick Mendez" spelling alone, so a result containing
 * the exact name is not evidence that the result is *about the subject*.
 * Treating it as evidence produces two opposite failures at once: a stranger's
 * conference bio inflates the positive column, and a stranger's court record
 * inflates the negative one. Both make the scoreboard useless.
 *
 * So identity is resolved first, and a result whose subject cannot be
 * established is recorded as UNKNOWN. UNKNOWN is a legitimate terminal state
 * here, not a gap to be filled by the more convenient guess.
 */

export type Classification = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNRELATED" | "UNKNOWN";

export type IdentityConfidence =
  /** Owned property, or a URL on the established-subject list. */
  | "confirmed"
  /** Name plus at least one independent corroborating signal. */
  | "likely"
  /** Name matches and nothing corroborates it. Could be anyone. */
  | "unknown"
  /** Name does not appear. */
  | "not_subject";

export interface Observation {
  readonly timestamp: string;
  readonly engine: string;
  readonly query: string;
  readonly position: number;
  readonly title: string;
  readonly url: string;
  readonly domain: string;
  readonly classification: Classification;
  readonly classificationReason: string;
  readonly identity: IdentityConfidence;
}

export interface Snapshot {
  readonly id: string;
  readonly capturedAt: string;
  readonly isT0: boolean;
  readonly queries: readonly string[];
  readonly observations: readonly Observation[];
  /** Set when a query failed, so a partial snapshot is never mistaken for a clean one. */
  readonly failures: readonly { query: string; engine: string; reason: string }[];
}

/** The five queries this project measures. Fixed, so snapshots stay comparable. */
export function novraQuerySet(subject = "Fredrick Mendez"): readonly string[] {
  return [
    `"${subject}"`,
    `"${subject}" AI`,
    `"${subject}" technology`,
    `"${subject}" NOVRA`,
    `"${subject}" "NOVRA Intelligence"`,
  ];
}

export interface IdentityContext {
  readonly subjectName: string;
  /** Domains the subject controls. A hit here is identity by definition. */
  readonly ownedDomains: readonly string[];
  /**
   * URLs already established as being about the subject — the publisher pages
   * this project has corresponded with. Listed explicitly rather than matched
   * by keyword, because keyword matching is how a stranger gets swept in.
   */
  readonly establishedUrls: readonly string[];
  /**
   * Terms that, appearing alongside the name, corroborate identity. Kept narrow
   * on purpose: a broad list turns "likely" into "any result mentioning tech".
   */
  readonly corroborators: readonly string[];
}

const ADVERSE_TERMS = [
  "fraud", "sentenced", "sentencing", "convicted", "conviction", "guilty",
  "indicted", "indictment", "prison", "charged", "scheme", "restitution",
  "arrested", "plea", "felony",
];

const PROFESSIONAL_TERMS = [
  "technology", "engineering", "architecture", "artificial intelligence",
  "blockchain", "infrastructure", "research", "author", "strategy",
];

function normalizeDomain(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

function normalizeUrlForCompare(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${normalizeDomain(url)}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function resolveIdentity(
  url: string,
  haystack: string,
  context: IdentityContext,
): { identity: IdentityConfidence; reason: string } {
  const domain = normalizeDomain(url);
  const text = haystack.toLowerCase();
  const name = context.subjectName.trim().toLowerCase();

  if (domain && context.ownedDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { identity: "confirmed", reason: `owned domain (${domain})` };
  }

  const normalized = normalizeUrlForCompare(url);
  if (context.establishedUrls.some((u) => normalizeUrlForCompare(u) === normalized)) {
    return { identity: "confirmed", reason: "URL is on the established-subject list" };
  }

  if (!name || !text.includes(name)) {
    return { identity: "not_subject", reason: "subject name does not appear in the result" };
  }

  const hit = context.corroborators.find((term) => text.includes(term.toLowerCase()));
  if (hit) {
    return { identity: "likely", reason: `name plus corroborating term "${hit}"` };
  }

  return {
    identity: "unknown",
    reason: "name matches with nothing corroborating it; could be another person of the same name",
  };
}

export interface RawObservation {
  readonly engine: string;
  readonly query: string;
  readonly position: number;
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

/**
 * Classify one result.
 *
 * Sentiment is only ever assigned to a result whose subject is established.
 * That ordering is the whole design: an adverse term on a page about someone
 * else is not a negative result for this subject, and a flattering one is not a
 * win.
 */
export function classifyObservation(
  raw: RawObservation,
  context: IdentityContext,
  now: () => Date = () => new Date(),
): Observation {
  const haystack = `${raw.title} ${raw.snippet}`;
  const { identity, reason } = resolveIdentity(raw.url, haystack, context);
  const text = haystack.toLowerCase();

  let classification: Classification;
  let classificationReason: string;

  if (identity === "not_subject") {
    classification = "UNRELATED";
    classificationReason = reason;
  } else if (identity === "unknown") {
    classification = "UNKNOWN";
    classificationReason = reason;
  } else {
    const adverse = ADVERSE_TERMS.find((t) => text.includes(t));
    const professional = PROFESSIONAL_TERMS.find((t) => text.includes(t));
    if (adverse) {
      classification = "NEGATIVE";
      classificationReason = `${reason}; adverse term "${adverse}"`;
    } else if (professional) {
      classification = "POSITIVE";
      classificationReason = `${reason}; professional term "${professional}"`;
    } else {
      classification = "NEUTRAL";
      classificationReason = `${reason}; no adverse or professional signal`;
    }
  }

  return {
    timestamp: now().toISOString(),
    engine: raw.engine,
    query: raw.query,
    position: raw.position,
    title: raw.title,
    url: raw.url,
    domain: normalizeDomain(raw.url),
    classification,
    classificationReason,
    identity,
  };
}

export class T0ImmutableError extends Error {
  constructor(readonly existingCapturedAt: string) {
    super(
      `T0 was captured at ${existingCapturedAt} and cannot be regenerated. ` +
      "A baseline recreated after intervention is not a baseline. " +
      "Later runs are ordinary snapshots.",
    );
    this.name = "T0ImmutableError";
  }
}

/**
 * Guard the baseline.
 *
 * T0 is the one measurement in this project that cannot be recovered if lost or
 * overwritten — it is defined as the state *before* any intervention, and that
 * moment does not come back. So the write is refused rather than warned about.
 */
export function assertT0Writable(existing: Snapshot | null): void {
  if (existing) throw new T0ImmutableError(existing.capturedAt);
}

/** A snapshot with failures is not eligible to become the baseline. */
export function isBaselineEligible(snapshot: Snapshot): { eligible: boolean; reason: string } {
  if (snapshot.failures.length > 0) {
    return {
      eligible: false,
      reason: `${snapshot.failures.length} queries failed; a partial baseline understates what was there`,
    };
  }
  if (snapshot.observations.length === 0) {
    return { eligible: false, reason: "no observations captured" };
  }
  return { eligible: true, reason: "complete capture" };
}
