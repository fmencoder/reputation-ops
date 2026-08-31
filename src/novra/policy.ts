/**
 * Project-policy checks that are not about correctness but about what this
 * project has promised never to publish.
 *
 * These exist because every one of them is a mistake that is easy to make in
 * good faith and expensive to unmake once a search engine has indexed it.
 */

export interface PolicyFinding {
  readonly rule: string;
  readonly file: string;
  readonly line: number;
  readonly detail: string;
  readonly excerpt: string;
}

export interface PolicyInput {
  readonly path: string;
  readonly content: string;
}

/**
 * BUILDFLOW_PUBLIC_DISCLOSURE=false.
 *
 * The association must not appear in anything a reader can reach. Internal
 * operational references stay allowed: the boundary is deployability, not the
 * word itself.
 */
const BUILDFLOW = /buildflow/i;

/**
 * Counters the concept board rendered that were never supported by fact.
 * Matches a number immediately qualifying one of the claim nouns, which is what
 * distinguishes "50+ research papers" from the section heading "Research".
 */
const FABRICATED_METRIC =
  /\b\d[\d,.]*\s*\+?\s*(?:years?(?:\s+of\s+experience)?|research\s+papers?|papers?\s+published|projects?\s+(?:tracked|completed|delivered)|systems?\s+analy[sz]ed|clients?|customers?|employees?)\b/i;

/** A percentage presented as an achievement rather than an arithmetic result. */
/*
 * Requires the trailing "score"/"rate" noun. Without it the pattern matches
 * ordinary arithmetic prose — "the task ends at 60% success" inside an article
 * about compounding reliability is the calculation, not a marketing claim.
 */
const FABRICATED_SCORE =
  /\b\d{1,3}(?:\.\d+)?%\s*(?:impact|success|satisfaction|accuracy|completion)\s+(?:score|rating)\b/i;

/** Self-conferred credentials the identity sheet forbids asserting. */
const UNVERIFIED_CREDENTIAL =
  /\b(?:PhD|Ph\.D\.|MBA|B\.?Sc|M\.?Sc|award[- ]winning|best[- ]selling|as\s+(?:seen|featured)\s+(?:in|on))\b/i;

/**
 * Deployable HTML that references an .svg as an image source.
 *
 * WordPress rejects image/svg+xml uploads and strips inline SVG, so any such
 * reference is guaranteed to render as a broken image once deployed. Scoped to
 * image sources: `<link rel="icon">` is a site setting, not media content, and
 * is legitimately an SVG.
 */
const SVG_IMAGE_SOURCE = /\b(?:src|srcset)\s*=\s*"[^"]*\.svg"/i;
const SVG_OG_IMAGE = /<meta[^>]+property\s*=\s*"og:image"[^>]+content\s*=\s*"[^"]*\.svg"/i;

/** Public prefixes — the same boundary the placeholder scanner uses. */
const PUBLIC_PREFIXES = ["site/pages/", "site/partials/", "site/templates/", "site/dist/", "content/"];

function isPublic(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
  return PUBLIC_PREFIXES.some((p) => normalized.startsWith(p));
}

interface Rule {
  readonly id: string;
  readonly pattern: RegExp;
  readonly detail: string;
  readonly publicOnly: boolean;
  /**
   * Whether HTML comments count.
   *
   * For claim rules the answer is no: a comment explaining *why* a fabricated
   * metric was removed is the opposite of publishing it, and flagging it trains
   * people to delete the explanation. For the BuildFlow rule the answer is yes —
   * a comment ships in the source and is one view-source away from a reader.
   */
  readonly scanComments: boolean;
}

const RULES: readonly Rule[] = [
  { id: "buildflow-disclosure", pattern: BUILDFLOW, publicOnly: true, scanComments: true,
    detail: "BUILDFLOW_PUBLIC_DISCLOSURE=false — the association must not appear in deployable content, comments included." },
  { id: "fabricated-metric", pattern: FABRICATED_METRIC, publicOnly: true, scanComments: false,
    detail: "Unsupported counter. The concept board's metrics were placeholders and must not be reproduced." },
  { id: "fabricated-score", pattern: FABRICATED_SCORE, publicOnly: true, scanComments: false,
    detail: "Achievement percentage with no source. Arithmetic results inside an article are fine; a headline score is not." },
  { id: "unverified-credential", pattern: UNVERIFIED_CREDENTIAL, publicOnly: true, scanComments: false,
    detail: "Degree, award or media-coverage claim. Nothing here is verified, so nothing may be asserted." },
  { id: "svg-image-source", pattern: SVG_IMAGE_SOURCE, publicOnly: true, scanComments: false,
    detail: "SVG referenced as an image source. WordPress rejects image/svg+xml; this renders broken. Reference the .webp." },
  { id: "svg-og-image", pattern: SVG_OG_IMAGE, publicOnly: true, scanComments: false,
    detail: "og:image points at an SVG. Most social and search crawlers will not render it." },
];

/**
 * Blank out comment bodies while preserving line numbers, so a finding still
 * points at the right line.
 */
function maskComments(content: string): string {
  const masked = content.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, " "));
  return masked.replace(/^(\s*)(?:\/\/|#)\s.*$/gm, (match) => match.replace(/[^\n]/g, " "));
}

export function checkPolicy(files: readonly PolicyInput[]): readonly PolicyFinding[] {
  const findings: PolicyFinding[] = [];

  for (const file of files) {
    const pub = isPublic(file.path);
    const lines = file.content.split("\n");
    const maskedLines = maskComments(file.content).split("\n");

    for (const rule of RULES) {
      if (rule.publicOnly && !pub) continue;
      const source = rule.scanComments ? lines : maskedLines;
      for (let i = 0; i < source.length; i++) {
        const line = source[i] ?? "";
        if (rule.pattern.test(line)) {
          findings.push({
            rule: rule.id,
            file: file.path,
            line: i + 1,
            detail: rule.detail,
            excerpt: (lines[i] ?? "").trim().slice(0, 160),
          });
        }
      }
    }
  }

  return findings;
}

/**
 * sameAs may only carry a URL that has been positively verified as controlled
 * by the subject. There are 400+ same-name people, so a wrong entry instructs
 * search engines to merge the subject with a stranger — the exact failure this
 * project exists to prevent.
 *
 * The key being absent is the correct state, not a gap to fill.
 */
export function checkSameAs(
  personNode: Record<string, unknown>,
  verified: readonly string[],
): readonly PolicyFinding[] {
  const raw = personNode["sameAs"];
  if (raw === undefined) return [];

  const entries = Array.isArray(raw) ? raw : [raw];
  const findings: PolicyFinding[] = [];

  for (const entry of entries) {
    if (typeof entry !== "string") {
      findings.push({
        rule: "sameas-not-a-url", file: "site/structured-data.json", line: 0,
        detail: "sameAs entries must be URL strings.", excerpt: JSON.stringify(entry).slice(0, 160),
      });
      continue;
    }
    if (/PLACEHOLDER|UNVERIFIED|example\.com|TBD/i.test(entry)) {
      findings.push({
        rule: "sameas-placeholder", file: "site/structured-data.json", line: 0,
        detail: "sameAs carries a placeholder. Remove the key entirely rather than shipping a guess.", excerpt: entry,
      });
      continue;
    }
    if (!verified.includes(entry)) {
      findings.push({
        rule: "sameas-unverified", file: "site/structured-data.json", line: 0,
        detail: "sameAs URL is not on the verified-profile list. Verify control and public resolution first.", excerpt: entry,
      });
    }
  }

  return findings;
}
