/**
 * The Technology hero: a luminous cube field.
 *
 * A large transparent architectural cube lit from inside, a violet source
 * beneath it, smaller cubes distributed in depth, and a network floor running
 * back to a horizon. It is drawn in one-point perspective rather than
 * isometric, because the reference is cinematic and space, not a diagram.
 */
import { IMAGE, mulberry32, backdrop, glowDefs, makeCamera, cubeVertices, CUBE_EDGES, edgeFade } from "./common.mjs";

export function cubeScene({ width, height, seed = 4102, scale = 1, transparent = false }) {
  const random = mulberry32(seed);
  const cam = makeCamera({ width, height, focal: 1150, cx: width * 0.5, cy: height * 0.46 });
  const back = backdrop({ width, height, lightX: 0.5, lightY: 0.46, random, stars: 260, transparent });

  /* The hero cube sits at the origin; the rest are scattered around and behind
     it, smaller and dimmer with distance. */
  const cubes = [
    { p: [0, -10, 0], s: 260, lit: true },
    { p: [-430, -190, 340], s: 150, lit: false },
    { p: [420, -230, 300], s: 165, lit: false },
    { p: [-560, 120, 620], s: 120, lit: false },
    { p: [600, 80, 560], s: 132, lit: false },
    { p: [-250, -330, 780], s: 96, lit: false },
    { p: [300, -360, 860], s: 88, lit: false },
    { p: [-700, -60, 1050], s: 78, lit: false },
    { p: [760, -140, 1120], s: 74, lit: false },
  ];

  const drawCube = ({ p, s, lit }) => {
    const verts = cubeVertices(p, s).map(cam);
    const depth = 1 - Math.min(1, p[2] / 1400);
    const o = lit ? 1 : 0.28 + depth * 0.5;
    const w = (lit ? 2.6 : 1.3) * (verts[0][2] || 1);
    const edges = CUBE_EDGES.map(([a, b]) =>
      `<line x1="${verts[a][0].toFixed(1)}" y1="${verts[a][1].toFixed(1)}" x2="${verts[b][0].toFixed(1)}" y2="${verts[b][1].toFixed(1)}"/>`,
    ).join("");
    const centre = cam(p);
    const glowR = s * (centre[2] || 1) * (lit ? 0.95 : 0.55);
    return `
    <g>
      <circle cx="${centre[0].toFixed(1)}" cy="${centre[1].toFixed(1)}" r="${glowR.toFixed(1)}" fill="url(#core)" opacity="${(lit ? 0.95 : 0.34 * depth).toFixed(2)}"/>
      <g stroke="${lit ? IMAGE.bluePale : IMAGE.blue}" stroke-opacity="${o.toFixed(2)}" stroke-width="${w.toFixed(2)}" fill="none" filter="url(#bloomS)">${edges}</g>
      <g stroke="${lit ? "#ffffff" : IMAGE.blueLit}" stroke-opacity="${(o * 0.85).toFixed(2)}" stroke-width="${(w * 0.42).toFixed(2)}" fill="none">${edges}</g>
      ${verts.map((v) => `<circle cx="${v[0].toFixed(1)}" cy="${v[1].toFixed(1)}" r="${(w * 0.9).toFixed(2)}" fill="#ffffff" opacity="${(o * 0.8).toFixed(2)}"/>`).join("")}
    </g>`;
  };

  /* The floor: a receding grid of nodes with short links, which is what gives
     the cubes something to stand in. */
  const floorNodes = [];
  for (let z = 120; z < 2200; z += 150) {
    for (let x = -1500; x <= 1500; x += 165) {
      const jx = x + (random() - 0.5) * 70;
      const jz = z + (random() - 0.5) * 60;
      const p = cam([jx, 320, jz]);
      if (p[0] < -60 || p[0] > width + 60) continue;
      floorNodes.push({ x: p[0], y: p[1], k: p[2] });
    }
  }
  const floorLinks = [];
  for (let i = 0; i < floorNodes.length; i += 1) {
    for (let j = i + 1; j < floorNodes.length; j += 1) {
      const a = floorNodes[i];
      const b = floorNodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 130 || random() > 0.3) continue;
      floorLinks.push({ a, b, o: 0.05 + Math.min(a.k, b.k) * 0.2 });
    }
  }

  const motes = Array.from({ length: 130 }, () => {
    const p = cam([(random() - 0.5) * 2400, (random() - 0.5) * 1100, random() * 1600]);
    return { x: p[0], y: p[1], r: 0.6 + p[2] * 2.4, o: 0.12 + p[2] * 0.55 };
  });

  const heroCentre = cam([0, -10, 0]);
  const violetSource = cam([0, 250, 60]);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${back.defs}
    ${glowDefs(scale)}
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a9d0ff" stop-opacity="0.55"/>
      <stop offset="40%" stop-color="${IMAGE.blue}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${IMAGE.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="violetSource" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c4a2ff" stop-opacity="0.85"/>
      <stop offset="34%" stop-color="${IMAGE.violet}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${IMAGE.violet}" stop-opacity="0"/>
    </radialGradient>
    ${transparent ? edgeFade("cubes", { hold: 0.6 }) : ""}
  </defs>

  ${transparent ? '<g mask="url(#cubes-edge)">' : ""}
  ${back.body}

  <g stroke="${IMAGE.blue}" fill="none" stroke-width="${(1.1 * scale).toFixed(2)}">
    ${floorLinks.map((l) => `<line x1="${l.a.x.toFixed(1)}" y1="${l.a.y.toFixed(1)}" x2="${l.b.x.toFixed(1)}" y2="${l.b.y.toFixed(1)}" stroke-opacity="${l.o.toFixed(3)}"/>`).join("")}
  </g>
  <g>
    ${floorNodes.map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(0.8 + n.k * 2.1).toFixed(2)}" fill="${IMAGE.bluePale}" opacity="${(0.10 + n.k * 0.45).toFixed(2)}"/>`).join("")}
  </g>

  <ellipse cx="${violetSource[0].toFixed(1)}" cy="${violetSource[1].toFixed(1)}" rx="${(420 * scale).toFixed(0)}" ry="${(190 * scale).toFixed(0)}" fill="url(#violetSource)" filter="url(#bloomL)"/>

  ${cubes.slice(1).sort((a, b) => b.p[2] - a.p[2]).map(drawCube).join("")}

  <circle cx="${heroCentre[0].toFixed(1)}" cy="${heroCentre[1].toFixed(1)}" r="${(340 * scale).toFixed(0)}" fill="url(#core)" filter="url(#bloomL)"/>
  ${drawCube(cubes[0])}
  <circle cx="${heroCentre[0].toFixed(1)}" cy="${heroCentre[1].toFixed(1)}" r="${(26 * scale).toFixed(0)}" fill="#ffffff" filter="url(#bloomM)" opacity="0.9"/>

  <g>
    ${motes.map((m) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.r.toFixed(2)}" fill="#dbe9ff" opacity="${m.o.toFixed(2)}"/>`).join("")}
  </g>
  ${transparent ? "</g>" : ""}
</svg>`;
}
