/**
 * Publisher source watch.
 *
 * Three editorial requests were submitted on 2026-08-31. The only thing that
 * counts as a result is the live page changing. An acknowledgement, a ticket
 * number, a "we're reviewing it" — none of those are a source change, and
 * treating them as one is how a project convinces itself it has made progress
 * it has not made. This module looks at the page.
 *
 * EVIDENCE POLICY
 * These are copyrighted articles. The watch stores hashes, HTTP metadata,
 * boolean signals and a short fingerprint of the headline region — enough to
 * prove a material change occurred and to date it, and no more. It does not
 * archive article bodies.
 */

export type SourceChange =
  | "UNCHANGED"
  | "REMOVED"
  | "GONE"
  | "REDIRECTED"
  | "NOINDEX"
  | "CANONICAL_CHANGED"
  | "NAME_MINIMIZED"
  | "MATERIAL_TEXT_CHANGED"
  | "FETCH_FAILED";

export interface SourceTarget {
  readonly id: string;
  readonly publisher: string;
  readonly urls: readonly string[];
  readonly submittedAt: string;
  readonly status: "SUBMITTED" | "RESPONDED" | "DECLINED" | "RESOLVED";
}

/**
 * The canonical URLs recorded in this repository. Bloomberg Law carries the
 * same article on two paths — the same pair the share-of-voice cluster rule
 * consolidates — so both are watched under one target.
 */
export const SOURCE_TARGETS: readonly SourceTarget[] = [
  {
    id: "morelaw",
    publisher: "MoreLaw",
    urls: ["https://www.morelaw.com/verdicts/case/CO/188850/"],
    submittedAt: "2026-08-31",
    status: "SUBMITTED",
  },
  {
    id: "hoodline",
    publisher: "Hoodline",
    urls: [
      "https://hoodline.com/2025/01/boca-raton-man-sentenced-to-over-3-years-for-fraudulently-obtaining-covid-19-relief-funds/",
    ],
    submittedAt: "2026-08-31",
    status: "SUBMITTED",
  },
  {
    id: "bloomberglaw",
    publisher: "Bloomberg Law",
    urls: [
      "https://news.bloomberglaw.com/us-law-week/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
      "https://news.bloomberglaw.com/white-collar-and-criminal-law/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
    ],
    submittedAt: "2026-08-31",
    status: "SUBMITTED",
  },
];

export interface SourceCheck {
  readonly targetId: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly httpStatus: number | null;
  readonly finalUrl: string | null;
  readonly canonicalUrl: string | null;
  readonly robotsMeta: string | null;
  readonly subjectNamePresent: boolean;
  readonly subjectNameOccurrences: number;
  readonly contentHash: string;
  /** Short hash of the title region only. Not a copy of the article. */
  readonly titleFingerprint: string;
  readonly change: SourceChange;
  readonly detail: string;
}

export interface FetchOutcome {
  readonly status: number | null;
  readonly finalUrl: string | null;
  readonly body: string | null;
  readonly error?: string;
}

function extractCanonical(html: string): string | null {
  const tag = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i.exec(html)?.[0];
  if (!tag) return null;
  return /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? null;
}

function extractRobots(html: string): string | null {
  const tag = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/i.exec(html)?.[0];
  if (!tag) return null;
  return /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? null;
}

function extractTitle(html: string): string {
  return /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  while (index !== -1) {
    count += 1;
    index = haystack.toLowerCase().indexOf(needle.toLowerCase(), index + needle.length);
  }
  return count;
}

/** Text content only, so a change to an ad slot or a nav link is not a "change". */
function textFingerprintSource(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CheckContext {
  readonly subjectName: string;
  readonly hash: (input: string) => string;
  readonly previous?: SourceCheck | undefined;
  readonly now?: () => Date;
}

/**
 * Classify one fetch against the previous check.
 *
 * Ordering is deliberate: transport-level outcomes (gone, redirected) settle the
 * verdict before any content comparison, because a 404 body is not evidence
 * about the article's text.
 */
export function evaluateCheck(
  targetId: string,
  url: string,
  outcome: FetchOutcome,
  context: CheckContext,
): SourceCheck {
  const now = (context.now ?? (() => new Date()))().toISOString();

  const base = {
    targetId,
    url,
    checkedAt: now,
    httpStatus: outcome.status,
    finalUrl: outcome.finalUrl,
  };

  if (outcome.body === null) {
    const gone = outcome.status === 404 || outcome.status === 410;
    return {
      ...base,
      canonicalUrl: null,
      robotsMeta: null,
      subjectNamePresent: false,
      subjectNameOccurrences: 0,
      contentHash: "",
      titleFingerprint: "",
      change: gone ? "GONE" : "FETCH_FAILED",
      detail: gone
        ? `HTTP ${outcome.status} — the page no longer resolves`
        : `fetch failed: ${outcome.error ?? `HTTP ${outcome.status ?? "?"}`}`,
    };
  }

  const html = outcome.body;
  const text = textFingerprintSource(html);
  const canonicalUrl = extractCanonical(html);
  const robotsMeta = extractRobots(html);
  const occurrences = countOccurrences(text, context.subjectName);
  const contentHash = context.hash(text);
  const titleFingerprint = context.hash(extractTitle(html));

  const current = {
    ...base,
    canonicalUrl,
    robotsMeta,
    subjectNamePresent: occurrences > 0,
    subjectNameOccurrences: occurrences,
    contentHash,
    titleFingerprint,
  };

  if (outcome.finalUrl && normalize(outcome.finalUrl) !== normalize(url)) {
    return { ...current, change: "REDIRECTED", detail: `redirects to ${outcome.finalUrl}` };
  }

  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    return { ...current, change: "NOINDEX", detail: `robots meta is "${robotsMeta}"` };
  }

  const previous = context.previous;
  if (!previous) {
    return {
      ...current,
      change: "UNCHANGED",
      detail: "first observation — recorded as the comparison point, not as a change",
    };
  }

  if (canonicalUrl && previous.canonicalUrl && canonicalUrl !== previous.canonicalUrl) {
    return {
      ...current,
      change: "CANONICAL_CHANGED",
      detail: `canonical moved from ${previous.canonicalUrl} to ${canonicalUrl}`,
    };
  }

  if (previous.subjectNamePresent && occurrences === 0) {
    return { ...current, change: "REMOVED", detail: "the subject's name no longer appears on the page" };
  }

  if (previous.subjectNameOccurrences > occurrences && occurrences > 0) {
    return {
      ...current,
      change: "NAME_MINIMIZED",
      detail: `name occurrences fell from ${previous.subjectNameOccurrences} to ${occurrences}`,
    };
  }

  if (previous.contentHash && previous.contentHash !== contentHash) {
    return {
      ...current,
      change: "MATERIAL_TEXT_CHANGED",
      detail: "page text changed; compare name occurrences and canonical before drawing a conclusion",
    };
  }

  return { ...current, change: "UNCHANGED", detail: "no material change" };
}

function normalize(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Changes that make a search-refresh request factually supportable.
 *
 * This sets an internal eligibility flag and nothing else. Submitting an
 * outdated-content report asserts to a search engine that the live page no
 * longer matches its index, and that representation is the user's to make.
 * Automation prepares the URL and the evidence; a person submits it.
 */
export const REFRESH_ELIGIBLE_CHANGES: readonly SourceChange[] = [
  "REMOVED", "GONE", "REDIRECTED", "NOINDEX", "CANONICAL_CHANGED", "NAME_MINIMIZED",
];

export interface RefreshReadiness {
  readonly targetId: string;
  readonly eligible: boolean;
  readonly change: SourceChange;
  readonly url: string;
  readonly evidence: string;
  /** Always true. Recorded so no caller can read this as an instruction to submit. */
  readonly humanSubmissionRequired: true;
}

export function refreshReadiness(check: SourceCheck): RefreshReadiness {
  const eligible = REFRESH_ELIGIBLE_CHANGES.includes(check.change);
  return {
    targetId: check.targetId,
    eligible,
    change: check.change,
    url: check.url,
    evidence: eligible
      ? `${check.change} observed ${check.checkedAt}: ${check.detail}`
      : "no verified source change; nothing to report to a search engine",
    humanSubmissionRequired: true,
  };
}

/**
 * Follow-up window: 2026-09-07 to 2026-09-10, one substantive follow-up only.
 * Flags; never sends. Repeated contact after a clear position is harassment,
 * and one unanswered request does not become two by waiting.
 */
export function followUpDue(
  target: SourceTarget,
  today: Date,
  alreadyFollowedUp: boolean,
): { due: boolean; reason: string } {
  if (alreadyFollowedUp) {
    return { due: false, reason: "one substantive follow-up has already been sent" };
  }
  if (target.status !== "SUBMITTED") {
    return { due: false, reason: `publisher status is ${target.status}` };
  }
  const start = Date.parse("2026-09-07T00:00:00Z");
  const end = Date.parse("2026-09-10T23:59:59Z");
  const stamp = today.getTime();
  if (stamp < start) return { due: false, reason: "before the follow-up window opens on 2026-09-07" };
  if (stamp > end) return { due: false, reason: "the follow-up window closed on 2026-09-10" };
  return { due: true, reason: "inside the follow-up window with no response recorded — requires explicit send authorization" };
}
