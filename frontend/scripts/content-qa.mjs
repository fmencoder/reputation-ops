/**
 * Content integrity QA.
 *
 * Reports what every article actually contains and asserts the rules that stop
 * a hollow one from shipping. It imports the same integrity module the site
 * builds against — deliberately, rather than re-deriving the arithmetic here,
 * because a QA script with its own copy of the rules can pass while the site
 * fails.
 *
 * Run with: npm run content-qa
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  inspectBody,
  readingTime,
  wordCount,
  MIN_ARTICLE_WORDS,
  MIN_RETENTION,
  WPM,
} from "../lib/cms/integrity.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Parsed from the source rather than restated, so a diagram cannot be removed
 * from the family without this failing. */
const ART = [
  ...readFileSync(join(root, "components", "graphics", "ArticleArt.tsx"), "utf8")
    .matchAll(/^\s{2}"([a-z0-9-]+)": (?:reliabilityBudget|contextEngineering|deterministicBoundary|humanOversight|recoverability),$/gm),
].map((match) => match[1]);
const snapshot = JSON.parse(readFileSync(join(root, "content", "cms-snapshot.json"), "utf8"));

let failed = 0;
const fail = (message) => {
  failed += 1;
  console.error(`FAIL  ${message}`);
};
const pass = (message) => console.log(`ok    ${message}`);

console.log(`Article art: ${ART.length} diagrams — ${ART.join(", ")}\n`);
console.log(`Canonical snapshot: ${snapshot.articles.length} articles, ${WPM} wpm, floor ${MIN_ARTICLE_WORDS} words, retention ${Math.round(MIN_RETENTION * 100)}%\n`);

if (snapshot.articles.length === 0) fail("snapshot contains no articles");

const rows = [];
for (const article of snapshot.articles) {
  const words = wordCount(article.bodyHtml);
  const derived = readingTime(article.bodyHtml);
  const report = inspectBody(article.bodyHtml, { excerptWords: wordCount(article.excerpt) });

  rows.push({ slug: article.slug, words, derived, recorded: article.readingTime, report });

  if (!report.ok) fail(`${article.slug}: ${report.reasons.join("; ")}`);

  /*
   * The snapshot records a reading time alongside the body. Deriving it again
   * has to reproduce that value, or one of the two is wrong — and this is the
   * check that would have caught "1 min read" beside a 1,600-word article.
   */
  if (article.readingTime && article.readingTime !== derived) {
    fail(`${article.slug}: recorded reading time ${article.readingTime} but body of ${words} words derives ${derived}`);
  }

  if (!article.path.endsWith("/")) fail(`${article.slug}: path ${article.path} has no trailing slash`);
  /*
   * The visible article art is the drawing in components/graphics/ArticleArt;
   * the raster in the snapshot survives only because Open Graph and
   * schema.org need a bitmap and cannot take an inline SVG.
   */
  if (!ART.includes(article.slug)) fail(`${article.slug}: no diagram in the article-art system`);
  if (!article.hero?.src) fail(`${article.slug}: no raster for Open Graph and structured data`);
  if (!article.topic) fail(`${article.slug}: no editorial topic`);
}

console.log("slug                                          words  headings  paras  reading");
for (const row of rows) {
  console.log(
    `${row.slug.padEnd(45)} ${String(row.words).padStart(5)} ${String(row.report.headings).padStart(9)} ${String(row.report.paragraphs).padStart(6)}  ${row.derived}`,
  );
}
console.log();

/*
 * Negative tests. A gate nobody has watched reject anything is a comment.
 * These are the exact four shapes the rejected preview could have shipped.
 */
const complete = snapshot.articles[0];
const canonicalWords = wordCount(complete.bodyHtml);
const cases = [
  ["an empty body", "", {}],
  ["a body that is only the excerpt", `<p>${complete.excerpt}</p>`, { excerptWords: wordCount(complete.excerpt) }],
  [
    "a body that lost half its words",
    complete.bodyHtml.slice(0, Math.floor(complete.bodyHtml.length / 2)),
    { canonicalWords },
  ],
  ["a single short paragraph", "<p>Two sentences. That is all there is.</p>", {}],
];
for (const [name, html, expect] of cases) {
  const report = inspectBody(html, expect);
  if (report.ok) fail(`the gate accepted ${name}`);
  else pass(`the gate rejects ${name} (${report.reasons[0]})`);
}

const kept = inspectBody(complete.bodyHtml, {
  excerptWords: wordCount(complete.excerpt),
  canonicalWords,
});
if (!kept.ok) fail(`the gate rejects a known-complete article: ${kept.reasons.join("; ")}`);
else pass("the gate accepts a known-complete article");

/* ------------------------------------------------------------------ CSS --
 * Every custom property a stylesheet reads has to exist.
 *
 * A `var(--s-7)` in a shorthand where the scale jumps 6 to 8 does not fall back
 * to something sensible: the browser drops the whole declaration and the
 * padding silently becomes zero. Six such references shipped in this pass
 * before this check existed, and not one of them showed up in a build, a
 * typecheck or a lint.
 */
const cssFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) return [];
    if (statSync(full).isDirectory()) return cssFiles(full);
    return full.endsWith(".css") ? [full] : [];
  });

const sheets = ["app", "components", "styles"].flatMap((dir) => cssFiles(join(root, dir)));
const defined = new Set();
for (const file of sheets) {
  for (const match of readFileSync(file, "utf8").matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
    defined.add(match[1]);
  }
}

let missingProps = 0;
for (const file of sheets) {
  for (const match of readFileSync(file, "utf8").matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/gi)) {
    // A declared fallback is a deliberate choice, not a typo.
    if (match[2] || defined.has(match[1])) continue;
    missingProps += 1;
    fail(`${file.slice(root.length + 1)} reads ${match[1]}, which no stylesheet defines`);
  }
}
if (!missingProps) pass(`every custom property read across ${sheets.length} stylesheets is defined`);

console.log();
if (failed) {
  console.error(`CONTENT_INTEGRITY_QA: FAIL (${failed})`);
  process.exit(1);
}
console.log("CONTENT_INTEGRITY_QA: PASS");
