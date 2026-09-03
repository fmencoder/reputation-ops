/**
 * The WordPress.com REST client.
 *
 * WordPress stays the CMS; it stops being the renderer. This talks to the
 * public REST surface — structured data, never scraped HTML pages — and hands
 * back the frontend's own types with WordPress presentation removed.
 *
 * It is allowed to fail. Builds run in environments without egress to
 * public-api.wordpress.com (the migration sandbox is one), and a content fetch
 * that throws would turn a network condition into a broken deploy. So every
 * call returns null on failure and the caller falls back to the committed
 * snapshot, which is the same content taken from the same CMS.
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
 */
export function extractRegions(rendered: string): { body: string; sources: string } | null {
  const body = rendered.match(/<div class="article__body">([\s\S]*?)<\/div>\s*(?:<aside|<\/div>)/);
  if (!body) return null;
  const sources = rendered.match(/<aside class="sources">([\s\S]*?)<\/aside>/);
  return { body: body[1], sources: sources ? sources[1] : "" };
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
      // an empty string rather than the whole wrapper: the loader treats that
      // as "keep the snapshot body", which is safer than rendering a second
      // byline and hero inside the article.
      bodyHtml: regions ? normalizeBody(regions.body, mediaMap) : "",
    };
  });
}
