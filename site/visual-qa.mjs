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

/**
 * Width of one column of `.hero-split`, which is
 * `repeat(auto-fit, minmax(320px, 1fr))` with a 64px gap. Above the point where
 * two 320px columns stop fitting, the hero figure is half the content column;
 * below it, the grid collapses and the figure is the full column.
 */
const heroColumnWidth = (viewport) => {
  const content = contentWidth(viewport);
  const half = (content - 64) / 2;
  return half >= 320 ? half : content;
};

/*
 * `figureIndex` matters. Both the home and technology pages now carry more than
 * one figure, and a check that always measured the first one would quietly stop
 * checking the diagram it was written for — the exact failure this file exists
 * to prevent.
 */
const TARGETS = [
  { name: "technology-band", path: "/technology/", figureIndex: 0, widths: [1600, 1024, 620, 390] },
  { name: "technology", path: "/technology/", figureIndex: 1, widths: [1600, 1280, 1024, 860, 620, 390] },
  { name: "home", path: "/", figureIndex: 0, expectWidth: heroColumnWidth, widths: [1600, 1024, 620, 390] },
  { name: "about", path: "/about/", figureIndex: 0, widths: [1600, 1024, 620, 390] },

  /*
   * The payload targets are the ones that matter. They render the exact bytes
   * pushed to WordPress, with no stylesheet and with the sanitiser's edits
   * already applied — as close to the public page as this environment can get,
   * since the egress proxy blocks the live domain.
   */
  { name: "wp-home", path: "/payload/02-home", figureIndex: 0, expectWidth: heroColumnWidth, widths: [1600, 1024, 620, 390] },
  { name: "wp-technology-band", path: "/payload/03-technology", figureIndex: 0, widths: [1600, 1024, 620, 390] },
  { name: "wp-technology", path: "/payload/03-technology", figureIndex: 1, widths: [1600, 1024, 620, 390] },
  { name: "wp-article", path: "/payload/23-article-deterministic-boundaries-ai-smart-contracts", figureIndex: 1, expectWidth: null, widths: [1600, 1024, 620, 390] },
  { name: "wp-about", path: "/payload/01-about", figureIndex: 0, expectWidth: null, widths: [1600, 1024, 620, 390] },
  { name: "wp-insights", path: "/payload/04-insights", figureIndex: 0, expectWidth: null, widths: [1600, 1024, 620, 390] },
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

/*
 * Declarations WordPress.com removes from a style attribute. Measured against
 * the live site, not assumed. `box-sizing` is the one that bites: without it
 * every padded container is wider than its max-width, and a 1200px wrap renders
 * at 1248.
 */
const STRIPPED_BY_WPCOM = [
  "box-sizing", "-webkit-font-smoothing", "-webkit-background-clip", "background-clip", "clip",
];

/**
 * Render an inline payload the way the public site gets it: the flattened
 * markup, no stylesheet of any kind, and the sanitiser's edits already applied.
 *
 * `dist/` is a different artefact. It loads components.css and is deployed
 * nowhere. Checking only `dist` means checking a layout no visitor sees — which
 * is how `.hero-split` came to be absent from components.css without anyone
 * noticing, while the WordPress payload has carried it all along.
 */
async function payloadPage(name) {
  const raw = await readFile(join(ROOT, "wp-payload-inline", `${name}.json`), "utf8");
  /*
   * Point every Media Library URL at the local file it was uploaded from. The
   * egress proxy blocks the CDN, so without this every image renders as a
   * broken box and the layout measurements are meaningless. The bytes are the
   * same either way — each upload was verified by comparing the returned
   * media_details.filesize against the local file.
   */
  const media = JSON.parse(await readFile(join(ROOT, "wp-media.json"), "utf8")).assets;
  const localFor = new Map(Object.entries(media).map(([local, remote]) => [remote, local]));
  const content = JSON.parse(raw).params.content
    .replace(/https:\/\/[^"']*?\/wp-content\/uploads\/[^"']+/g, (url) => localFor.get(url) ?? url)
    .replace(/^<!-- wp:html -->\n?/, "")
    .replace(/\n?<!-- \/wp:html -->$/, "")
    .replace(/ style="([^"]*)"/g, (whole, attr) => {
      const kept = attr
        .split(";")
        .filter((declaration) => {
          const property = declaration.split(":")[0].trim().toLowerCase();
          return property && !STRIPPED_BY_WPCOM.includes(property);
        })
        .join(";");
      return kept ? ` style="${kept}"` : "";
    });
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${name}</title></head><body style="margin:0">${content}</body></html>`;
}

function serve() {
  const server = createServer(async (request, response) => {
    let path = (request.url ?? "/").split("?")[0];
    const payloadMatch = /^\/payload\/([\w-]+)$/.exec(path);
    if (payloadMatch) {
      try {
        // Build the body BEFORE writing headers: a throw after writeHead makes
        // the failure unreportable and crashes the server instead.
        const html = await payloadPage(payloadMatch[1]);
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(html);
      } catch (error) {
        response.writeHead(500, { "Content-Type": "text/plain" }).end(String(error));
      }
      return;
    }
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

      const index = target.figureIndex ?? 0;
      const figure = page.locator("figure.figure").nth(index);
      const hasFigure = (await figure.count()) > 0;

      if (hasFigure) {
        await figure.scrollIntoViewIfNeeded();
        // Wait for the image itself, not for the network: a lazy image below
        // the fold settles after networkidle and would measure as 0x0.
        await page
          .waitForFunction((i) => {
            const fig = document.querySelectorAll("figure.figure")[i];
            const image = fig?.querySelector("img:not([style*='display: none'])");
            return image && image.complete && image.naturalWidth > 0;
          }, index, { timeout: 10_000 })
          .catch(() => {});
      }

      const state = await page.evaluate((i) => {
        const figureEl = document.querySelectorAll("figure.figure")[i];
        const images = [...(figureEl?.querySelectorAll("img") ?? [])]
          .filter((image) => getComputedStyle(image).display !== "none");
        const first = images[0];
        const box = figureEl?.getBoundingClientRect();
        return {
          visibleImages: images.length,
          served: first?.currentSrc.split("/").pop() ?? null,
          loaded: Boolean(first?.complete && first.naturalWidth > 0),
          figureWidth: box ? Math.round(box.width) : null,
          figureHeight: box ? Math.round(box.height) : null,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          /*
           * A heading whose longest word is wider than its own column. The page
           * still "renders" — overflow is visible, nothing throws — so only a
           * measurement catches it. The uppercase hero display found this the
           * hard way: INFRASTRUCTURE. ran 40px past its grid track on the live
           * payload while the static build silently widened the track instead,
           * so the two builds disagreed and neither looked wrong on its own.
           */
          overflowingHeadings: [...document.querySelectorAll("h1,h2,h3")]
            // Screen-reader-only headings are clipped to a 1px box on purpose;
            // measuring those would report every page as broken.
            .filter((heading) => heading.clientWidth > 2 && heading.clientHeight > 2)
            .filter((heading) => heading.scrollWidth > Math.ceil(heading.clientWidth) + 1)
            .map((heading) => `${heading.tagName.toLowerCase()} needs ${heading.scrollWidth}px in ${Math.round(heading.clientWidth)}px`),
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
      }, index);

      const expected = Math.round((target.expectWidth || contentWidth)(width));
      const label = `${target.name}@${width}`;
      rows.push({ label, expectedColumn: expected, ...state });

      if (state.overflow) failures.push(`${label}: page scrolls horizontally`);
      if (state.headingSkip) failures.push(`${label}: heading order skips a level`);
      for (const overflowing of state.overflowingHeadings) {
        failures.push(`${label}: ${overflowing} — the headline does not fit its column`);
      }
      if (hasFigure) {
        if (!state.loaded) failures.push(`${label}: figure image did not load`);
        if (state.visibleImages !== 1) {
          failures.push(`${label}: ${state.visibleImages} visible figure images — exactly one responsive source must win`);
        }
        if (!state.figureWidth || !state.figureHeight) failures.push(`${label}: figure has zero size`);
        if (target.expectWidth === null) {
          if (state.figureWidth && state.figureWidth > contentWidth(width) + 2) {
            failures.push(`${label}: figure is ${state.figureWidth}px, wider than its ${contentWidth(width)}px column`);
          }
        } else if (state.figureWidth && Math.abs(state.figureWidth - expected) > 2) {
          failures.push(`${label}: figure is ${state.figureWidth}px, expected ~${expected}px`);
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
