/**
 * Browser QA against the actual Next.js application.
 *
 * The previous QA rendered a payload string with no stylesheet, because that
 * was the closest thing to the truth WordPress would serve. This drives the
 * real app in a real browser at the four review widths, which is what the
 * migration bought.
 *
 * Usage: node scripts/browser-qa.mjs [--base http://localhost:3000] [--shots DIR]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};

const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const SHOTS = arg("shots", "../artifacts/frontend-qa");
const WIDTHS = [390, 620, 1024, 1600];

const PAGES = [
  { name: "home", path: "/" },
  { name: "insights", path: "/insights/" },
  { name: "research", path: "/research/" },
  { name: "technology", path: "/technology/" },
  { name: "about", path: "/about/" },
  { name: "contact", path: "/contact/" },
  { name: "article", path: "/2026/08/31/agentic-ai-reliability-budget/" },
];

/* Every article URL that is published today. A missing one is a P0: the whole
 * migration is only safe if these paths keep resolving. */
const ARTICLE_PATHS = [
  "/2026/08/31/agentic-ai-reliability-budget/",
  "/2026/08/31/context-engineering-production-ai/",
  "/2026/08/31/deterministic-boundaries-ai-smart-contracts/",
  "/2026/08/31/human-oversight-architecture/",
  "/2026/08/31/recoverability-architecture/",
];

/* Things that must not appear anywhere. The metrics were invented by a concept
 * mockup; the WordPress chrome is what the frontend exists to leave behind. */
const FORBIDDEN = [
  "1,248", "Projects Tracked", "87 Research Papers", "342 Systems",
  "Systems Analyzed", "Impact Score", "98.7%",
  "NOVRA AI",
  "Blog at WordPress.com", "wp-content/themes", "wp-block-", "Subscribe",
];

mkdirSync(SHOTS, { recursive: true });

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});

/** Every internal link on the site, checked once. */
const seenLinks = new Set();

for (const target of PAGES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width < 620 ? 844 : 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    // Nothing off-origin is allowed to influence the result. The sandbox proxy
    // refuses external hosts, so a webfont request would hang the run rather
    // than fail it; blocking them makes the pass deterministic and measures
    // the app rather than the network.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.host === new URL(BASE).host ? route.continue() : route.abort();
    });
    const response = await page.goto(`${BASE}${target.path}`, { waitUntil: "load" });
    await page.waitForTimeout(350);
    const label = `${target.name}@${width}`;

    if (!response || response.status() !== 200) {
      fail(`${label}: HTTP ${response ? response.status() : "no response"}`);
      await context.close();
      continue;
    }

    const state = await page.evaluate(() => {
      const root = document.documentElement;
      const brandName = document.querySelector("header a[aria-label$='home'] span span");
      const spans = [...document.querySelectorAll("header a[aria-label$='home'] span span")].map(
        (node) => node.textContent?.trim() ?? "",
      );
      const headings = [...document.querySelectorAll("h1,h2,h3")]
        .filter((node) => node.clientWidth > 2 && node.clientHeight > 2)
        .filter((node) => node.scrollWidth > Math.ceil(node.clientWidth) + 1)
        .map((node) => `${node.tagName.toLowerCase()} needs ${node.scrollWidth}px in ${Math.round(node.clientWidth)}px`);
      const wide = [...document.querySelectorAll("body *")]
        .filter((node) => node.getBoundingClientRect().right > root.clientWidth + 2)
        .slice(0, 3)
        .map((node) => `${node.tagName.toLowerCase()}.${(node.className || "").toString().split(" ")[0]}`);
      return {
        text: document.body.innerText,
        html: document.documentElement.outerHTML,
        overflow: root.scrollWidth > root.clientWidth + 1,
        offenders: wide,
        brand: brandName?.textContent?.trim() ?? "",
        lockup: spans,
        svgCount: document.querySelectorAll("svg").length,
        overflowingHeadings: headings,
        // Only images the viewport actually reaches. Below the fold they are
        // lazy by design and "not yet loaded" is the correct state, not a fault.
        images: [...document.querySelectorAll("img")]
          .filter((image) => {
            const box = image.getBoundingClientRect();
            return box.top < window.innerHeight * 1.5 && box.bottom > -200;
          })
          .map((image) => ({
            src: image.currentSrc || image.src,
            loaded: image.complete && image.naturalWidth > 0,
            width: Math.round(image.getBoundingClientRect().width),
          })),
        anchorTargets: [...document.querySelectorAll("a[href^='/'][href*='#']")]
          .map((anchor) => anchor.getAttribute("href") ?? ""),
        links: [...document.querySelectorAll("a[href]")]
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.startsWith("/")),
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (node) => node.textContent ?? "",
        ),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
        navVisible: Boolean(
          [...document.querySelectorAll("header nav a")].find((node) => node.getBoundingClientRect().width > 0),
        ),
        toggleVisible: Boolean(
          [...document.querySelectorAll("header button")].find((node) => node.getBoundingClientRect().width > 0),
        ),
      };
    });

    if (state.overflow) fail(`${label}: page scrolls horizontally (${state.offenders.join(", ") || "source unknown"})`);
    for (const heading of state.overflowingHeadings) fail(`${label}: ${heading}`);

    if (state.lockup[0] !== "NOVRA" || state.lockup[1] !== "Intelligence") {
      fail(`${label}: masthead lockup is ${JSON.stringify(state.lockup)}, expected NOVRA over Intelligence`);
    }

    for (const banned of FORBIDDEN) {
      if (state.text.includes(banned)) fail(`${label}: forbidden text "${banned}" is on the page`);
    }
    // WordPress chrome would show up in the markup even when it renders empty.
    if (/wp-block-|wp-content\/themes|jetpack/i.test(state.html)) {
      fail(`${label}: WordPress chrome present in the markup`);
    }

    const broken = state.images.filter((image) => !image.loaded);
    if (broken.length) fail(`${label}: ${broken.length} image(s) failed to load — ${broken[0].src}`);

    if (state.svgCount < 1) fail(`${label}: no inline SVG — the graphic brand is missing`);

    if (width >= 1024 && !state.navVisible) fail(`${label}: desktop navigation is not visible`);
    if (width < 1024 && !state.toggleVisible) fail(`${label}: mobile menu button is not visible`);

    if (!state.canonical) fail(`${label}: no canonical URL`);
    if (!state.description) fail(`${label}: no meta description`);
    if (!state.ogTitle) fail(`${label}: no Open Graph title`);

    for (const block of state.jsonLd) {
      try {
        const parsed = JSON.parse(block);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          if (!node["@type"]) fail(`${label}: structured data node without @type`);
          if (node["@type"] === "Organization") {
            fail(`${label}: Organization schema present — the publication is not a legal entity`);
          }
        }
      } catch {
        fail(`${label}: structured data is not valid JSON`);
      }
    }

    for (const href of state.links) seenLinks.add(href);

    if (target.name === "about") {
      const portrait = state.images.find((image) => image.src.includes("author-portrait"));
      if (!portrait) fail(`${label}: About has no portrait`);
      else if (!portrait.loaded) fail(`${label}: About portrait did not load`);
      else if (portrait.width > 340) fail(`${label}: portrait is ${portrait.width}px, too dominant`);
      if (/signature|cursive/i.test(state.html)) fail(`${label}: a signature is present on About`);
    }

    await page.screenshot({
      path: join(SHOTS, `${target.name}-${width}.png`),
      fullPage: width === 1600,
    });
    await context.close();
  }
}

// ------------------------------------------------------------- URL parity --
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

for (const path of ARTICLE_PATHS) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    fail(`URL PARITY: ${path} returned ${response ? response.status() : "nothing"}`);
  }
}

for (const href of [...seenLinks].sort()) {
  if (href.startsWith("//")) continue;
  // A fragment is checked as a document plus an element, not as a navigation:
  // going to /about/#x from /about/ is a same-document scroll and returns no
  // response at all, which the first version of this check read as a 404.
  const [path, fragment] = href.split("#");
  const response = await page.goto(`${BASE}${path || "/"}`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    fail(`INTERNAL LINK: ${href} returned ${response ? response.status() : "nothing"}`);
    continue;
  }
  if (fragment) {
    const exists = await page.evaluate((id) => Boolean(document.getElementById(id)), fragment);
    if (!exists) fail(`INTERNAL LINK: ${href} points at an element that does not exist`);
  }
}
notes.push(`${seenLinks.size} distinct internal links followed`);

for (const path of ["/sitemap.xml", "/robots.txt"]) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) fail(`${path} returned ${response ? response.status() : "nothing"}`);
  else {
    const body = await response.text();
    if (path === "/sitemap.xml") {
      for (const article of ARTICLE_PATHS) {
        if (!body.includes(article)) fail(`SITEMAP: ${article} is missing`);
      }
    }
    if (path === "/robots.txt" && !body.includes("Sitemap:")) fail("ROBOTS: no sitemap reference");
  }
}

await context.close();
await browser.close();

for (const note of notes) console.log(`note  ${note}`);
if (failures.length) {
  console.log(`\nBROWSER_QA=FAIL (${failures.length})`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nBROWSER_QA=PASS (${PAGES.length * WIDTHS.length} renders, screenshots in ${SHOTS})`);
}
