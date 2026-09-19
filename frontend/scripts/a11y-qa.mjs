/**
 * Accessibility audit against the running application.
 *
 * browser-qa.mjs checks structure, SEO surfaces and the brand contract; it does
 * not evaluate contrast, roles or names, and those are the failures an
 * institutional reviewer is most likely to be required to report. This runs
 * axe-core over every page at a phone width and a desktop width.
 *
 * Usage: node scripts/a11y-qa.mjs [--base http://127.0.0.1:3000]
 */
import { readFileSync } from "node:fs";
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const AXE = readFileSync("/home/user/reputation-ops/node_modules/axe-core/axe.min.js", "utf8");

const PATHS = [
  "/",
  "/capabilities/",
  "/global-development/",
  "/insights/",
  "/research/",
  "/technology/",
  "/about/",
  "/contact/",
  "/2026/08/31/agentic-ai-reliability-budget/",
];
const WIDTHS = [390, 1440];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
let violations = 0;
let runs = 0;

for (const path of PATHS) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) {
      console.log(`FAIL ${path} @${width}: HTTP ${res ? res.status() : "none"}`);
      violations += 1;
      await page.close();
      continue;
    }
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(async () =>
      // WCAG 2.1 A and AA only: those are the levels a public body actually cites.
      await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      }),
    );
    runs += 1;
    const serious = result.violations;
    if (serious.length) {
      violations += serious.length;
      console.log(`\nFAIL ${path} @${width}px`);
      for (const v of serious) {
        console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`      ${node.target.join(" ")} — ${(node.failureSummary || "").split("\n").slice(1, 3).join(" ")}`);
        }
      }
    }
    await page.close();
  }
}
await browser.close();

console.log(
  violations === 0
    ? `\nA11Y_QA=PASS (${runs} audits, WCAG 2.1 A/AA, 0 violations)`
    : `\nA11Y_QA=FAIL (${runs} audits, ${violations} violation type(s))`,
);
process.exit(violations === 0 ? 0 : 1);
