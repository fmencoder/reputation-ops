/**
 * The About environment: an orbital field.
 *
 * Concentric radar geometry, a network constellation drifting across it, and a
 * great deal of empty space — the reference panel is mostly negative space, and
 * that restraint is the point. The portrait sits inside this, not on top of a
 * dark rectangle.
 */
import { IMAGE, mulberry32, backdrop, glowDefs, edgeFade } from "./common.mjs";

export function orbitalScene({ width, height, seed = 7731, cx = 0.62, cy = 0.5, transparent = false }) {
  const random = mulberry32(seed);
  const ox = width * cx;
  const oy = height * cy;
  const back = backdrop({ width, height, lightX: cx, lightY: cy, random, stars: 190, tint: IMAGE.blue, transparent });
  const unit = Math.min(width, height);

  const rings = [0.16, 0.25, 0.35, 0.47, 0.61, 0.77, 0.94].map((r, i) => ({
    r: unit * r,
    o: 0.55 - i * 0.055,
    dash: i % 2 === 1 ? `${(unit * 0.012).toFixed(1)} ${(unit * 0.018).toFixed(1)}` : null,
  }));

  const nodes = Array.from({ length: 96 }, () => {
    const a = random() * Math.PI * 2;
    const r = unit * (0.12 + random() * 0.8);
    return { x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r * 0.82, w: random() };
  }).filter((n) => n.x > -unit * 0.1 && n.x < width + unit * 0.1);

  const links = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > unit * 0.22 || random() > 0.5) continue;
      links.push({ a, b, o: 0.10 + (1 - d / (unit * 0.22)) * 0.34 });
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${back.defs}${glowDefs(1)}
    <radialGradient id="orbCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${IMAGE.blueLit}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="${IMAGE.violet}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${IMAGE.violet}" stop-opacity="0"/>
    </radialGradient>
    ${transparent ? edgeFade("orb", { hold: 0.56 }) : ""}
  </defs>
  ${transparent ? '<g mask="url(#orb-edge)">' : ""}
  ${back.body}
  <ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${(unit * 0.62).toFixed(0)}" ry="${(unit * 0.52).toFixed(0)}" fill="url(#orbCore)"/>
  <g fill="none" stroke="${IMAGE.blue}">
    ${rings.map((r) => `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${r.r.toFixed(1)}" ry="${(r.r * 0.82).toFixed(1)}" stroke-opacity="${r.o.toFixed(3)}" stroke-width="1.5"${r.dash ? ` stroke-dasharray="${r.dash}"` : ""}/>`).join("")}
  </g>
  <g fill="none" stroke="${IMAGE.violetLit}" stroke-opacity="0.34" stroke-width="1.4">
    <ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${(unit * 0.5).toFixed(1)}" ry="${(unit * 0.5).toFixed(1)}" transform="rotate(-24 ${ox.toFixed(1)} ${oy.toFixed(1)})"/>
    <ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${(unit * 0.66).toFixed(1)}" ry="${(unit * 0.34).toFixed(1)}" transform="rotate(18 ${ox.toFixed(1)} ${oy.toFixed(1)})"/>
  </g>
  <g stroke="${IMAGE.bluePale}" stroke-width="0.9" fill="none">
    ${links.map((l) => `<line x1="${l.a.x.toFixed(1)}" y1="${l.a.y.toFixed(1)}" x2="${l.b.x.toFixed(1)}" y2="${l.b.y.toFixed(1)}" stroke-opacity="${l.o.toFixed(3)}"/>`).join("")}
  </g>
  <g>
    ${nodes.map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(1.5 + n.w * 3.4).toFixed(2)}" fill="${n.w > 0.86 ? "#ffffff" : n.w > 0.6 ? IMAGE.violetLit : IMAGE.bluePale}" opacity="${(0.42 + n.w * 0.55).toFixed(2)}"/>`).join("")}
  </g>
  ${transparent ? "</g>" : ""}
</svg>`;
}
