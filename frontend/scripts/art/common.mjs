/**
 * Shared vocabulary for the NOVRA image brand.
 *
 * Every scene draws from these colours, this light and this projection, which
 * is what makes a globe, a cube field, a world map and five article artworks
 * look like one publication rather than a folder of pictures.
 */
export const IMAGE = {
  space0: "#0b1436",
  space1: "#05081a",
  space2: "#01030a",
  blue: "#4d84ff",
  blueLit: "#7db4ff",
  bluePale: "#a9c8ff",
  violet: "#7b4dff",
  violetLit: "#9a6bff",
  warm: "#ffdfb4",
  white: "#e4eeff",
};

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The common ground: deep space, a soft field light, and scattered stars. */
export function backdrop({ width, height, lightX = 0.5, lightY = 0.4, random, stars = 240, tint = IMAGE.blue, transparent = false }) {
  const points = Array.from({ length: stars }, () => ({
    x: random() * width,
    y: random() * height,
    r: random() * 1.15 + 0.2,
    o: random() * 0.5 + 0.05,
  }));
  return {
    defs: `
    <radialGradient id="bg" cx="${(lightX * 100).toFixed(1)}%" cy="${(lightY * 100).toFixed(1)}%" r="78%">
      <stop offset="0%" stop-color="${IMAGE.space0}"/>
      <stop offset="48%" stop-color="${IMAGE.space1}"/>
      <stop offset="100%" stop-color="${IMAGE.space2}"/>
    </radialGradient>
    <radialGradient id="field" cx="${(lightX * 100).toFixed(1)}%" cy="${(lightY * 100).toFixed(1)}%" r="58%">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="${tint}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${IMAGE.violet}" stop-opacity="0"/>
    </radialGradient>`,
    body: `
  ${transparent ? "" : `<rect width="${width}" height="${height}" fill="url(#bg)"/>`}
  <g>${points.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="#cfe0ff" opacity="${s.o.toFixed(2)}"/>`).join("")}</g>
  <rect width="${width}" height="${height}" fill="url(#field)"/>`,
  };
}

/** Bloom filters at three strengths. Light is the whole language here. */
export function glowDefs(scale = 1) {
  return `
    <filter id="bloomS" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="${(2.2 * scale).toFixed(2)}"/></filter>
    <filter id="bloomM" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="${(7 * scale).toFixed(2)}"/></filter>
    <filter id="bloomL" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="${(22 * scale).toFixed(2)}"/></filter>`;
}

/** One-point perspective. Enough for a cube field with real depth. */
export function makeCamera({ width, height, focal = 900, cx, cy }) {
  const ox = cx ?? width / 2;
  const oy = cy ?? height / 2;
  return ([x, y, z]) => {
    const k = focal / (focal + z);
    return [ox + x * k, oy + y * k, k];
  };
}

export const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export function cubeVertices([x, y, z], s, yaw = 0.6, pitch = 0.42) {
  const h = s / 2;
  const raw = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ];
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return raw.map(([vx, vy, vz]) => {
    const rx = vx * cy - vz * sy;
    const rz = vx * sy + vz * cy;
    const ry = vy * cp - rz * sp;
    const rz2 = vy * sp + rz * cp;
    return [x + rx, y + ry, z + rz2];
  });
}

/**
 * The edge treatment.
 *
 * Every scene is composited onto the page, and several are meant to run past
 * their frame. Without this they end on a straight cut — a visible rectangle of
 * slightly different darkness, which is exactly the "image dropped into a box"
 * look the reference does not have.
 */
export function edgeFade(id, { hold = 0.74 } = {}) {
  return `
    <radialGradient id="${id}-fade" cx="50%" cy="50%" r="76%">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="${(hold * 100).toFixed(0)}%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <mask id="${id}-edge">
      <rect width="100%" height="100%" fill="url(#${id}-fade)"/>
    </mask>`;
}
