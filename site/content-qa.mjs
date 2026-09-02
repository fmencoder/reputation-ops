/**
 * Content assertions for the public surfaces.
 *
 * The visual QA answers "does it lay out". This answers "does it say the right
 * things and none of the wrong ones" — the class of defect that renders
 * perfectly and is still wrong: a retired masthead, a fabricated metric, a
 * permalink that quietly moved.
 *
 * Text-level rather than rendered, deliberately: these are assertions about
 * what is in the shipped bytes, and they should hold for every page rather
 * than only the handful the browser pass renders.
 *
 * Usage: node site/content-qa.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(p, "utf8");

const sources = [];
const add = (label, text) => sources.push({ label, text });

for (const f of readdirSync(join(HERE, "pages"))) add(`pages/${f}`, read(join(HERE, "pages", f)));
for (const f of readdirSync(join(HERE, "partials"))) add(`partials/${f}`, read(join(HERE, "partials", f)));
for (const f of readdirSync(join(HERE, "assets")).filter((f) => f.endsWith(".svg"))) {
  add(`assets/${f}`, read(join(HERE, "assets", f)));
}
const payloadDir = join(HERE, "wp-payload-inline");
const payloads = existsSync(payloadDir) ? readdirSync(payloadDir) : [];
for (const f of payloads) {
  add(`payload/${f}`, JSON.parse(read(join(payloadDir, f))).params.content);
}
const distDir = join(HERE, "dist");
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []);
const dist = existsSync(distDir) ? walk(distDir) : [];
for (const f of dist) add(`dist/${f.slice(distDir.length + 1)}`, read(f));

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

/** Every source that contains `needle`, case-insensitively. */
const containing = (needle) =>
  sources.filter((s) => s.text.toLowerCase().includes(needle.toLowerCase())).map((s) => s.label);

// ---------------------------------------------------------------- masthead --
const lockups = sources.filter((s) =>
  /class="brand__name"[^>]*>NOVRA</.test(s.text) && /class="brand__suffix"[^>]*>Intelligence</.test(s.text));
if (lockups.length === 0) fail("MASTHEAD: no NOVRA / Intelligence lockup found in any source");
const distLockups = lockups.filter((s) => s.label.startsWith("dist/"));
if (distLockups.length !== dist.length) {
  fail(`MASTHEAD: lockup present on ${distLockups.length} of ${dist.length} built pages`);
}

// "NOVRA AI" was the retired masthead. It must not survive anywhere, including
// inside an SVG's aria-label, which is exactly where it last hid.
const novraAi = containing("NOVRA AI");
if (novraAi.length) fail(`MASTHEAD: "NOVRA AI" still present in ${novraAi.join(", ")}`);

// ---------------------------------------------------------------- signature -
for (const word of ["signature", "cursive", "Great Vibes", "Dancing Script", "handwriting"]) {
  const hits = containing(word).filter((l) => !l.startsWith("assets/"));
  if (hits.length) fail(`SIGNATURE: "${word}" present in ${hits.join(", ")}`);
}

// ------------------------------------------------------------- fake metrics -
/*
 * The reference mockup carried invented analytics. None of these may ship.
 * The bare numbers are matched with word boundaries so a real figure inside
 * article prose — a slot time, a percentage from a cited source — is not
 * caught by accident. These pages carry no statistics at all.
 */
const FABRICATED = [
  "1,248", "Projects Tracked", "87 Research Papers", "342 Systems",
  "Systems Analyzed", "Impact Score", "98.7",
];
const PAGE_SURFACES = (s) => /^(pages|payload|dist)\//.test(s.label);
for (const claim of FABRICATED) {
  // Scoped to page surfaces: "98.7" is also a legitimate path coordinate
  // inside a generated diagram, and flagging that would train people to
  // ignore this check.
  const hits = sources.filter(PAGE_SURFACES)
    .filter((s) => s.text.toLowerCase().includes(claim.toLowerCase())).map((s) => s.label);
  if (hits.length) fail(`FAKE METRIC: "${claim}" present in ${hits.join(", ")}`);
}
for (const page of sources.filter((s) => /^(pages|payload)\//.test(s.label))) {
  const percents = page.text.match(/\b(42|28|18|12)\s?%/g);
  if (percents) fail(`FAKE METRIC: concept research split ${percents.join(" ")} in ${page.label}`);
}

// ------------------------------------------------------------- article URLs -
const permalinks = JSON.parse(read(join(HERE, "wp-permalinks.json"))).permalinks;
const insights = sources.find((s) => s.label === "payload/04-insights.json");
if (!insights) {
  notes.push("article URLs: insights payload not built, skipped");
} else {
  for (const [slug, url] of Object.entries(permalinks)) {
    if (!insights.text.includes(url)) fail(`ARTICLE URL: ${slug} (${url}) missing from the Insights index`);
  }
}

// --------------------------------------------------------- no screenshots ---
/*
 * A page screenshot must never be deployed as a page image. Any asset whose
 * name reads like a capture is refused outright, and every image a page
 * references has to resolve to a file that actually exists in site/assets.
 */
const assetNames = new Set(readdirSync(join(HERE, "assets")));
for (const name of assetNames) {
  if (/screenshot|mockup|reference|capture|screen-?grab/i.test(name)) {
    fail(`SCREENSHOT: asset "${name}" is named like a screen capture`);
  }
}
for (const page of sources.filter((s) => s.label.startsWith("pages/"))) {
  for (const [, src] of page.text.matchAll(/\ssrc="\/assets\/([A-Za-z0-9._-]+)"/g)) {
    if (!assetNames.has(src)) fail(`ASSET: ${page.label} references /assets/${src}, which does not exist`);
  }
}

// ------------------------------------------------------------ about portrait -
/*
 * The deployed portrait is the .webp; author-portrait-source.png beside it is
 * the file exactly as supplied and is never referenced by a page. Matching on
 * the prefix alone would sometimes find the source and demand About link to a
 * PNG it should not be serving.
 */
const portrait = readdirSync(join(HERE, "assets")).find((f) => f === "author-portrait.webp");
const portraitSource = existsSync(join(HERE, "assets", "author-portrait-source.png"));
const about = sources.find((s) => s.label === "pages/about.html");
if (portrait) {
  if (!about.text.includes(`/assets/${portrait}`)) {
    fail(`PORTRAIT: ${portrait} exists but the About hero does not reference it`);
  }
  if (!portraitSource) {
    fail("PORTRAIT: author-portrait-source.png is missing — the supplied original is what the WebP is rendered from and must stay in the repo");
  }
  for (const surface of sources.filter(PAGE_SURFACES)) {
    if (surface.text.includes("author-portrait-source")) {
      fail(`PORTRAIT: ${surface.label} serves the source PNG; pages must reference the WebP`);
    }
  }
} else {
  fail(
    "PORTRAIT: site/assets/author-portrait.webp is missing. It is a deployed asset now, " +
    "not a pending one — regenerate it from author-portrait-source.png with " +
    "site/render-assets.mjs rather than dropping in a substitute.",
  );
}

// -------------------------------------------------------------- manifesto ---
const MANIFESTO = "NOVRA reflects the idea that the deepest understanding begins by recognizing";
if (!about.text.includes(MANIFESTO)) fail("MANIFESTO: approved copy missing from About");

// ---------------------------------------------------------------- identity --
for (const line of ["Fredrick Mendez, MBA", "Founder &amp; Research Architect",
                    "Technology Executive, AI Strategist &amp; Emerging Technology Innovator"]) {
  if (!about.text.includes(line)) fail(`IDENTITY: About is missing "${line}"`);
}

// ------------------------------------------------------- stylesheet drift ---
/*
 * Two stylesheets describe the same components: novra.css is flattened into
 * inline styles for the WordPress payload, components.css drives the static
 * build the visual QA screenshots. They have silently diverged twice — once
 * .hero-split was missing here while the payload had carried it all along, so
 * the QA was measuring a layout no visitor saw; once the whole brand lockup.
 *
 * Only single-class selectors are compared: that is the shared component
 * vocabulary. Compound and descendant selectors (.card p.card__meta, say) are
 * specificity repairs one file needs and the other does not, and at-rule
 * blocks are skipped because only components.css can carry media queries —
 * inline styles cannot express them.
 */
const parseCss = (file) => {
  const css = read(join(HERE, file)).replace(/\/\*[\s\S]*?\*\//g, "");
  let top = "";
  for (let i = 0; i < css.length; ) {
    if (css[i] === "@") {
      let j = css.indexOf("{", i);
      if (j < 0) break;
      for (let depth = 1; ++j < css.length && depth > 0; ) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
      }
      i = j;
    } else top += css[i++];
  }
  const rules = new Map();
  for (const [, selectors, body] of top.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = body.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean);
    for (const selector of selectors.split(",").map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean)) {
      rules.set(selector, (rules.get(selector) ?? []).concat(declarations));
    }
  }
  return rules;
};
const payloadCss = parseCss("novra.css");
const staticCss = parseCss("components.css");
const settled = (rule) => rule.slice().sort().join("; ");
let compared = 0;
for (const [selector, declarations] of payloadCss) {
  if (!/^\.[a-z0-9_-]+$/.test(selector)) continue;
  compared++;
  if (!staticCss.has(selector)) {
    fail(`DRIFT: ${selector} is in novra.css but not components.css — the static build will not show what the site serves`);
  } else if (settled(declarations) !== settled(staticCss.get(selector))) {
    fail(`DRIFT: ${selector} differs\n    novra.css:      ${settled(declarations)}\n    components.css: ${settled(staticCss.get(selector))}`);
  }
}
for (const selector of staticCss.keys()) {
  if (/^\.[a-z0-9_-]+$/.test(selector) && !payloadCss.has(selector)) {
    fail(`DRIFT: ${selector} is in components.css but not novra.css — the static build shows something the site does not serve`);
  }
}
notes.push(`stylesheet drift: ${compared} shared component rules compared`);

for (const note of notes) console.log(`note  ${note}`);
if (failures.length) {
  console.log(`\nCONTENT_QA=FAIL (${failures.length})`);
  for (const f of failures) console.log(`  ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\nCONTENT_QA=PASS (${sources.length} sources checked)`);
}
