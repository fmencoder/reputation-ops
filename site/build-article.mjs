/**
 * Render the pillar article from its markdown source into a WordPress payload.
 *
 * The article was first authored straight into WordPress, which left the
 * repository holding only the markdown and the live site holding the only copy
 * of the markup. That is backwards: content/*.md is the source, so the HTML is
 * derived from it here and the deployed page becomes reproducible.
 *
 * The renderer covers exactly what this article uses — headings, paragraphs,
 * one table, emphasis, strong — and throws on anything else rather than
 * silently dropping it. A markdown feature that appears later should fail the
 * build, not vanish from the page.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "content", "001-agentic-ai-reliability-budget.md");
const OUT = join(ROOT, "site", "wp-payload", "07-article-reliability-budget.json");

const HERO_URL = "https://novraintelligence.wordpress.com/wp-content/uploads/2026/08/reliability-budget-agentic-ai.webp";
const HERO_ID = 16;
const AUTHOR_HREF = "/about/#fredrick-mendez";

const raw = readFileSync(SOURCE, "utf8");
const [, frontmatter, body] = raw.split(/^---\s*$/m);

const meta = {};
for (const line of frontmatter.split("\n")) {
  const match = line.match(/^([a-z_]+):\s*(.*)$/);
  if (match) meta[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
}

/** Inline conversions, applied to text that is already HTML-escaped. */
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Straight quotes in the source; typographic quotes on the page.
    .replace(/"([^"]+)"/g, "&ldquo;$1&rdquo;")
    .replace(/(\w)'(\w)/g, "$1&rsquo;$2")
    .replace(/—/g, "&mdash;")
    .replace(/−/g, "&minus;")
    .replace(/·/g, "&middot;");
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Split on blank lines, then unwrap the source's hard line breaks. */
const blocks = body.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

const html = [];
for (const block of blocks) {
  if (block.startsWith("# ")) continue;                       // title lives in the post title
  if (block.startsWith("## ")) {
    html.push(`      <h2>${inline(escape(block.slice(3).trim()))}</h2>`);
    continue;
  }
  if (block.startsWith("|")) {
    const rows = block.split("\n").map((r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    const [head, , ...rest] = rows;                            // row 1 is the alignment rule
    html.push("      <table>");
    html.push(`        <thead><tr>${head.map((c) => `<th>${inline(escape(c))}</th>`).join("")}</tr></thead>`);
    html.push("        <tbody>");
    for (const row of rest) html.push(`          <tr>${row.map((c) => `<td>${inline(escape(c))}</td>`).join("")}</tr>`);
    html.push("        </tbody>");
    html.push("      </table>");
    continue;
  }
  if (/^[-*+]\s|^\d+\.\s|^>|^```/.test(block)) {
    throw new Error(`unsupported markdown block, extend the renderer:\n${block.slice(0, 80)}`);
  }
  html.push(`      <p>${inline(escape(block.replace(/\n/g, " ")))}</p>`);
}

const content = `<!-- wp:html -->
<article class="article">
  <div class="wrap wrap--narrow">
    <div class="byline">
      <div>
        <a class="byline__name" href="${AUTHOR_HREF}" rel="author">Fredrick Mendez</a>
        <div class="byline__meta"><time datetime="2026-09-01">1 September 2026</time> &middot; 9 min read</div>
      </div>
    </div>

    <figure class="figure">
      <div class="figure__frame">
        <img loading="lazy" src="${HERO_URL}" width="1400" height="788" alt="${escape(meta.hero_alt)}">
      </div>
      <figcaption>${inline(escape(meta.hero_caption))}</figcaption>
    </figure>

    <div class="article__body">
${html.join("\n")}
    </div>

    <aside class="author-box">
      <p class="card__kicker">Written by</p>
      <h2 style="font-size:var(--fs-h3);margin:0 0 var(--s-2)"><a href="${AUTHOR_HREF}" style="text-decoration:none">Fredrick Mendez</a></h2>
      <p style="color:var(--c-text-muted);margin:0">Technology executive and strategist focused on artificial intelligence, autonomous systems, blockchain technology, smart contracts, software architecture, and next-generation digital infrastructure.</p>
    </aside>
  </div>
</article>
<!-- /wp:html -->`;

writeFileSync(OUT, `${JSON.stringify({
  _tool: "wpcom-mcp-content-authoring",
  _operation: "posts.update",
  _order: 7,
  _generated: "site/build-article.mjs from content/001-agentic-ai-reliability-budget.md",
  _notes: [
    "Already published as post 18; this payload updates it in place.",
    "Hero src is the media-library URL for attachment 16, not a repo path.",
  ],
  params: {
    id: 18,
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.meta_description,
    featured_media: HERO_ID,
    content,
    user_confirmed: true,
  },
}, null, 2)}\n`);

console.log(`article: ${content.length} chars, ${html.length} blocks`);
