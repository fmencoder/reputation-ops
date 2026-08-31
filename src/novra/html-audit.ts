/**
 * Structural audit of built HTML.
 *
 * Regex-based rather than DOM-based on purpose: the input is markup this
 * repository generates from its own templates, not arbitrary web HTML, and a
 * parser dependency would have to be kept in sync with the WordPress
 * sanitiser's behaviour anyway. The checks below are the ones that have
 * actually caught defects here — missing alt text, a skipped heading level, an
 * image with no intrinsic size, an SVG referenced where a raster is required.
 */

export type AuditSeverity = "error" | "warning";

export interface AuditFinding {
  readonly rule: string;
  readonly severity: AuditSeverity;
  readonly page: string;
  readonly detail: string;
  readonly excerpt?: string;
}

export interface PageInput {
  /** Deployed path, e.g. "/technology/". Used for canonical comparison. */
  readonly path: string;
  readonly html: string;
}

export interface AuditOptions {
  readonly domain: string;
  /** Deployed paths that an internal link may legitimately point at. */
  readonly knownPaths: readonly string[];
}

const TAG_ATTR = (attr: string) => new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, "i");

function attr(tag: string, name: string): string | undefined {
  return TAG_ATTR(name).exec(tag)?.[1];
}

function hasAttr(tag: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`, "i").test(tag);
}

/** Strip comments and script/style bodies before scanning for content. */
function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function auditImages(page: PageInput, out: AuditFinding[]): void {
  const html = stripNonContent(page.html);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const excerpt = tag.slice(0, 140);
    const decorative = attr(tag, "aria-hidden") === "true" || attr(tag, "role") === "presentation";
    const alt = attr(tag, "alt");

    if (alt === undefined) {
      out.push({ rule: "img-alt-missing", severity: "error", page: page.path, excerpt,
        detail: "<img> has no alt attribute. A decorative image needs alt=\"\" plus aria-hidden, not omission." });
    } else if (alt.trim() === "" && !decorative) {
      out.push({ rule: "img-alt-empty", severity: "error", page: page.path, excerpt,
        detail: "Empty alt on a non-decorative image. Mark it aria-hidden if it truly carries nothing." });
    } else if (alt.trim().length > 0 && alt.trim().length < 15) {
      out.push({ rule: "img-alt-thin", severity: "warning", page: page.path, excerpt,
        detail: `Alt text is ${alt.trim().length} characters. Diagrams need a description, not a label.` });
    }

    if (!attr(tag, "width") || !attr(tag, "height")) {
      out.push({ rule: "img-dimensions-missing", severity: "error", page: page.path, excerpt,
        detail: "No intrinsic width/height. The box is not reserved and the page shifts as the image lands." });
    }

    const src = attr(tag, "src") ?? "";
    if (src.endsWith(".svg")) {
      out.push({ rule: "img-svg-source", severity: "error", page: page.path, excerpt,
        detail: "SVG as an <img> source. WordPress rejects image/svg+xml uploads; this cannot render once deployed." });
    }
  }

  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = match[0];
    if (!attr(tag, "srcset")) {
      out.push({ rule: "source-srcset-missing", severity: "error", page: page.path, excerpt: tag.slice(0, 140),
        detail: "<source> without srcset. The fallback transform cannot derive a dual-image pair from it." });
    }
    if (!attr(tag, "width") || !attr(tag, "height")) {
      out.push({ rule: "source-dimensions-missing", severity: "error", page: page.path, excerpt: tag.slice(0, 140),
        detail: "<source> without width/height. The mobile aspect ratio is not reserved before load." });
    }
  }
}

function auditHeadings(page: PageInput, out: AuditFinding[]): void {
  const html = stripNonContent(page.html);
  const levels: { level: number; text: string }[] = [];

  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const level = Number(match[1]);
    const text = (match[2] ?? "").replace(/<[^>]+>/g, "").trim();
    levels.push({ level, text });
  }

  const h1s = levels.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    out.push({ rule: "h1-missing", severity: "error", page: page.path, detail: "No <h1> on the page." });
  } else if (h1s.length > 1) {
    out.push({ rule: "h1-duplicate", severity: "error", page: page.path,
      detail: `${h1s.length} <h1> elements. Exactly one names the page.` });
  }

  let previous = 0;
  for (const heading of levels) {
    if (previous !== 0 && heading.level > previous + 1) {
      out.push({ rule: "heading-order-skip", severity: "error", page: page.path,
        excerpt: `h${previous} -> h${heading.level}: "${heading.text.slice(0, 60)}"`,
        detail: `Heading level skips from h${previous} to h${heading.level}. Insert the intermediate level, visually hidden if it should not show.` });
    }
    previous = heading.level;
  }
}

function auditMetadata(page: PageInput, options: AuditOptions, out: AuditFinding[]): void {
  const { html } = page;

  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
  if (!title) {
    out.push({ rule: "title-missing", severity: "error", page: page.path, detail: "No <title>." });
  }

  const description = /<meta\b[^>]*\bname\s*=\s*"description"[^>]*>/i.exec(html)?.[0];
  const descriptionValue = description ? attr(description, "content")?.trim() : undefined;
  if (!descriptionValue) {
    out.push({ rule: "description-missing", severity: "error", page: page.path, detail: "No meta description." });
  } else if (descriptionValue.length < 50) {
    out.push({ rule: "description-thin", severity: "warning", page: page.path,
      detail: `Meta description is ${descriptionValue.length} characters.` });
  }

  const canonicalTag = /<link\b[^>]*\brel\s*=\s*"canonical"[^>]*>/i.exec(html)?.[0];
  const canonical = canonicalTag ? attr(canonicalTag, "href") : undefined;
  if (!canonical) {
    out.push({ rule: "canonical-missing", severity: "error", page: page.path, detail: "No canonical link." });
    return;
  }

  const expected = `https://${options.domain}${page.path}`;
  if (canonical !== expected) {
    out.push({ rule: "canonical-mismatch", severity: "error", page: page.path, excerpt: canonical,
      detail: `Canonical should be ${expected}.` });
  }
  if (!canonical.startsWith("https://")) {
    out.push({ rule: "canonical-not-https", severity: "error", page: page.path, excerpt: canonical,
      detail: "Canonical must be absolute and https." });
  }
}

function auditLinks(page: PageInput, options: AuditOptions, out: AuditFinding[]): void {
  const html = stripNonContent(page.html);
  const ids = new Set(
    [...html.matchAll(/\bid\s*=\s*"([^"]+)"/gi)].map((m) => m[1] ?? ""),
  );

  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const href = attr(tag, "href");
    if (!href) {
      out.push({ rule: "link-href-missing", severity: "error", page: page.path, excerpt: tag.slice(0, 120),
        detail: "<a> with no href." });
      continue;
    }
    if (/^(?:https?:|mailto:|tel:)/i.test(href)) continue;

    const [pathPart = "", fragment] = href.split("#");
    if (pathPart === "" && fragment) {
      if (!ids.has(fragment)) {
        out.push({ rule: "link-anchor-broken", severity: "error", page: page.path, excerpt: href,
          detail: `No element with id="${fragment}" on this page.` });
      }
      continue;
    }
    if (!options.knownPaths.includes(pathPart)) {
      out.push({ rule: "link-target-unknown", severity: "error", page: page.path, excerpt: href,
        detail: `Internal link points at "${pathPart}", which is not a deployed path.` });
    }
  }
}

function auditJsonLd(page: PageInput, out: AuditFinding[]): void {
  for (const match of page.html.matchAll(
    /<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const body = match[1] ?? "";
    try {
      JSON.parse(body);
    } catch (error) {
      out.push({ rule: "jsonld-malformed", severity: "error", page: page.path,
        excerpt: body.trim().slice(0, 140),
        detail: `Inline JSON-LD does not parse: ${(error as Error).message}` });
    }
  }
}

function auditFigures(page: PageInput, out: AuditFinding[]): void {
  const html = stripNonContent(page.html);
  for (const match of html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)) {
    const body = match[1] ?? "";
    if (!/<figcaption\b/i.test(body)) {
      out.push({ rule: "figure-caption-missing", severity: "warning", page: page.path,
        detail: "<figure> without a <figcaption>. A figure worth framing is worth captioning." });
    }
    if (!/<img\b/i.test(body)) {
      out.push({ rule: "figure-empty", severity: "error", page: page.path,
        detail: "<figure> contains no image." });
    }
  }
}

export function auditPages(
  pages: readonly PageInput[],
  options: AuditOptions,
): readonly AuditFinding[] {
  const findings: AuditFinding[] = [];
  const canonicals = new Map<string, string[]>();

  for (const page of pages) {
    auditImages(page, findings);
    auditHeadings(page, findings);
    auditMetadata(page, options, findings);
    auditLinks(page, options, findings);
    auditJsonLd(page, findings);
    auditFigures(page, findings);

    const canonicalTag = /<link\b[^>]*\brel\s*=\s*"canonical"[^>]*>/i.exec(page.html)?.[0];
    const canonical = canonicalTag ? attr(canonicalTag, "href") : undefined;
    if (canonical) {
      const seen = canonicals.get(canonical) ?? [];
      seen.push(page.path);
      canonicals.set(canonical, seen);
    }
  }

  for (const [canonical, paths] of canonicals) {
    if (paths.length > 1) {
      findings.push({ rule: "canonical-duplicate", severity: "error", page: paths.join(", "),
        excerpt: canonical, detail: "Two pages declare the same canonical URL." });
    }
  }

  return findings;
}

/**
 * Image sources referenced by deployable markup, in the order encountered.
 * Drives the media sync: what a page references is exactly what must exist in
 * the Media Library before that page can be deployed.
 */
export function referencedAssets(html: string): readonly string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/\b(?:src|srcset)\s*=\s*"(\/assets\/[^"]+)"/gi)) {
    const value = match[1];
    if (value) found.add(value);
  }
  return [...found];
}

export { hasAttr };
