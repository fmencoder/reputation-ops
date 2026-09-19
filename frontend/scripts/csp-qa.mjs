/**
 * CSP verification against the running application.
 *
 * Loads every route with the policy enforced and records
 * `securitypolicyviolation` events — the browser's own report of what the
 * header blocked. Network failures are reported separately, because in a
 * sandbox with no egress a blocked font request looks superficially like a CSP
 * block and is not one.
 *
 * Usage: node scripts/csp-qa.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const EXTERNAL = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|novraintelligence\.wordpress\.com)/;

const PATHS = ["/", "/capabilities/", "/global-development/", "/insights/", "/research/",
  "/technology/", "/about/", "/contact/", "/2026/08/31/agentic-ai-reliability-budget/", "/no-such-page/"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
let violations = 0, unreachableExternal = 0, brokenSameOrigin = 0, images = 0;

for (const path of PATHS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const seen = [];
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__csp.push({ directive: e.effectiveDirective, blocked: e.blockedURI, line: e.lineNumber });
    });
  });
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (EXTERNAL.test(url)) unreachableExternal += 1;
    else { brokenSameOrigin += 1; seen.push(`  network-fail ${url} — ${r.failure()?.errorText}`); }
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(() => {});
  // give violation events a tick to land
  await page.waitForTimeout(250);
  const csp = await page.evaluate(() => window.__csp || []);
  const imgOk = await page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length);
  images += imgOk;
  if (csp.length) {
    violations += csp.length;
    console.log(`\nCSP VIOLATIONS on ${path}`);
    for (const v of csp) console.log(`  [${v.directive}] blocked ${v.blocked} (line ${v.line})`);
  }
  for (const line of seen) console.log(`${path}${line}`);
  await page.close();
}
await browser.close();

console.log(`\nimages loaded across routes: ${images}`);
console.log(`same-origin request failures: ${brokenSameOrigin}`);
console.log(`external requests unreachable from this sandbox (egress policy, not CSP): ${unreachableExternal}`);
console.log(violations === 0 && brokenSameOrigin === 0
  ? `\nCSP_QA=PASS (${PATHS.length} routes, 0 violations, 0 same-origin failures)`
  : `\nCSP_QA=FAIL (${violations} violations, ${brokenSameOrigin} same-origin failures)`);
process.exit(violations === 0 && brokenSameOrigin === 0 ? 0 : 1);
