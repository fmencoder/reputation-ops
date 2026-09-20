/**
 * Renders the NOVRA image brand to WebP.
 *
 * The scenes are authored as SVG and rasterised here, because the finished
 * assets need to be images — the reference board is photographic in feel, and
 * shipping this as inline SVG would put thousands of nodes into every document
 * and give the browser a diagram to lay out rather than a picture to paint.
 *
 * Every scene is generated twice, with different composition rather than a
 * different scale: the phone frame is not the desktop frame made small.
 *
 * Run with: npm run art   (from frontend/, resolves the repo-root toolchain)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { earthScene } from "./art/earth.mjs";
import { cubeScene } from "./art/cubes.mjs";
import { worldMapScene } from "./art/worldmap.mjs";
import { orbitalScene } from "./art/orbital.mjs";
import { editorialScene, ARTICLE_SLUGS } from "./art/editorial.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "art");
mkdirSync(OUT, { recursive: true });

const QUALITY = 82;

/**
 * A per-edge alpha falloff.
 *
 * A radial mask cannot do this: at the middle of each edge it is still well
 * inside its radius, so the artwork stays fully opaque there and ends on a
 * straight cut. This fades every edge independently, which is what actually
 * dissolves a bleeding scene into the page. It is applied to the raster rather
 * than the SVG so the geometry is exact at the size that ships.
 */
async function featherEdges(buffer, feather = 0.16) {
  const image = sharp(buffer).ensureAlpha();
  const { width, height } = await image.metadata();
  const span = Math.round(Math.min(width, height) * feather);
  /*
   * The mask carries its value in the ALPHA channel, not in luminance.
   * `dest-in` keeps the destination where the source is opaque, so a greyscale
   * mask is silently a no-op: every pixel of it is fully opaque and nothing is
   * removed. That mistake shipped once and looked exactly like no feather.
   */
  const mask = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < height; y += 1) {
    const dy = Math.min(y, height - 1 - y) / span;
    for (let x = 0; x < width; x += 1) {
      const dx = Math.min(x, width - 1 - x) / span;
      const t = Math.max(0, Math.min(1, Math.min(dx, dy)));
      // Smoothstep, so the falloff has no visible shoulder.
      mask[(y * width + x) * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
  }
  return image
    .composite([{ input: mask, raw: { width, height, channels: 4 }, blend: "dest-in" }])
    .toBuffer();
}

/*
 * Scenes that run past their frame and must not end on a straight cut.
 *
 * The About world map is deliberately NOT here. Its frame is a near-square
 * card with the portrait covering the middle, so the only part of the artwork
 * anyone ever sees is the outer band — which is exactly the band featherEdges
 * fades to nothing. Feathered, the map reads as an empty card. It needs no
 * feather anyway: it is drawn transparent, so it has no rectangle of its own
 * to end on.
 */
const BLEEDS = new Set(["home-earth", "home-earth-narrow", "tech-cubes", "tech-cubes-narrow", "about-orbital", "about-orbital-narrow"]);

const TARGETS = [
  /* Home. Desktop: the globe sits right and runs past the frame edge, as the
     reference does. Phone: the same globe, recomposed centred and closer. */
  ["home-earth", () => earthScene({ width: 1500, height: 1180, cx: 880, cy: 560, radius: 600, transparent: true })],
  ["home-earth-narrow", () => earthScene({ width: 820, height: 700, cx: 430, cy: 340, radius: 375, rotate: [92, -8, 0], transparent: true })],

  ["tech-cubes", () => cubeScene({ width: 1560, height: 1020, transparent: true })],
  ["tech-cubes-narrow", () => cubeScene({ width: 820, height: 780, seed: 4102, scale: 0.72, transparent: true })],

  ["insights-map", () => worldMapScene({ width: 1520, height: 800 })],
  ["insights-map-narrow", () => worldMapScene({ width: 800, height: 560, density: 2.1 })],

  /* Global Development. The same projection as the insights map, drawn from a
     different seed and denser, so the two pages do not share one picture: this
     one is about reach across regions rather than where research is filed. */
  ["global-map", () => worldMapScene({ width: 1520, height: 860, seed: 4471, density: 1.95 })],
  ["global-map-narrow", () => worldMapScene({ width: 800, height: 600, seed: 4471, density: 2.4 })],

  /* Research keeps the orbital field. */
  ["about-orbital", () => orbitalScene({ width: 1280, height: 1060, transparent: true })],
  ["about-orbital-narrow", () => orbitalScene({ width: 800, height: 720, cx: 0.5, cy: 0.46, transparent: true })],

  /*
   * The founder stage: the world map, approved as the environment behind the
   * portrait.
   *
   * Composed against the card as Chromium actually lays it out, which is not
   * what the stylesheet reads like. `.portraitFrame` has a 300px max-width, but
   * the stage centres its grid items rather than stretching them, so the
   * portrait settles at 208-239px and the card at 350x291 on a phone and
   * 460x307 on a desktop. The first cut of this artwork was drawn for an
   * assumed 460x366 and 342x358, and object-fit:cover quietly ate a fifth of
   * the phone frame's height to reconcile the difference. Measure the box
   * before composing for it.
   *
   * The whole world is in frame, which is what makes it read as a map: the
   * Americas to the left of the portrait, Europe and Africa behind it, Asia and
   * Australia to the right. The `fit` extent runs about 1.35x past the canvas
   * horizontally, trimming the empty mid-Pacific so the drawn band fills the
   * card's height instead of floating in it, and its vertical centre is offset
   * because the land bounding box includes an Antarctica this map does not draw
   * — centre the box and the continents sit visibly high.
   *
   * Fine dots, not big ones. This is a halftone of the land, so the grid is
   * dense (1.15 degrees) and each dot small; the phone frame is coarser in
   * degrees and smaller in scale so its pitch on screen matches. And the accent
   * dots are a near-white blue at one land point in a hundred, not white at one
   * in fourteen: white at map scale behind a face reads as a star field, which
   * is the one thing the approved reference is not. The land itself is drawn in
   * the brand's lit blue rather than its palest, so it reads as cobalt against
   * the card instead of grey. Stars are off for the same reason — the empty
   * ocean stays empty.
   *
   * The dots are sized against what is actually delivered, not what is drawn.
   * At 1024px and up the optimizer serves a 480px-wide frame into a card that
   * is 920 device pixels across on a retina screen, so a dot that looks right
   * in the 2027px original is invisible by the time it is painted. Every visual
   * judgement here was made from a Chromium screenshot with .next/cache/images
   * cleared first: that cache keys on the file path, so an edited artwork at an
   * unchanged path serves the previous render and the check silently passes on
   * the old picture.
   */
  ["about-worldmap", () => worldMapScene({
    width: 1520, height: 1013, seed: 5310, density: 1.15, dotScale: 2.0,
    network: false, stars: 0, transparent: true,
    dotColor: "#7db4ff", dotOpacity: 0.78,
    highlight: "#dbe8ff", highlightOpacity: 0.72, highlightRate: 0.99,
    fit: [-0.18, 0.024, 1.18, 1.124],
  })],
  ["about-worldmap-narrow", () => worldMapScene({
    width: 840, height: 700, seed: 5310, density: 1.45, dotScale: 1.75,
    network: false, stars: 0, transparent: true,
    dotColor: "#7db4ff", dotOpacity: 0.78,
    highlight: "#dbe8ff", highlightOpacity: 0.72, highlightRate: 0.99,
    fit: [-0.16, 0.057, 1.16, 1.057],
  })],
];

for (const slug of ARTICLE_SLUGS) {
  TARGETS.push([`article-${slug}`, () => editorialScene(slug, { width: 1680, height: 800 })]);
  TARGETS.push([`article-${slug}-narrow`, () => editorialScene(slug, { width: 820, height: 620 })]);
}

const report = [];
for (const [name, draw] of TARGETS) {
  const svg = draw();
  const file = join(OUT, `${name}.webp`);
  /* Alpha is kept: a bleeding scene composites onto the page rather than
     carrying its own dark rectangle, which is what stops an image edge showing
     where the artwork is meant to run past its frame. */
  let raster = await sharp(Buffer.from(svg), { density: 96 }).png().toBuffer();
  if (BLEEDS.has(name)) raster = await featherEdges(raster);
  const info = await sharp(raster)
    .webp({ quality: QUALITY, effort: 6, alphaQuality: 92 })
    .toFile(file);
  report.push({ name, width: info.width, height: info.height, kb: +(info.size / 1024).toFixed(1) });
}

/* The intrinsic sizes are written out beside the images rather than restated in
   the components. A hand-copied width that drifts from the file is a layout
   shift nobody notices until it ships. */
const manifest = Object.fromEntries(report.map((r) => [r.name, { width: r.width, height: r.height }]));
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "content", "art-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const total = report.reduce((sum, r) => sum + r.kb, 0);
for (const r of report) console.log(`${r.name.padEnd(48)} ${r.width}x${r.height}  ${r.kb} KB`);
console.log(`\n${report.length} images, ${total.toFixed(0)} KB total, written to public/art/`);
