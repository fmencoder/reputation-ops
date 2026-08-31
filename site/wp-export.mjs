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
const MEDIA_MAP = join(ROOT, "wp-media.json");

const domainArg = process.argv.indexOf("--domain");
const DOMAIN = domainArg > -1 ? process.argv[domainArg + 1] : "novraintelligence.com";

/** Set only after a read-back proves WordPress stripped <picture>/<source>. */
const PICTURE_FALLBACK = process.argv.includes("--picture-fallback");

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

/**
 * Rewrite local /assets/ references to WordPress Media Library URLs.
 *
 * The static build serves images from its own /assets/ directory. WordPress.com
 * on the Personal plan has no file access, so that path 404s once deployed —
 * every referenced asset has to resolve to a Media Library URL instead.
 *
 * Only src and srcset attributes are rewritten. Scanning raw text would also
 * match the .svg source paths named in the authoring comments, which are
 * deliberately never uploaded.
 *
 * Unmapped assets are collected, not silently passed through. A page that ships
 * with an unrewritten /assets/ path renders a broken image, which is worse than
 * a failed export.
 */
function rewriteAssets(markup, media, unmapped) {
  return markup.replace(
    /(\s(?:src|srcset)=")(\/assets\/[A-Za-z0-9._-]+)(")/g,
    (whole, before, path, after) => {
      if (path.endsWith(".svg")) {
        throw new Error(
          `${path} is referenced as an image source, but WordPress rejects ` +
          `image/svg+xml uploads. Reference the rasterised .webp instead.`,
        );
      }
      const url = media[path];
      if (!url) {
        unmapped.add(path);
        return whole;
      }
      return before + url + after;
    },
  );
}

/**
 * Rewrite <picture> into the dual-<img> fallback.
 *
 * KSES support for <picture>/<source> is WordPress-version-dependent. If the
 * deployed install strips them, the inner <img> still renders — the page is not
 * broken, just desktop-only on phones — and this transform restores the mobile
 * composition using the .figure__desktop / .figure__mobile rules already in
 * novra.css.
 *
 * It is derived from the <picture> markup rather than maintained as a second
 * copy in the page source, so the two can never drift. Exactly one <img> is
 * displayed at any viewport, so exactly one is in the accessibility tree, which
 * is why both carry the same alt text rather than one being nulled.
 *
 * Enable with --picture-fallback. Do NOT enable it speculatively: <picture>
 * lets the browser skip the request it does not need, and the fallback pair
 * gives up that guarantee.
 */
function applyPictureFallback(markup) {
  return markup.replace(
    /<picture>\s*<source\b([^>]*)>\s*(<img\b[^>]*>)\s*<\/picture>/g,
    (whole, sourceAttrs, img) => {
      const attr = (name, text) => text.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      const mobileSrc = attr("srcset", sourceAttrs);
      const mobileW = attr("width", sourceAttrs);
      const mobileH = attr("height", sourceAttrs);
      const alt = attr("alt", img);
      if (!mobileSrc || !mobileW || !mobileH || alt === undefined) {
        throw new Error(
          "picture-fallback: <source> needs srcset/width/height and <img> needs alt. " +
          "Refusing to emit a half-built fallback.",
        );
      }
      const desktop = img.replace("<img ", '<img class="figure__desktop" ');
      const mobile =
        `<img class="figure__mobile" src="${mobileSrc}" width="${mobileW}" ` +
        `height="${mobileH}" loading="lazy" decoding="async" alt="${alt}">`;
      return `${desktop}\n        ${mobile}`;
    },
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const media = JSON.parse(await readFile(MEDIA_MAP, "utf8")).assets ?? {};

  const allPlaceholders = new Map();
  const unmapped = new Set();

  for (const page of PAGES) {
    const body = await readFile(join(ROOT, "pages", page.file), "utf8");
    let markup = rewriteAssets(
      body.replaceAll("{{DOMAIN}}", DOMAIN),
      media,
      unmapped,
    );
    if (PICTURE_FALLBACK) markup = applyPictureFallback(markup);
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
    unmappedAssets: [...unmapped],
  };

  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n${PAGES.length} payloads written to wp-payload/ (domain: ${DOMAIN})`);
  console.log(
    `picture strategy: ${PICTURE_FALLBACK ? "FALLBACK (dual <img>)" : "PRIMARY (<picture>)"}`,
  );
  if (allPlaceholders.size) {
    console.log("\nBLOCKED — unresolved placeholders:");
    for (const [slug, keys] of allPlaceholders) console.log(`  ${slug}: ${keys.join(", ")}`);
    console.log("\nThese pages may be created as drafts but must not be published.");
  }
  if (unmapped.size) {
    console.log("\nBLOCKED — assets with no Media Library URL:");
    for (const path of unmapped) console.log(`  ${path}`);
    console.log(
      "\nUpload each to the Media Library, then record the returned URL in\n" +
      "site/wp-media.json. Do not publish a page carrying an unmapped path:\n" +
      "/assets/ does not resolve on WordPress.com and renders as a broken image.",
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
