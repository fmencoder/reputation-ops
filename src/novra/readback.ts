/**
 * Read-back verification.
 *
 * WordPress does not reliably tell you what it removed. Three sanitisation
 * behaviours were confirmed on this site by diffing payloads against their
 * echoes: inline SVG is stripped and *reported*, SVG upload is rejected with an
 * error, and `inset` is stripped from a style attribute **silently, with an
 * empty `_content_warnings`**. The third is the reason this module exists.
 * Trusting the warnings field is how a page ships with its layout quietly
 * removed.
 *
 * So: census the expected markup, census what came back, and report the
 * difference. Structural, not textual — WordPress legitimately reformats
 * whitespace and may rewrite a URL to its CDN, and a diff that screams about
 * those is a diff nobody reads.
 */

export type ReadbackStatus = "match" | "degraded" | "mismatch";

export type PictureStrategy = "primary" | "fallback" | "none";

export interface ReadbackDiff {
  readonly status: ReadbackStatus;
  readonly pictureStrategy: PictureStrategy;
  readonly missingElements: readonly { tag: string; expected: number; actual: number }[];
  readonly missingAttributes: readonly { tag: string; attribute: string }[];
  readonly missingStyleProperties: readonly string[];
  readonly rewrittenUrls: readonly { expected: string; actual: string | null }[];
  readonly findings: readonly string[];
}

/** Tags whose loss changes what the page means, not merely how it looks. */
const STRUCTURAL_TAGS = [
  "figure", "figcaption", "picture", "source", "img", "section", "article",
  "h1", "h2", "h3", "a", "table", "blockquote",
];

/** Attributes whose loss breaks accessibility, layout stability or semantics. */
const CRITICAL_ATTRIBUTES = ["alt", "width", "height", "srcset", "media", "href", "src", "class"];

function tagCensus(html: string): Map<string, number> {
  const census = new Map<string, number>();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b/gi)) {
    const tag = (match[1] ?? "").toLowerCase();
    census.set(tag, (census.get(tag) ?? 0) + 1);
  }
  return census;
}

function attributeCensus(html: string): Map<string, Set<string>> {
  const census = new Map<string, Set<string>>();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const tag = (match[1] ?? "").toLowerCase();
    const attrs = match[2] ?? "";
    const set = census.get(tag) ?? new Set<string>();
    for (const attrMatch of attrs.matchAll(/([a-zA-Z-]+)\s*=\s*"/g)) {
      const name = (attrMatch[1] ?? "").toLowerCase();
      if (name) set.add(name);
    }
    census.set(tag, set);
  }
  return census;
}

/**
 * Property names used across every inline style attribute.
 *
 * This is the check that catches the silent class of failure: `inset` vanished
 * from a deployed page with no warning of any kind, and only a property-level
 * comparison surfaced it.
 */
function styleProperties(html: string): Set<string> {
  const properties = new Set<string>();
  for (const match of html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) {
    for (const declaration of (match[1] ?? "").split(";")) {
      const name = declaration.split(":")[0]?.trim().toLowerCase();
      if (name) properties.add(name);
    }
  }
  return properties;
}

function imageSources(html: string): string[] {
  return [...html.matchAll(/\b(?:src|srcset)\s*=\s*"([^"]+)"/gi)].map((m) => m[1] ?? "");
}

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() ?? url;
}

export function detectPictureStrategy(html: string): PictureStrategy {
  if (/<picture\b/i.test(html) && /<source\b/i.test(html)) return "primary";
  if (/class="[^"]*figure__mobile/i.test(html) && /class="[^"]*figure__desktop/i.test(html)) {
    return "fallback";
  }
  return "none";
}

export interface ReadbackOptions {
  /** Author URL that every article must still link to after sanitisation. */
  readonly authorHref?: string;
}

/**
 * Compare what was sent with what WordPress stored.
 *
 * `degraded` means the page still works but lost something worth knowing about
 * — the responsive strategy fell back, a style property was dropped. `mismatch`
 * means a structural element or a critical attribute is gone and the page
 * should not be considered deployed.
 */
export function compareReadback(
  expected: string,
  actual: string,
  options: ReadbackOptions = {},
): ReadbackDiff {
  const findings: string[] = [];

  const expectedTags = tagCensus(expected);
  const actualTags = tagCensus(actual);
  const missingElements: { tag: string; expected: number; actual: number }[] = [];

  for (const tag of STRUCTURAL_TAGS) {
    const want = expectedTags.get(tag) ?? 0;
    const got = actualTags.get(tag) ?? 0;
    if (got < want) {
      missingElements.push({ tag, expected: want, actual: got });
      findings.push(`<${tag}>: sent ${want}, stored ${got}`);
    }
  }

  const expectedAttrs = attributeCensus(expected);
  const actualAttrs = attributeCensus(actual);
  const missingAttributes: { tag: string; attribute: string }[] = [];

  for (const [tag, attrs] of expectedAttrs) {
    const got = actualAttrs.get(tag);
    for (const attribute of attrs) {
      if (!CRITICAL_ATTRIBUTES.includes(attribute)) continue;
      if (!got || !got.has(attribute)) {
        missingAttributes.push({ tag, attribute });
        findings.push(`<${tag}> lost its ${attribute} attribute`);
      }
    }
  }

  const expectedStyles = styleProperties(expected);
  const actualStyles = styleProperties(actual);
  const missingStyleProperties = [...expectedStyles].filter((p) => !actualStyles.has(p));
  for (const property of missingStyleProperties) {
    findings.push(`CSS property "${property}" was stripped from an inline style — silently`);
  }

  // URLs may legitimately be rewritten to a CDN host, so compare filenames
  // rather than full URLs. A missing filename is a real loss; a changed host is
  // not.
  const actualNames = new Set(imageSources(actual).map(basename));
  const rewrittenUrls: { expected: string; actual: string | null }[] = [];
  for (const source of imageSources(expected)) {
    const name = basename(source);
    if (!actualNames.has(name)) {
      rewrittenUrls.push({ expected: source, actual: null });
      findings.push(`image source "${name}" is not present in the stored markup`);
    }
  }

  const pictureStrategy = detectPictureStrategy(actual);
  const expectedStrategy = detectPictureStrategy(expected);
  if (expectedStrategy === "primary" && pictureStrategy !== "primary") {
    findings.push(
      `responsive strategy degraded: sent <picture>, stored "${pictureStrategy}"`,
    );
  }

  if (options.authorHref && expected.includes(options.authorHref) && !actual.includes(options.authorHref)) {
    findings.push(`author link ${options.authorHref} is missing from the stored markup`);
  }

  const headingOrderBroken = hasHeadingSkip(actual);
  if (headingOrderBroken && !hasHeadingSkip(expected)) {
    findings.push("heading order was intact when sent and skips a level as stored");
  }

  const structuralLoss =
    missingElements.some((m) => m.tag !== "picture" && m.tag !== "source") ||
    missingAttributes.length > 0 ||
    rewrittenUrls.length > 0 ||
    headingOrderBroken;

  const status: ReadbackStatus = structuralLoss
    ? "mismatch"
    : findings.length > 0
      ? "degraded"
      : "match";

  return {
    status,
    pictureStrategy,
    missingElements,
    missingAttributes,
    missingStyleProperties,
    rewrittenUrls,
    findings,
  };
}

export function hasHeadingSkip(html: string): boolean {
  let previous = 0;
  for (const match of html.matchAll(/<h([1-6])\b/gi)) {
    const level = Number(match[1]);
    if (previous !== 0 && level > previous + 1) return true;
    previous = level;
  }
  return false;
}
