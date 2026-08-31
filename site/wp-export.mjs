/**
 * WordPress deployment adapter.
 *
 * Emits, for every page, the exact parameter object to hand to
 * `wpcom-mcp-content-authoring` → `pages.create`. Deployment then becomes a
 * loop over these files rather than a fresh authoring exercise, which is what
 * keeps the repository the source of truth: nothing about what gets published
 * is decided at deploy time.
 *
 * Usage: node site/wp-export.mjs [--domain novraintelligence.com]
 * Output: site/wp-payload/<slug>.json
 *
 * Why core/html blocks:
 *   The approved design is a custom system (tokens.css + components.css), not a
 *   theme. On the Personal plan there is no theme upload and no file access, so
 *   the faithful route is to carry the markup inside core/html blocks and load
 *   the two stylesheets through Additional CSS. Rebuilding the layout out of
 *   core blocks would mean re-deriving the design through whatever the active
 *   theme happens to impose, which is exactly the "stock theme aesthetic"
 *   outcome the brief rules out.
 *
 *   The tradeoff is real and worth stating: core/html content is not editable
 *   in the block editor in any meaningful way. Edits happen here and redeploy.
 *   WordPress may also strip markup it does not allow — check the
 *   `_content_warnings` field on every create response rather than assuming the
 *   payload landed intact.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "wp-payload");

const domainArg = process.argv.indexOf("--domain");
const DOMAIN = domainArg > -1 ? process.argv[domainArg + 1] : "novraintelligence.com";

/** Deployment order matters: About first, because it holds the Person node. */
const PAGES = [
  { file: "about.html", slug: "about", title: "About", order: 1,
    description: "About NOVRA Intelligence and Fredrick Mendez, who writes it." },
  { file: "home.html", slug: "home", title: "Home", order: 2, isFront: true,
    description: "Research and perspectives on artificial intelligence, autonomous systems, blockchain infrastructure, and financial technology." },
  { file: "technology.html", slug: "technology", title: "Technology", order: 3,
    description: "The four areas of focus: AI systems and agents, blockchain infrastructure, financial technology, and digital infrastructure." },
  { file: "insights.html", slug: "insights", title: "Insights", order: 4,
    description: "In-depth analysis and original research on the technologies and systems reshaping how software is built and operated." },
  { file: "research.html", slug: "research", title: "Research", order: 5,
    description: "Longer-form investigation into agentic system reliability, evaluation methodology, and AI governance." },
  { file: "contact.html", slug: "contact", title: "Contact", order: 6,
    description: "Get in touch." },
];

/** Wrap raw markup in a core/html block. */
function htmlBlock(markup) {
  return `<!-- wp:html -->\n${markup.trim()}\n<!-- /wp:html -->`;
}

/**
 * Scan for unresolved placeholders. These must never reach a published page,
 * so every payload carries its own list and the run fails loudly if any exist.
 */
function findPlaceholders(text) {
  return [...new Set(text.match(/PLACEHOLDER[A-Z_]*/g) ?? [])];
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const allPlaceholders = new Map();

  for (const page of PAGES) {
    const body = await readFile(join(ROOT, "pages", page.file), "utf8");
    const markup = body.replaceAll("{{DOMAIN}}", DOMAIN);
    const placeholders = findPlaceholders(markup);
    if (placeholders.length) allPlaceholders.set(page.slug, placeholders);

    const payload = {
      _tool: "wpcom-mcp-content-authoring",
      _operation: "pages.create",
      _order: page.order,
      _requires_ability: "wpcom/pages-create",
      _placeholders: placeholders,
      _notes: [
        "status is draft; site stays in Coming Soon until every gate passes.",
        "Check _content_warnings on the response — WordPress silently strips markup it disallows.",
        ...(page.isFront ? ["After creation, set as the static front page (needs wpcom/site-settings)."] : []),
      ],
      params: {
        wpcom_site: DOMAIN,
        title: page.title,
        slug: page.slug,
        status: "draft",
        excerpt: page.description,
        content: htmlBlock(markup),
        user_confirmed: true,
      },
    };

    await writeFile(
      join(OUT, `${String(page.order).padStart(2, "0")}-${page.slug}.json`),
      JSON.stringify(payload, null, 2),
      "utf8",
    );
    console.log(
      `payload ${page.slug}` +
        (placeholders.length ? `  [${placeholders.length} placeholder(s)]` : ""),
    );
  }

  const manifest = {
    domain: DOMAIN,
    generatedFrom: "site/pages/*.html",
    brand: { primary: "NOVRA Intelligence", short: "NOVRA AI" },
    siteVisibility: "COMING_SOON",
    deployOrder: PAGES.map((p) => p.slug),
    stylesheets: ["site/tokens.css", "site/components.css"],
    stylesheetTarget: "Appearance → Customize → Additional CSS (concatenate both, tokens first)",
    assets: {
      "site/assets/favicon.svg": "Site icon",
      "site/assets/logo.svg": "Site logo",
      "site/assets/share-card.svg": "Default Open Graph image",
    },
    structuredData: "site/structured-data.json — WebSite + Person + Article. No Organization node.",
    blockedPlaceholders: Object.fromEntries(allPlaceholders),
  };

  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n${PAGES.length} payloads written to wp-payload/ (domain: ${DOMAIN})`);
  if (allPlaceholders.size) {
    console.log("\nBLOCKED — unresolved placeholders:");
    for (const [slug, keys] of allPlaceholders) console.log(`  ${slug}: ${keys.join(", ")}`);
    console.log("\nThese pages may be created as drafts but must not be published.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
