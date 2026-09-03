/**
 * Turns WordPress body HTML into semantic markup the frontend can style.
 *
 * The site had to be published to WordPress.com Free, where Custom CSS is
 * plan-gated, so every rule was flattened into an inline style attribute and
 * then filtered by the platform's sanitiser. Carrying that markup into the new
 * frontend would carry the whole defect with it: fixed pixel widths, no media
 * queries, no hover states, a layout frozen at whatever the flattener could
 * express. So presentation is removed at the boundary and never enters the app.
 *
 * What is kept is structure — headings, paragraphs, lists, tables, figures,
 * quotes, links — because that is what the frontend's own CSS styles.
 */

const PRESENTATION = /\s+(?:class|style|align|width|height|bgcolor|border|cellpadding|cellspacing)="[^"]*"/gi;
const BLOCK_COMMENTS = /<!--\s*\/?wp:[^>]*-->/g;
const EMPTY_WRAPPERS = /<div>\s*<\/div>/g;

/** Media Library URLs become the frontend's own asset paths. */
export function rewriteMedia(html: string, map: Record<string, string>): string {
  return html.replace(/(src|href)="([^"]+)"/g, (whole, attribute: string, url: string) => {
    const local = map[url];
    return local ? `${attribute}="${local}"` : whole;
  });
}

export function normalizeBody(html: string, mediaMap: Record<string, string> = {}): string {
  const stripped = html
    .replace(BLOCK_COMMENTS, "")
    .replace(PRESENTATION, "")
    .replace(EMPTY_WRAPPERS, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, ">\n<")
    .trim();
  return rewriteMedia(stripped, mediaMap);
}

/** WordPress renders titles and excerpts with entities and its own wrappers. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&hellip;/g, "…")
    .trim();
}
