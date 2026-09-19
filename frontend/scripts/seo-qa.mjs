/**
 * SEO and indexation verification.
 *
 * The hard gate on this migration is that no indexed URL changes and no page
 * silently acquires a noindex. This asserts both, plus the metadata a search
 * engine and a link preview actually read.
 *
 * Usage: node scripts/seo-qa.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const CANONICAL_HOST = "https://novraintelligence.com";

/** Every URL WordPress publishes today. Losing one is the failure this guards. */
const INDEXED = [
  "/", "/insights/", "/research/", "/technology/", "/about/", "/contact/",
  "/2026/08/31/recoverability-architecture/",
  "/2026/08/31/human-oversight-architecture/",
  "/2026/08/31/deterministic-boundaries-ai-smart-contracts/",
  "/2026/08/31/context-engineering-production-ai/",
  "/2026/08/31/agentic-ai-reliability-budget/",
];
/** Added by this migration; they must be indexable and in the sitemap too. */
const NEW = ["/capabilities/", "/global-development/"];
const ALL = [...INDEXED, ...NEW];

const failures = [];
const fail = (m) => { failures.push(m); console.log(`FAIL  ${m}`); };
const ok = (m) => console.log(`ok    ${m}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const canonicals = new Map();

for (const path of ALL) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (!res || res.status() !== 200) { fail(`${path}: HTTP ${res ? res.status() : "none"}`); continue; }

  const m = await page.evaluate(() => {
    const meta = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) ?? null;
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => { try { return JSON.parse(s.textContent); } catch { return "INVALID"; } });
    return {
      title: document.title,
      desc: meta('meta[name="description"]'),
      canonical: meta('link[rel="canonical"]', "href"),
      robots: meta('meta[name="robots"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDesc: meta('meta[property="og:description"]'),
      ogUrl: meta('meta[property="og:url"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogType: meta('meta[property="og:type"]'),
      twCard: meta('meta[name="twitter:card"]'),
      ld,
      h1: document.querySelectorAll("h1").length,
    };
  });

  const bad = [];
  if (!m.title || m.title.length < 10) bad.push(`title "${m.title}"`);
  if (!m.desc || m.desc.length < 40) bad.push(`description ${m.desc ? m.desc.length + " chars" : "missing"}`);
  if (!m.canonical) bad.push("no canonical");
  else {
    const expected = `${CANONICAL_HOST}${path}`;
    if (m.canonical !== expected) bad.push(`canonical is ${m.canonical}, expected ${expected}`);
    if (canonicals.has(m.canonical)) bad.push(`canonical collides with ${canonicals.get(m.canonical)}`);
    canonicals.set(m.canonical, path);
  }
  // A noindex anywhere on an indexed URL is the migration's worst outcome.
  if (m.robots && /noindex/i.test(m.robots)) bad.push(`robots meta says "${m.robots}"`);
  if (!m.ogTitle) bad.push("no og:title");
  if (!m.ogDesc) bad.push("no og:description");
  if (!m.ogImage) bad.push("no og:image");
  if (!m.ogUrl) bad.push("no og:url");
  else if (m.ogUrl !== `${CANONICAL_HOST}${path}`) bad.push(`og:url is ${m.ogUrl}`);
  if (!m.twCard) bad.push("no twitter:card");
  if (m.ld.some((x) => x === "INVALID")) bad.push("structured data is not valid JSON");
  if (m.h1 !== 1) bad.push(`${m.h1} <h1>`);

  if (bad.length) fail(`${path}: ${bad.join("; ")}`);
  else ok(`${path}: title/desc/canonical/OG/twitter/schema present, og:type=${m.ogType}, ${m.ld.length} schema block(s)`);
}

/* ---------- robots.txt ---------- */
{
  const res = await page.goto(`${BASE}/robots.txt`);
  const body = await res.text();
  if (/disallow:\s*\/\s*$/im.test(body)) fail(`robots.txt disallows the whole site:\n${body}`);
  else ok("robots.txt does not disallow the site");
  if (/sitemap:/i.test(body)) ok(`robots.txt advertises the sitemap (${(body.match(/Sitemap:.*/i) || [""])[0].trim()})`);
  else fail("robots.txt does not advertise a sitemap");
}

/* ---------- sitemap.xml ---------- */
{
  const res = await page.goto(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  const missing = ALL.filter((p) => !locs.includes(`${CANONICAL_HOST}${p}`));
  if (missing.length) fail(`sitemap is missing ${missing.length} URL(s): ${missing.join(", ")}`);
  else ok(`sitemap lists all ${ALL.length} URLs on the canonical host`);
  const offHost = locs.filter((l) => !l.startsWith(CANONICAL_HOST));
  if (offHost.length) fail(`sitemap contains ${offHost.length} off-host URL(s): ${offHost[0]}`);
  else ok("every sitemap entry is on the canonical host");
}

/* ---------- trailing-slash parity ---------- */
for (const path of ["/capabilities", "/insights", "/2026/08/31/agentic-ai-reliability-budget"]) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const landed = new URL(page.url()).pathname;
  if (landed === `${path}/` && res.status() === 200) ok(`${path} -> ${landed} (redirects to the slashed form)`);
  else fail(`${path} landed on ${landed} with HTTP ${res.status()}`);
}

/* ---------- 404 really is a 404 ---------- */
for (const path of ["/no-such-page/", "/2026/08/31/not-an-article/"]) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (res.status() === 404) ok(`${path} returns HTTP 404`);
  else fail(`${path} returns HTTP ${res.status()} — a soft 404 gets indexed`);
}

await browser.close();
console.log(failures.length === 0
  ? `\nSEO_QA=PASS (${ALL.length} URLs, canonicals unique, no noindex, sitemap and robots correct)`
  : `\nSEO_QA=FAIL (${failures.length} failure(s))`);
process.exit(failures.length === 0 ? 0 : 1);
