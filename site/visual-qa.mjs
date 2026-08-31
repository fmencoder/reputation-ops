/**
 * Visual regression QA.
 *
 * Renders the built pages at the validated content widths and asserts the
 * things that pixel arithmetic cannot: that the image actually loaded, that the
 * figure has a real box, that the page does not scroll sideways, and that the
 * responsive source that should be serving is the one that is.
 *
 * This exists because every asset in this project has had a defect that only
 * appeared on screen — a flow spine that vanished at export, control labels
 * rendering underneath the plates they annotate, and a fallback whose CSS
 * toggles lost on specificity so both images rendered at every width with no
 * error of any kind. None of those were catchable by measurement alone.
 *
 * Screenshots are written for human review rather than diffed against a
 * baseline: an automatic pixel diff on gradient artwork produces noise, and
 * noise is how a visual check stops being read.
 *
 * Usage: npm run site:visual-qa [-- --require-browser]
 * Skips cleanly (exit 0) when Chromium is unavailable, so a local run without
 * one is not a false failure. CI passes --require-browser, where a skip is a
 * failure: a check that silently stops checking is worse than no check.
 */

import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const SHOTS = join(ROOT, "..", "artifacts", "visual-qa");
const PORT = 8931;

const TYPES = {
  ".html": "text/html", ".css": "text/css", ".webp": "image/webp",
  ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml",
  ".txt": "text/plain", ".json": "application/json",
};

/** Content column at a given viewport: min(viewport, 1200) - 48 of horizontal padding. */
const contentWidth = (viewport) => Math.min(viewport, 1200) - 48;

const TARGETS = [
  { name: "technology", path: "/technology/", widths: [1600, 1280, 1024, 860, 620, 390] },
  { name: "home", path: "/", widths: [1600, 1024, 620, 390] },
  { name: "about", path: "/about/", widths: [1600, 1024, 620, 390] },
];

/**
 * Find a Chromium to drive.
 *
 * Three sources, in order: an explicit override, the browser this sandbox
 * pre-installs, and playwright-core's own resolution after
 * `npx playwright-core install chromium`. CI uses the third; the local
 * environment has the second.
 */
async function loadChromium() {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    return null;
  }

  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);

  for (const executablePath of candidates) {
    try {
      await stat(executablePath);
      return { chromium, executablePath };
    } catch {
      // try the next candidate
    }
  }

  try {
    const resolved = chromium.executablePath();
    await stat(resolved);
    return { chromium, executablePath: resolved };
  } catch {
    return null;
  }
}

function serve() {
  const server = createServer(async (request, response) => {
    let path = (request.url ?? "/").split("?")[0];
    if (path.endsWith("/")) path += "index.html";
    try {
      const body = await readFile(join(DIST, path));
      response.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function main() {
  const requireBrowser = process.argv.includes("--require-browser");
  const browserInfo = await loadChromium();
  if (!browserInfo) {
    console.log("VISUAL_QA=SKIPPED (no Chromium or playwright-core available)");
    console.log("This is a skip, not a pass. Nothing was rendered and nothing was verified.");
    if (requireBrowser) {
      console.log("--require-browser was set, so a skip is a failure here.");
      process.exit(1);
    }
    return;
  }

  await mkdir(SHOTS, { recursive: true });
  const server = await serve();
  const browser = await browserInfo.chromium.launch({
    executablePath: browserInfo.executablePath,
    args: ["--no-sandbox"],
  });

  const failures = [];
  const rows = [];

  for (const target of TARGETS) {
    for (const width of target.widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:${PORT}${target.path}`, { waitUntil: "load" });

      const figure = page.locator("figure.figure").first();
      const hasFigure = (await figure.count()) > 0;

      if (hasFigure) {
        await figure.scrollIntoViewIfNeeded();
        // Wait for the image itself, not for the network: a lazy image below
        // the fold settles after networkidle and would measure as 0x0.
        await page
          .waitForFunction(() => {
            const image = document.querySelector("figure.figure img:not([style*='display: none'])");
            return image && image.complete && image.naturalWidth > 0;
          }, null, { timeout: 10_000 })
          .catch(() => {});
      }

      const state = await page.evaluate(() => {
        const images = [...document.querySelectorAll("figure.figure img")]
          .filter((image) => getComputedStyle(image).display !== "none");
        const first = images[0];
        const figureEl = document.querySelector("figure.figure");
        const box = figureEl?.getBoundingClientRect();
        return {
          visibleImages: images.length,
          served: first?.currentSrc.split("/").pop() ?? null,
          loaded: Boolean(first?.complete && first.naturalWidth > 0),
          figureWidth: box ? Math.round(box.width) : null,
          figureHeight: box ? Math.round(box.height) : null,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          headingSkip: (() => {
            let previous = 0;
            for (const heading of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
              const level = Number(heading.tagName[1]);
              if (previous !== 0 && level > previous + 1) return true;
              previous = level;
            }
            return false;
          })(),
        };
      });

      const label = `${target.name}@${width}`;
      rows.push({ label, expectedColumn: contentWidth(width), ...state });

      if (state.overflow) failures.push(`${label}: page scrolls horizontally`);
      if (state.headingSkip) failures.push(`${label}: heading order skips a level`);
      if (hasFigure) {
        if (!state.loaded) failures.push(`${label}: figure image did not load`);
        if (state.visibleImages !== 1) {
          failures.push(`${label}: ${state.visibleImages} visible figure images — exactly one responsive source must win`);
        }
        if (!state.figureWidth || !state.figureHeight) failures.push(`${label}: figure has zero size`);
        if (state.figureWidth && Math.abs(state.figureWidth - contentWidth(width)) > 2) {
          failures.push(`${label}: figure is ${state.figureWidth}px, expected ~${contentWidth(width)}px`);
        }
        await figure.screenshot({ path: join(SHOTS, `${target.name}-${width}.png`) });
      }

      await page.close();
    }
  }

  await browser.close();
  server.close();

  for (const row of rows) {
    console.log(
      `${row.label.padEnd(18)} column=${String(row.expectedColumn).padStart(4)} ` +
      `figure=${String(row.figureWidth ?? "-").padStart(4)}x${String(row.figureHeight ?? "-").padEnd(4)} ` +
      `visible=${row.visibleImages} served=${row.served ?? "-"} overflow=${row.overflow}`,
    );
  }

  if (failures.length > 0) {
    console.log("\nVISUAL_QA=FAIL");
    for (const failure of failures) console.log(`  ${failure}`);
    process.exit(1);
  }
  console.log(`\nVISUAL_QA=PASS (${rows.length} viewport renders, screenshots in artifacts/visual-qa/)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
