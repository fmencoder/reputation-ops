/**
 * Static assembler for the NOVRA AI site.
 *
 * Composes pages/*.html into dist/ with the shared head, header and footer.
 * Deliberately dependency-free: the same partials and tokens port to a
 * WordPress block theme, and a build step with its own toolchain would just be
 * something else to keep in sync.
 *
 * Usage: node site/build.mjs [--domain example.com]
 */

import { mkdir, readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "dist");

const domainArg = process.argv.indexOf("--domain");
const DOMAIN = domainArg > -1 ? process.argv[domainArg + 1] : "novraintelligence.com";

/** Page metadata. `path` is the deployed URL; `nav` marks the active nav item. */
const PAGES = [
  { file: "home.html", path: "/", nav: "HOME",
    title: "NOVRA Intelligence — Intelligent Systems, Digital Infrastructure",
    description: "Research and perspectives on artificial intelligence, autonomous systems, blockchain infrastructure, and financial technology." },
  { file: "insights.html", path: "/insights/", nav: "INSIGHTS",
    title: "Insights — NOVRA Intelligence",
    description: "In-depth analysis and original research on the technologies and systems reshaping how software is built and operated." },
  { file: "research.html", path: "/research/", nav: "RESEARCH",
    title: "Research — NOVRA Intelligence",
    description: "Longer-form investigation into agentic system reliability, evaluation methodology, and AI governance." },
  { file: "technology.html", path: "/technology/", nav: "TECHNOLOGY",
    title: "Technology — NOVRA Intelligence",
    description: "The four areas of focus: AI systems and agents, blockchain infrastructure, financial technology, and digital infrastructure." },
  { file: "about.html", path: "/about/", nav: "ABOUT",
    title: "Fredrick Mendez | AI, Blockchain & Technology Strategy | NOVRA Intelligence",
    description: "Fredrick Mendez is a technology executive and strategist focused on artificial intelligence, autonomous systems, blockchain technology, smart contracts, software architecture, and next-generation digital infrastructure." },
  { file: "contact.html", path: "/contact/", nav: "CONTACT",
    title: "Contact — NOVRA Intelligence",
    description: "How to reach Fredrick Mendez about anything published on NOVRA Intelligence, including corrections to work published here." },
];

const NAV_KEYS = ["HOME", "INSIGHTS", "RESEARCH", "TECHNOLOGY", "ABOUT", "CONTACT"];

/**
 * Fill {{TOKENS}} from a map. Unknown tokens are left in place rather than
 * blanked, so a missing value shows up in review instead of shipping as an
 * empty attribute.
 */
function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.hasOwn(values, key) ? values[key] : match,
  );
}

async function build() {
  const [head, header, footer] = await Promise.all(
    ["head", "header", "footer"].map((name) =>
      readFile(join(ROOT, "partials", `${name}.html`), "utf8"),
    ),
  );

  await mkdir(OUT, { recursive: true });

  for (const page of PAGES) {
    const body = await readFile(join(ROOT, "pages", page.file), "utf8");

    const navValues = Object.fromEntries(
      NAV_KEYS.map((key) => [
        `NAV_${key}`,
        key === page.nav ? ' aria-current="page"' : "",
      ]),
    );

    const html = [
      "<!doctype html>",
      '<html lang="en" data-theme="dark">',
      "<head>",
      fill(head, {
        TITLE: page.title,
        DESCRIPTION: page.description,
        DOMAIN,
        PATH: page.path,
        OGTYPE: page.path === "/" ? "website" : "article",
      }),
      "</head>",
      "<body>",
      fill(header, navValues),
      '<main id="main">',
      fill(body, { DOMAIN }),
      "</main>",
      footer,
      "</body>",
      "</html>",
    ].join("\n");

    const outPath =
      page.path === "/" ? join(OUT, "index.html") : join(OUT, page.path, "index.html");
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
    console.log(`built ${page.path}`);
  }

  for (const asset of ["tokens.css", "components.css"]) {
    await copyFile(join(ROOT, asset), join(OUT, asset));
  }

  const assetsDir = join(ROOT, "assets");
  await mkdir(join(OUT, "assets"), { recursive: true });
  for (const name of await readdir(assetsDir)) {
    await copyFile(join(assetsDir, name), join(OUT, "assets", name));
  }

  await writeFile(
    join(OUT, "sitemap.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...PAGES.map((p) => `  <url><loc>https://${DOMAIN}${p.path}</loc></url>`),
      "</urlset>",
    ].join("\n"),
    "utf8",
  );

  await writeFile(
    join(OUT, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: https://${DOMAIN}/sitemap.xml\n`,
    "utf8",
  );

  console.log(`\n${PAGES.length} pages built to dist/ (domain: ${DOMAIN})`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
