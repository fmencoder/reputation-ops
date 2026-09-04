/**
 * The WordPress.com REST client.
 *
 * WordPress stays the CMS; it stops being the renderer. This talks to the
 * public REST surface — structured data, never scraped HTML pages — and hands
 * back the frontend's own types with WordPress presentation removed.
 *
 * It is allowed to fail, and failing is not allowed to cost anything. Builds
 * run in environments without egress to public-api.wordpress.com (the migration
 * sandbox is one), so every call returns null rather than throwing. Nothing here
 * decides what gets published: the caller holds the canonical snapshot and takes
 * a live body only when that body measures up as a whole article.
 */
import { cms } from "../site";
import type { Article } from "./types";
import { normalizeBody, plainText } from "./normalize";

const TIMEOUT_MS = 8000;

interface WpPost {
  id: number;
  slug: string;
  link: string;
  date_gmt: string;
  modified_gmt: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
}

async function getJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${cms.restBase}${path}`, {
      signal: controller.signal,
      // Content changes rarely and the pages are statically generated; an hour
      // of staleness is cheaper than a request per visitor.
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Split a published article into its parts before presentation is stripped.
 *
 * The articles were published as one HTML block carrying the byline, hero,
 * body and citations together, because that was the only way to give
 * WordPress a complete design. The frontend renders those parts itself, so
 * the body has to be lifted out of the wrapper — and the class names that
 * identify it survive only until normalizeBody runs, which is why this
 * happens first.
 *
 * The region is read by counting tags rather than by a lazy regex. The earlier
 * pattern stopped at the first closing div, so any nested element inside the
 * body — a figure, a callout, a list wrapper — truncated the article at that
 * point and the rest was silently dropped. Counting cannot do that: it either
 * finds the matching close or reports that the markup is not what it expected.
 */
function balancedRegion(html: string, openPattern: RegExp): string | null {
  const opening = openPattern.exec(html);
  if (!opening) return null;
  const tag = opening[1] ?? "div";
  const start = opening.index + opening[0].length;
  const scanner = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  scanner.lastIndex = start;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return null;
}

export function extractRegions(rendered: string): { body: string; sources: string } | null {
  const body = balancedRegion(rendered, /<(div)[^>]*class="[^"]*\barticle__body\b[^"]*"[^>]*>/i);
  if (body === null) return null;
  const sources = balancedRegion(rendered, /<(aside)[^>]*class="[^"]*\bsources\b[^"]*"[^>]*>/i);
  return { body, sources: sources ?? "" };
}

/**
 * Live articles, or null when the CMS cannot be reached.
 *
 * Fields the REST API does not carry — the editorial kicker, the reading time,
 * the hero caption — are merged from the snapshot by the caller rather than
 * invented here.
 */
export async function fetchArticles(
  mediaMap: Record<string, string>,
): Promise<Pick<Article, "id" | "slug" | "title" | "excerpt" | "permalink" | "path" | "date" | "modified" | "bodyHtml">[] | null> {
  const posts = await getJson<WpPost[]>("/posts?per_page=20&status=publish&_fields=id,slug,link,date_gmt,modified_gmt,title,excerpt,content");
  if (!posts) return null;
  return posts.map((post) => {
    const regions = extractRegions(post.content.rendered);
    return {
      id: post.id,
      slug: post.slug,
      title: plainText(post.title.rendered),
      excerpt: plainText(post.excerpt.rendered),
      permalink: post.link,
      path: new URL(post.link).pathname,
      date: post.date_gmt,
      modified: post.modified_gmt,
      // No recognisable body region means the CMS markup changed shape. Return
      // an empty string rather than the whole wrapper: the loader measures every
      // live body before it accepts one, and an empty string simply fails that
      // measurement and leaves the canonical body in place.
      bodyHtml: regions ? normalizeBody(regions.body, mediaMap) : "",
    };
  });
}
