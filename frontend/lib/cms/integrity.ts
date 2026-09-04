/**
 * Content integrity: the rules that decide whether a body is a whole article.
 *
 * The preview that was rejected rendered five articles as a title, a standfirst
 * and a byline reading "1 min read". Nothing had crashed. The live REST body
 * had failed to parse and come back empty, the canonical snapshot had been left
 * out of the deployment to save bytes, and the only invariant in the loader
 * asked whether an article existed — not whether it had anything in it. Five
 * records with five empty bodies satisfied it.
 *
 * So completeness is measured here, and measured against the canonical article
 * rather than against zero. An empty body, an excerpt wearing a body's name, a
 * wrapper fragment and a body that has lost four fifths of its words are all
 * the same failure, and all of them stop a build.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#8217": "’",
  "#8216": "‘",
  "#8220": "“",
  "#8221": "”",
  "#8211": "–",
  "#8212": "—",
  "#039": "'",
};

/** Visible text, with tags removed and entities resolved. */
export function textOf(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&([a-z]+|#\d+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(html: string): number {
  const text = textOf(html);
  return text ? text.split(" ").length : 0;
}

/** Words per minute. Rounded, never below one minute. */
export const WPM = 220;

/**
 * Reading time for a body, derived and never inherited.
 *
 * The rejected preview showed "1 min read" beside every article because the
 * value was computed from an empty body. It is computed from the final
 * canonical body now, after the merge, so the number and the words a reader
 * scrolls through are always the same thing.
 */
export function readingTime(html: string): string {
  return `${Math.max(1, Math.round(wordCount(html) / WPM))} min read`;
}

/** The floor below which no published article on this site can plausibly sit. */
export const MIN_ARTICLE_WORDS = 400;

/** How much of the canonical body a live fetch may lose and still be believed. */
export const MIN_RETENTION = 0.8;

export interface BodyReport {
  ok: boolean;
  words: number;
  paragraphs: number;
  headings: number;
  reasons: string[];
}

export interface BodyExpectation {
  /** Words in the excerpt. A body that is merely the excerpt is not a body. */
  excerptWords?: number;
  /** Words in the canonical snapshot body, when this article has one. */
  canonicalWords?: number;
  /** Headings in the canonical snapshot body, when this article has one. */
  canonicalHeadings?: number;
}

/**
 * Judge a body against what the article is known to contain.
 *
 * Used in two places with the same rules: to decide whether a live REST body may
 * override the canonical one, and to gate the build on what will actually be
 * rendered.
 */
export function inspectBody(html: string, expect: BodyExpectation = {}): BodyReport {
  const words = wordCount(html);
  const paragraphs = (html.match(/<p[\s>]/gi) ?? []).length;
  const headings = (html.match(/<h[2-4][\s>]/gi) ?? []).length;
  const reasons: string[] = [];

  if (!html.trim()) reasons.push("body is empty");
  if (words < MIN_ARTICLE_WORDS) {
    reasons.push(`body has ${words} words, below the ${MIN_ARTICLE_WORDS}-word floor`);
  }
  if (paragraphs < 2) reasons.push(`body has ${paragraphs} paragraph elements`);

  if (expect.excerptWords && words < expect.excerptWords * 3) {
    reasons.push(`body (${words} words) is not materially longer than the excerpt (${expect.excerptWords} words)`);
  }

  if (expect.canonicalWords) {
    const floor = Math.round(expect.canonicalWords * MIN_RETENTION);
    if (words < floor) {
      reasons.push(
        `body has ${words} words against a canonical ${expect.canonicalWords}; below the ${Math.round(MIN_RETENTION * 100)}% retention floor of ${floor}`,
      );
    }
  }

  if (expect.canonicalHeadings && expect.canonicalHeadings >= 2 && headings === 0) {
    reasons.push(`body has no headings against a canonical ${expect.canonicalHeadings}`);
  }

  /*
   * A body that still carries the byline or the hero is the wrapper, not the
   * region inside it. Rendering it would repeat the page furniture inside the
   * article, which reads as a bug long before anyone counts the words.
   */
  if (/class="(?:article__(?:byline|hero|head)|sources)"/.test(html)) {
    reasons.push("body is a wrapper fragment: it still carries page furniture");
  }

  return { ok: reasons.length === 0, words, paragraphs, headings, reasons };
}
