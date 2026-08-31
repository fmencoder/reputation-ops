/**
 * Rasteriser for the SVG-authored diagram assets.
 *
 * WordPress rejects `image/svg+xml` uploads and strips inline SVG, so nothing
 * authored as SVG can ship as SVG. It can, however, ship as WebP — which is why
 * the pipeline is author-in-SVG, deploy-as-raster. The `.svg` beside each
 * `.webp` is the editable original and is deliberately never uploaded.
 *
 * Quality is 72, not the 80 these were first cut at. 72 was adopted after
 * comparing 1:1 crops at native resolution across 82/76/72/68: the plate
 * gradients, hairline borders, 1px curves and focal glow are indistinguishable
 * at 72, and it removes about 17% of the bytes. Below 68 the dark gradients
 * start to band, which is the failure mode to watch for on this palette.
 *
 * Usage: node site/render-assets.mjs [--check]
 *   --check re-renders to memory and compares byte length against the committed
 *   file, so a drifted asset fails instead of being silently stale.
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "assets");

/** density 160 is the rasterisation DPI; text below ~14px in the SVG softens under it. */
const DENSITY = 160;
const QUALITY = 72;
const EFFORT = 6;

const TARGETS = [
  { svg: "novra-convergence-architecture.svg",
    webp: "novra-convergence-architecture.webp",
    width: 1600, height: 900,
    note: "Panel E, desktop. Landscape; control labels rotated." },
  { svg: "novra-convergence-architecture-mobile.svg",
    webp: "novra-convergence-architecture-mobile.webp",
    width: 900, height: 1200,
    note: "Panel E, ≤620px. Separate composition — the desktop rotated labels are already illegible at a 572px content column." },
  { svg: "reliability-budget-agentic-ai.svg",
    webp: "reliability-budget-agentic-ai.webp",
    width: 1600, height: 900,
    note: "Article hero. One composition serves every width; it carries no type." },
];

async function render(target) {
  const svg = await readFile(join(ASSETS, target.svg));
  return sharp(svg, { density: DENSITY })
    .resize(target.width, target.height)
    .webp({ quality: QUALITY, effort: EFFORT })
    .toBuffer();
}

const check = process.argv.includes("--check");
let failed = false;

for (const target of TARGETS) {
  const buffer = await render(target);
  const path = join(ASSETS, target.webp);

  if (check) {
    const current = await stat(path).catch(() => null);
    const ok = current?.size === buffer.length;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "DRIFT"} ${target.webp} — committed ${current?.size ?? "missing"}B, rendered ${buffer.length}B`);
    continue;
  }

  await writeFile(path, buffer);
  console.log(`${target.webp} — ${target.width}×${target.height}, ${buffer.length}B`);
}

if (failed) {
  console.log("\nRe-run without --check to regenerate, then LOOK at the result before committing.");
  process.exitCode = 1;
}
