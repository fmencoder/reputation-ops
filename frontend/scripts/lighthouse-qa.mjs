/**
 * Lighthouse against the local production build.
 *
 * Mobile and desktop presets over the representative routes. Emits the four
 * category scores plus the metrics that decide them, and writes the full JSON
 * reports so a number in a report can be traced back to its run.
 *
 * Usage: node scripts/lighthouse-qa.mjs [--base http://127.0.0.1:3000] [--out DIR]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import lighthouse from "/home/user/reputation-ops/node_modules/lighthouse/core/index.js";
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = arg("out", "../artifacts/lighthouse");
mkdirSync(OUT, { recursive: true });

const PATHS = ["/", "/capabilities/", "/global-development/", "/2026/08/31/agentic-ai-reliability-budget/"];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--remote-debugging-port=9222"],
});
const port = 9222;

const rows = [];
for (const formFactor of ["mobile", "desktop"]) {
  const settings = formFactor === "desktop"
    ? {
        formFactor: "desktop",
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
        throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
      }
    : { formFactor: "mobile",
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false } };

  for (const path of PATHS) {
    const result = await lighthouse(`${BASE}${path}`, { port, output: "json", logLevel: "error" },
      { extends: "lighthouse:default", settings });
    const lhr = result.lhr;
    const slug = `${formFactor}${path.replace(/\//g, "_") || "_root"}`;
    writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(lhr));
    const a = (id) => lhr.audits[id] ?? {};
    rows.push({
      formFactor, path,
      perf: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      a11y: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      bp: Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      lcp: lhr.audits["largest-contentful-paint"]?.displayValue ?? "-",
      cls: lhr.audits["cumulative-layout-shift"]?.displayValue ?? "-",
      tbt: lhr.audits["total-blocking-time"]?.displayValue ?? "-",
      fcp: lhr.audits["first-contentful-paint"]?.displayValue ?? "-",
      js: Math.round((lhr.audits["network-rtt"] ? 0 : 0)),
      totalBytes: lhr.audits["total-byte-weight"]?.numericValue ?? 0,
      scriptBytes: (lhr.audits["resource-summary"]?.details?.items ?? [])
        .filter((i) => i.resourceType === "script").reduce((s, i) => s + (i.transferSize || 0), 0),
    });
  }
}
await browser.close();

console.log("form     path                                           perf a11y  bp  seo   LCP        CLS     TBT        JS(KB)  total(KB)");
for (const r of rows) {
  console.log(
    `${r.formFactor.padEnd(8)} ${r.path.padEnd(46)} ${String(r.perf).padStart(4)}${String(r.a11y).padStart(5)}${String(r.bp).padStart(4)}${String(r.seo).padStart(5)}   ${String(r.lcp).padEnd(10)} ${String(r.cls).padEnd(7)} ${String(r.tbt).padEnd(10)} ${String(Math.round(r.scriptBytes/1024)).padStart(6)} ${String(Math.round(r.totalBytes/1024)).padStart(9)}`,
  );
}
writeFileSync(join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
console.log(`\nreports written to ${OUT}`);
