/**
 * Canonical placeholder scanner.
 *
 * One implementation, used by CI, by the pre-deploy gate and by the launch
 * gate, so the three can never disagree about whether the site is clean.
 *
 * The distinction that matters is not "is there a placeholder" but "would this
 * placeholder reach a reader". An engineering TODO in a build script is fine.
 * `PLACEHOLDER_CONTACT_EMAIL` rendered on the Contact page is not. Scoring them
 * the same way produces a gate everyone learns to override, which is worse than
 * having no gate.
 */

/** Tokens that must never appear in public-facing content. */
export const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /PLACEHOLDER_[A-Z0-9_]*/g,
  /\[UNVERIFIED\]/g,
  /TODO_PUBLIC/g,
  /TBD_PUBLIC/g,
  /REPLACE_ME/g,
];

export type PlaceholderSeverity =
  /** Reaches a reader. Blocks deployment of its page and blocks launch. */
  | "blocking"
  /** A per-article template variable, resolved when the article is published. */
  | "template"
  /** Internal notes, runbooks, worklists. Never deployed. */
  | "internal";

export interface PlaceholderHit {
  readonly file: string;
  readonly line: number;
  readonly token: string;
  readonly severity: PlaceholderSeverity;
  readonly context: string;
}

export interface ScanInput {
  readonly path: string;
  readonly content: string;
}

/**
 * Paths whose contents are deployed to a reader. Everything else is internal.
 * Deliberately a prefix list rather than a regex: a new deployable directory
 * should have to be added here consciously.
 */
const PUBLIC_PREFIXES = ["site/pages/", "site/partials/", "site/dist/", "content/"];

/** Deployable, but placeholders in it are per-article variables by design. */
const TEMPLATE_PREFIXES = ["site/templates/"];

/**
 * A content file whose front matter says `status: template` is a scaffold for
 * future articles, not a draft awaiting publication. Its placeholders are the
 * fields an author fills in, which is what a template is for.
 */
function isTemplateDocument(content: string): boolean {
  if (!content.startsWith("---")) return false;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return false;
  return /^status:\s*template\s*$/m.test(content.slice(3, end));
}

function severityFor(path: string, line: string): PlaceholderSeverity {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");

  if (TEMPLATE_PREFIXES.some((p) => normalized.startsWith(p))) return "template";

  // structured-data.json ships per-article templates alongside live nodes. The
  // live nodes must be clean; the *_template nodes carry variables on purpose.
  if (normalized.endsWith("site/structured-data.json")) {
    return /_TITLE|_META_DESCRIPTION|_ISO_DATE|_SLUG/.test(line) ? "template" : "blocking";
  }

  return PUBLIC_PREFIXES.some((p) => normalized.startsWith(p)) ? "blocking" : "internal";
}

/**
 * Scan file contents for placeholder tokens.
 *
 * Takes contents rather than reading from disk so the same function is used by
 * the CLI, by the deployer against generated markup, and by tests against
 * fixtures — with no filesystem in the test path.
 */
export function scanPlaceholders(files: readonly ScanInput[]): readonly PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];

  for (const file of files) {
    const templateDocument = isTemplateDocument(file.content);
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      for (const pattern of PLACEHOLDER_PATTERNS) {
        // Patterns are module-level and /g, so lastIndex must be reset per use.
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null) {
          hits.push({
            file: file.path,
            line: i + 1,
            token: match[0],
            severity: templateDocument ? "template" : severityFor(file.path, line),
            context: line.trim().slice(0, 160),
          });
          if (match.index === pattern.lastIndex) pattern.lastIndex++;
        }
      }
    }
  }

  return hits;
}

/** Placeholders that block a public launch. */
export function blockingPlaceholders(
  hits: readonly PlaceholderHit[],
): readonly PlaceholderHit[] {
  return hits.filter((h) => h.severity === "blocking");
}
