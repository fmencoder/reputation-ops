/**
 * The home hero: a luminous networked Earth.
 *
 * The continents are real. They come from the Natural Earth 110m dataset,
 * projected orthographically and centred on the Western Hemisphere, then
 * sampled on a lat/lon grid so land reads as a field of lit nodes rather than a
 * filled shape. Drawing it freehand would have produced something globe-shaped
 * that is not a globe, and the reference is specific: the Americas are legible.
 */
import { geoOrthographic, geoPath, geoContains } from "d3-geo";
import { edgeFade } from "./common.mjs";
import { feature } from "topojson-client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const world = require("world-atlas/land-110m.json");
const land = feature(world, world.objects.land);

/** Deterministic noise, so every regeneration produces the same sky. */
export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Real coordinates, so the network arcs land where land is. */
const HUBS = [
  [-74.0, 40.7], [-118.2, 34.1], [-99.1, 19.4], [-46.6, -23.6],
  [-79.4, 43.7], [-58.4, -34.6], [-87.6, 41.9], [-70.7, -33.4],
  [-95.4, 29.8], [-122.4, 37.8], [-75.2, 6.2], [-43.2, -22.9],
];

export function earthScene({ width, height, cx, cy, radius, seed = 20260905, rotate = [95, -10, 0], transparent = false }) {
  const projection = geoOrthographic()
    .scale(radius)
    .translate([cx, cy])
    .rotate(rotate)
    .clipAngle(90);
  const path = geoPath(projection);
  const random = mulberry32(seed);

  const dots = [];
  for (let lat = -84; lat <= 84; lat += 1.6) {
    const step = 1.6 / Math.max(0.22, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon <= 180; lon += step) {
      if (!geoContains(land, [lon, lat])) continue;
      const point = projection([lon, lat]);
      if (!point) continue;
      const [x, y] = point;
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 0.995) continue;
      // Toward the limb the sphere turns away; the field thins out with it.
      const facing = Math.sqrt(Math.max(0, 1 - d * d));
      if (random() > 0.22 + facing * 0.78) continue;
      dots.push({ x, y, r: 0.7 + facing * 1.35, o: 0.16 + facing * 0.66 });
    }
  }

  const arcs = [];
  for (let i = 0; i < HUBS.length; i += 1) {
    for (let j = i + 1; j < HUBS.length; j += 1) {
      const a = HUBS[i];
      const b = HUBS[j];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 46 || random() > 0.55) continue;
      const d = path({ type: "LineString", coordinates: [a, b] });
      if (d) arcs.push(d);
    }
  }

  const hubPoints = HUBS.map((c) => projection(c)).filter(
    (p) => p && Math.hypot(p[0] - cx, p[1] - cy) < radius * 0.98,
  );

  /* Meridians and parallels, very faint — they give the disc its curvature. */
  const wires = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const d = path({ type: "LineString", coordinates: Array.from({ length: 61 }, (_, i) => [lon, -90 + i * 3]) });
    if (d) wires.push(d);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const d = path({ type: "LineString", coordinates: Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]) });
    if (d) wires.push(d);
  }

  const stars = Array.from({ length: 320 }, () => {
    const x = random() * width;
    const y = random() * height;
    return Math.hypot(x - cx, y - cy) < radius * 1.05
      ? null
      : { x, y, r: random() * 1.15 + 0.2, o: random() * 0.6 + 0.06 };
  }).filter(Boolean);

  /* A fine mesh over the whole sphere. The reference reads as a networked
     planet, not a dotted map, and the net is what carries that. */
  const mesh = [];
  const meshPts = [];
  for (let lat = -70; lat <= 70; lat += 10) {
    for (let lon = -180; lon < 180; lon += 10) {
      const jitter = (random() - 0.5) * 5;
      const p = projection([lon + jitter, lat + jitter]);
      if (!p) continue;
      const d = Math.hypot(p[0] - cx, p[1] - cy) / radius;
      if (d > 0.97) continue;
      meshPts.push({ x: p[0], y: p[1], f: Math.sqrt(Math.max(0, 1 - d * d)), lon: lon + jitter, lat: lat + jitter });
    }
  }
  for (let i = 0; i < meshPts.length; i += 1) {
    for (let j = i + 1; j < meshPts.length; j += 1) {
      const a = meshPts[i];
      const b = meshPts[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > radius * 0.13) continue;
      if (random() > 0.34) continue;
      const d = path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
      if (d) mesh.push({ d, o: 0.05 + Math.min(a.f, b.f) * 0.16 });
    }
  }

  const outline = path(land);
  const blur = Math.max(2, radius * 0.03);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="space" cx="${((cx / width) * 100).toFixed(1)}%" cy="${((cy / height) * 100).toFixed(1)}%" r="80%">
      <stop offset="0%" stop-color="#0b1436"/>
      <stop offset="46%" stop-color="#05081a"/>
      <stop offset="100%" stop-color="#01030a"/>
    </radialGradient>
    <radialGradient id="ocean" cx="34%" cy="26%" r="78%">
      <stop offset="0%" stop-color="#0d2f6d" stop-opacity="0.95"/>
      <stop offset="42%" stop-color="#071634" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#020715" stop-opacity="0.99"/>
    </radialGradient>
    <radialGradient id="limb" cx="50%" cy="50%" r="50%">
      <stop offset="87%" stop-color="#4d84ff" stop-opacity="0"/>
      <stop offset="96.5%" stop-color="#7db4ff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#9a6bff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="crescent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="38%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="72%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
    <mask id="lit">
      <rect width="${width}" height="${height}" fill="url(#crescent)"/>
    </mask>
    <radialGradient id="halo" cx="46%" cy="42%" r="52%">
      <stop offset="50%" stop-color="#3d7bff" stop-opacity="0.30"/>
      <stop offset="72%" stop-color="#5a5cff" stop-opacity="0.13"/>
      <stop offset="88%" stop-color="#8f5cff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#8f5cff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${blur.toFixed(1)}"/>
    </filter>
    <filter id="tight" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
    ${transparent ? edgeFade("earth", { hold: 0.82 }) : ""}
  </defs>
  ${transparent ? '<g mask="url(#earth-edge)">' : ""}

  ${transparent ? "" : `<rect width="${width}" height="${height}" fill="url(#space)"/>`}
  <g>${stars.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="#cfe0ff" opacity="${s.o.toFixed(2)}"/>`).join("")}</g>

  <circle cx="${cx}" cy="${cy}" r="${(radius * 1.45).toFixed(0)}" fill="url(#halo)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#ocean)"/>

  <g opacity="0.22" stroke="#5b8dff" fill="none" stroke-width="${Math.max(0.5, radius * 0.0016).toFixed(2)}">
    ${wires.map((d) => `<path d="${d}"/>`).join("")}
  </g>

  <g fill="none" stroke="#6f9dff" stroke-width="${Math.max(0.4, radius * 0.0013).toFixed(2)}">
    ${mesh.map((m) => `<path d="${m.d}" opacity="${m.o.toFixed(3)}"/>`).join("")}
  </g>
  <g>
    ${meshPts.map((m) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${(radius * 0.0022 + m.f * radius * 0.0016).toFixed(2)}" fill="#a9c8ff" opacity="${(0.10 + m.f * 0.30).toFixed(2)}"/>`).join("")}
  </g>

  <g opacity="0.34" fill="none" stroke="#9dc6ff" stroke-width="${Math.max(0.6, radius * 0.0022).toFixed(2)}">
    <path d="${outline}"/>
  </g>

  <g filter="url(#tight)">
    ${dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(2)}" fill="#ffc987" opacity="${(d.o * 0.5).toFixed(2)}"/>`).join("")}
  </g>
  <g>
    ${dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${(d.r * 0.6).toFixed(2)}" fill="#ffdfb4" opacity="${d.o.toFixed(2)}"/>`).join("")}
  </g>

  <g opacity="0.55" fill="none" stroke="#93c1ff" stroke-width="${Math.max(0.6, radius * 0.0020).toFixed(2)}">
    ${arcs.map((d) => `<path d="${d}"/>`).join("")}
  </g>
  <g>
    ${hubPoints.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(radius * 0.007).toFixed(2)}" fill="#e4eeff" opacity="0.92"/>`).join("")}
  </g>

  <g mask="url(#lit)">
    <circle cx="${cx}" cy="${cy}" r="${(radius * 1.02).toFixed(0)}" fill="url(#limb)" filter="url(#soft)"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#a8ceff" stroke-opacity="0.85" stroke-width="${Math.max(1.2, radius * 0.005).toFixed(2)}"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#3f6cc4" stroke-opacity="0.28" stroke-width="${Math.max(0.8, radius * 0.002).toFixed(2)}"/>
  ${transparent ? "</g>" : ""}
</svg>`;
}
