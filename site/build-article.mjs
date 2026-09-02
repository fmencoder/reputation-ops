/**
 * Render the article corpus from markdown into WordPress payloads.
 *
 * content/*.md is the source. The HTML deployed to WordPress is derived here so
 * the repository stays authoritative and a published page can always be
 * regenerated. Media Library URLs come from site/wp-media.json, which is only
 * ever written from a real media.create response — never hand-typed.
 *
 * The renderer covers exactly the constructs these articles use and throws on
 * anything else. A markdown feature that appears later should fail the build
 * rather than vanish silently from the page.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = JSON.parse(readFileSync(join(ROOT, "site", "wp-media.json"), "utf8")).assets ?? {};
const PERMALINKS = JSON.parse(readFileSync(join(ROOT, "site", "wp-permalinks.json"), "utf8")).permalinks ?? {};
const ALLOW_UNRESOLVED = process.argv.includes("--allow-unresolved");
const unresolved = new Set();
const AUTHOR_HREF = "/about/#fredrick-mendez";
const PAGE_SLUGS = new Set(["home", "insights", "research", "technology", "about", "contact"]);
const WPM = 225;

/** postId is set once the article exists; absent means posts.create. */
const CORPUS = [
  { n: 1, file: "001-agentic-ai-reliability-budget.md", postId: 18, date: "2026-09-01", display: "1 September 2026" },
  { n: 2, file: "002-context-engineering-production-ai.md", postId: 53, date: "2026-09-01", display: "1 September 2026" },
  { n: 3, file: "005-deterministic-boundaries-ai-smart-contracts.md", postId: 54, date: "2026-09-01", display: "1 September 2026" },
  { n: 4, file: "010-human-oversight-architecture.md", postId: 55, date: "2026-09-01", display: "1 September 2026" },
  { n: 5, file: "011-recoverability-architecture.md", postId: 56, date: "2026-09-01", display: "1 September 2026" },
];

function frontmatter(src) {
  const [, fm, body] = src.split(/^---\s*$/m);
  const meta = {};
  for (const line of fm.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: body.trim() };
}

const escape = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline conversions, applied to already-escaped text. */
function inline(text) {
  // Order matters. Typographic quotes are applied FIRST, while the only quotes
  // present are the author's. Running that pass after the link conversion curls
  // the quotes in href="..." instead — which produces markup that looks fine in
  // a diff and yields a dead link on every internal reference.
  return text
    .replace(/"([^"]+)"/g, "&ldquo;$1&rdquo;")
    .replace(/(\w)'(\w)/g, "$1&rsquo;$2")
    .replace(/—/g, "&mdash;")
    .replace(/−/g, "&minus;")
    .replace(/·/g, "&middot;")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(]|&mdash;)\*([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const text = (t) => inline(escape(t));

function renderBlocks(body, indent = "      ") {
  const out = [];
  for (const block of body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)) {
    if (block.startsWith("# ")) continue;                       // title lives in the post title

    /*
     * Supporting figure, authored as:
     *
     *   FIGURE /assets/name.webp | WIDTHxHEIGHT | alt text | caption
     *
     * A directive rather than markdown image syntax because every one of these
     * needs four things markdown cannot carry: a Media Library URL resolved at
     * build time (heroUrl throws on a guess), explicit width and height so the
     * layout does not jump, alt text that repeats the diagram's labels, and a
     * caption that states the claim. A figure with no caption is decoration,
     * and this site does not ship decoration.
     */
    if (block.startsWith("FIGURE ")) {
      const parts = block.slice(7).split("|").map((s) => s.trim());
      if (parts.length !== 4) {
        throw new Error(`FIGURE needs 4 fields separated by |, got ${parts.length}:\n${block}`);
      }
      const [asset, dims, alt, caption] = parts;
      const m = /^(\d+)x(\d+)$/.exec(dims);
      if (!m) throw new Error(`FIGURE dimensions must be WIDTHxHEIGHT, got "${dims}"`);
      out.push(`${indent}<figure class="figure">`);
      out.push(`${indent}  <div class="figure__frame">`);
      out.push(`${indent}    <img loading="lazy" src="${heroUrl(asset)}" width="${m[1]}" height="${m[2]}" alt="${escape(alt)}">`);
      out.push(`${indent}  </div>`);
      out.push(`${indent}  <figcaption>${text(caption)}</figcaption>`);
      out.push(`${indent}</figure>`);
      continue;
    }
    if (block.startsWith("## ")) {
      out.push(`${indent}<h2>${text(block.slice(3).trim())}</h2>`);
      continue;
    }
    if (block.startsWith("### ")) {
      out.push(`${indent}<h3>${text(block.slice(4).trim())}</h3>`);
      continue;
    }
    if (block.startsWith("> ")) {
      const quoted = block.split("\n").map((l) => l.replace(/^>\s?/, "")).join(" ");
      out.push(`${indent}<blockquote><p>${text(quoted)}</p></blockquote>`);
      continue;
    }
    if (/^[-*] /.test(block)) {
      out.push(`${indent}<ul>`);
      for (const item of block.split(/\n(?=[-*] )/)) {
        out.push(`${indent}  <li>${text(item.replace(/^[-*] /, "").replace(/\n\s+/g, " "))}</li>`);
      }
      out.push(`${indent}</ul>`);
      continue;
    }
    if (block.startsWith("|")) {
      const rows = block.split("\n").map((r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      const [head, , ...rest] = rows;                            // row 1 is the alignment rule
      out.push(`${indent}<table>`);
      out.push(`${indent}  <thead><tr>${head.map((c) => `<th>${text(c)}</th>`).join("")}</tr></thead>`);
      out.push(`${indent}  <tbody>`);
      for (const row of rest) out.push(`${indent}    <tr>${row.map((c) => `<td>${text(c)}</td>`).join("")}</tr>`);
      out.push(`${indent}  </tbody>`);
      out.push(`${indent}</table>`);
      continue;
    }
    if (/^\d+\.\s/.test(block)) {
      out.push(`${indent}<ol>`);
      for (const item of block.split(/\n(?=\d+\.\s)/)) {
        out.push(`${indent}  <li>${text(item.replace(/^\d+\.\s/, "").replace(/\n\s+/g, " "))}</li>`);
      }
      out.push(`${indent}</ol>`);
      continue;
    }
    if (/^```/.test(block)) {
      throw new Error(`unsupported markdown block, extend the renderer:\n${block.slice(0, 90)}`);
    }
    out.push(`${indent}<p>${text(block.replace(/\n/g, " "))}</p>`);
  }
  return out.join("\n");
}

function heroUrl(path) {
  const url = MEDIA[path];
  if (!url) {
    throw new Error(
      `${path} has no Media Library URL in site/wp-media.json. Upload it with media.create ` +
      `and record the returned source_url — do not guess a CDN path.`,
    );
  }
  return url;
}

const payloads = [];
for (const entry of CORPUS) {
  const { meta, body } = frontmatter(readFileSync(join(ROOT, "content", entry.file), "utf8"));
  const sourcesAt = body.indexOf("## Sources");
  const prose = sourcesAt > -1 ? body.slice(0, sourcesAt) : body;
  const sources = sourcesAt > -1 ? body.slice(sourcesAt) : "";
  const words = prose.replace(/^#.*$/gm, "").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WPM));

  let content = `<!-- wp:html -->
<article class="article">
  <div class="wrap wrap--narrow">
    <div class="byline">
      <div>
        <a class="byline__name" href="${AUTHOR_HREF}" rel="author">Fredrick Mendez</a>
        <div class="byline__meta"><time datetime="${entry.date}">${entry.display}</time> &middot; ${minutes} min read</div>
      </div>
    </div>

    <figure class="figure">
      <div class="figure__frame">
        <img loading="lazy" src="${heroUrl(meta.hero)}" width="${meta.hero_width}" height="${meta.hero_height}" alt="${escape(meta.hero_alt)}">
      </div>
      <figcaption>${text(meta.hero_caption)}</figcaption>
    </figure>

    <div class="article__body">
${renderBlocks(prose)}
    </div>

${sources ? `    <aside class="sources">\n${renderBlocks(sources, "      ")}\n    </aside>\n` : ""}
    <aside class="author-box">
      <p class="card__kicker">Written by</p>
      <h2 style="font-size:var(--fs-h3);margin:0 0 var(--s-2)"><a href="${AUTHOR_HREF}" style="text-decoration:none">Fredrick Mendez</a></h2>
      <p style="color:var(--c-text-muted);margin:0">Technology executive and strategist focused on artificial intelligence, autonomous systems, blockchain technology, smart contracts, software architecture, and next-generation digital infrastructure.</p>
    </aside>
  </div>
</article>
<!-- /wp:html -->`;

  /*
   * Cross-links are authored as /{slug}/ in the markdown. This site serves
   * posts at /YYYY/MM/DD/{slug}/, so every one of those has to be rewritten to
   * the permalink WordPress actually returned. Anything still unresolved is an
   * href that would 404 the moment the site goes public.
   */
  content = content.replace(/href="\/([a-z0-9-]+)\/"/g, (whole, slug) => {
    if (PERMALINKS[slug]) return `href="${PERMALINKS[slug]}"`;
    if (PAGE_SLUGS.has(slug)) return whole;
    unresolved.add(slug);
    if (!ALLOW_UNRESOLVED) {
      throw new Error(
        `${entry.file} links to /${slug}/ but site/wp-permalinks.json has no permalink for it. ` +
        `Publish that article first and record its returned link, or pass --allow-unresolved ` +
        `for a first publish that will be corrected in a second pass.`,
      );
    }
    return whole;
  });

  if (/<[^>]*&[lr]dquo;[^>]*>/.test(content)) {
    throw new Error(`${entry.file}: a typographic quote landed inside a tag — the inline() ordering has regressed`);
  }
  for (const [, href] of content.matchAll(/<a href="([^"]*)"/g)) {
    if (!/^(https?:\/\/|\/|mailto:)/.test(href)) throw new Error(`${entry.file}: suspicious href ${href}`);
  }

  const params = {
    ...(entry.postId ? { id: entry.postId } : {}),
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.meta_description,
    content,
    status: "publish",
    user_confirmed: true,
  };

  const out = join(ROOT, "site", "wp-payload", `${20 + entry.n}-article-${meta.slug}.json`);
  writeFileSync(out, `${JSON.stringify({
    _tool: "wpcom-mcp-content-authoring",
    _operation: entry.postId ? "posts.update" : "posts.create",
    _order: 20 + entry.n,
    _generated: `site/build-article.mjs from content/${entry.file}`,
    _hero: meta.hero,
    _words: words,
    params,
  }, null, 2)}\n`);
  payloads.push({ slug: meta.slug, words, minutes, chars: content.length, op: entry.postId ? "update" : "create" });
}

if (unresolved.size) {
  console.log(`\nUNRESOLVED cross-links (need a permalink recorded): ${[...unresolved].join(", ")}`);
}

for (const p of payloads) {
  console.log(`${p.slug.padEnd(46)} ${String(p.words).padStart(5)}w  ${p.minutes}min  ${String(p.chars).padStart(6)} chars  ${p.op}`);
}
