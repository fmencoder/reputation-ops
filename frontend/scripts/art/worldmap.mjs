/**
 * The Insights environment: a research network over a world map.
 *
 * Same real land data as the globe, projected flat, so the two read as views of
 * one planet. The reference panel puts invented percentages beside this; those
 * are not reproduced anywhere — the map carries no figures at all.
 */
import { geoEquirectangular, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { createRequire } from "node:module";
import { IMAGE, mulberry32, backdrop, glowDefs } from "./common.mjs";

const require = createRequire(import.meta.url);
const world = require("world-atlas/land-110m.json");
const land = feature(world, world.objects.land);

/**
 * `network` draws the hub nodes and the arcs between them. It is what makes
 * this read as a research network, and it is exactly wrong behind a portrait:
 * a bright arc crossing a face is the one thing a background must never do.
 * The About field therefore asks for the land alone.
 *
 * `transparent` hands the scene to a frame that already has a background of
 * its own, so the artwork composites onto the card instead of laying its own
 * dark rectangle over it.
 *
 * `dotScale` sizes the land dots against the width the frame is actually
 * served at, which is not the width it is drawn at. A scene drawn 1707px wide
 * and delivered into a 460px card is downsampled by 3.6x, and a 1.15px dot
 * becomes a third of a pixel — it does not get smaller, it averages into the
 * background and disappears. Measured, not guessed: the first cut of the About
 * field rendered as an empty card in Chromium at every width. Frames that ship
 * far below their drawn size scale their dots up to compensate.
 */
export function worldMapScene({
  width,
  height,
  seed = 9021,
  density = 1.5,
  network = true,
  stars = 140,
  transparent = false,
  dotScale = 1,
  fit = [0.03, 0.06, 0.97, 0.94],
}) {
  const random = mulberry32(seed);
  const projection = geoEquirectangular()
    .fitExtent(
      [[width * fit[0], height * fit[1]], [width * fit[2], height * fit[3]]],
      land,
    );
  const back = backdrop({ width, height, lightX: 0.5, lightY: 0.44, random, stars, transparent });

  const dots = [];
  for (let lat = -58; lat <= 78; lat += density) {
    for (let lon = -180; lon <= 180; lon += density) {
      if (!geoContains(land, [lon, lat])) continue;
      const p = projection([lon, lat]);
      if (!p) continue;
      if (random() > 0.7) continue;
      dots.push({ x: p[0], y: p[1], bright: random() > 0.93 });
    }
  }

  /* A handful of brighter nodes with links, placed on land at real
     coordinates. They carry no label and stand for nothing countable, and a
     frame that asks for `network: false` gets none of them. */
  const hubs = !network
    ? []
    : [
      [-74, 40.7], [-0.1, 51.5], [103.8, 1.35], [139.7, 35.7],
      [-122.4, 37.8], [55.3, 25.3], [-46.6, -23.6], [151.2, -33.9],
      [13.4, 52.5], [77.2, 28.6],
    ]
      .map((c) => projection(c))
      .filter(Boolean)
      .map(([x, y]) => ({ x, y }));

  const links = [];
  for (let i = 0; i < hubs.length; i += 1) {
    for (let j = i + 1; j < hubs.length; j += 1) {
      if (random() > 0.42) continue;
      const a = hubs[i];
      const b = hubs[j];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.18;
      links.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${back.defs}${glowDefs(1)}</defs>
  ${back.body}
  <g>
    ${dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${((d.bright ? 1.9 : 1.15) * dotScale).toFixed(2)}" fill="${d.bright ? "#ffffff" : IMAGE.bluePale}" opacity="${d.bright ? 0.9 : 0.42}"/>`).join("")}
  </g>
  <g fill="none" stroke="${IMAGE.blueLit}" stroke-opacity="0.4" stroke-width="1.1" filter="url(#bloomS)">
    ${links.map((d) => `<path d="${d}"/>`).join("")}
  </g>
  <g>
    ${hubs.map((h) => `<circle cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="9" fill="${IMAGE.blue}" opacity="0.30" filter="url(#bloomM)"/><circle cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="3" fill="#ffffff" opacity="0.95"/>`).join("")}
  </g>
</svg>`;
}
