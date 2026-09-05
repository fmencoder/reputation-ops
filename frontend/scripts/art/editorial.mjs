/**
 * The five article artworks.
 *
 * Editorial brand imagery, not diagrams. Each one is a luminous field whose
 * structure is drawn from its article — a decaying cascade, an aperture, a
 * divided field, an ascent, a broken ring — but none of them is labelled and
 * none of them asks to be read. They share a palette, a light, a node grammar
 * and a sense of depth, so a row of them looks like one publication.
 */
import { IMAGE, mulberry32, backdrop, glowDefs, makeCamera } from "./common.mjs";

const shell = (width, height, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${defs}</defs>
  ${body}
</svg>`;

/** A drifting field of motes, used by every scene to hold the space together. */
function motes(width, height, random, count, spread = 1) {
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    r: (0.5 + random() * 2.1) * spread,
    o: 0.08 + random() * 0.42,
  }));
}

const layer = (items) => `<g>${items.map((m) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.r.toFixed(2)}" fill="#dbe9ff" opacity="${m.o.toFixed(2)}"/>`).join("")}</g>`;

/* 1. Reliability — a cascade whose light fails as it descends. */
function cascade({ width, height, random }) {
  const back = backdrop({ width, height, lightX: 0.24, lightY: 0.22, random, stars: 120 });
  const steps = 15;
  const pts = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return {
      x: width * (0.06 + t * 0.9),
      y: height * (0.16 + Math.pow(t, 1.6) * 0.68),
      life: Math.pow(1 - t, 1.15),
    };
  });
  /* A constellation behind the cascade, densest where the light still is. The
     first version left the far half of the frame empty, and the artwork read as
     a chart with nothing around it. */
  const field = Array.from({ length: 120 }, () => {
    const x = random() * width;
    const y = random() * height;
    const near = pts.reduce((best, p) => Math.min(best, Math.hypot(p.x - x, p.y - y)), Infinity);
    const w = Math.max(0, 1 - near / (height * 0.7));
    return { x, y, r: 0.7 + w * 2.6, o: 0.06 + w * 0.4 };
  });
  const web = [];
  for (let i = 0; i < field.length; i += 1) {
    for (let j = i + 1; j < field.length; j += 1) {
      const d = Math.hypot(field[i].x - field[j].x, field[i].y - field[j].y);
      if (d > height * 0.16 || random() > 0.14) continue;
      web.push(`<line x1="${field[i].x.toFixed(1)}" y1="${field[i].y.toFixed(1)}" x2="${field[j].x.toFixed(1)}" y2="${field[j].y.toFixed(1)}" stroke-opacity="${(0.04 + random() * 0.12).toFixed(2)}"/>`);
    }
  }
  const links = pts.slice(1).map((p, i) => {
    const q = pts[i];
    return `<path d="M${q.x.toFixed(1)} ${q.y.toFixed(1)} C ${((q.x + p.x) / 2).toFixed(1)} ${q.y.toFixed(1)}, ${((q.x + p.x) / 2).toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}" stroke-opacity="${(0.18 + p.life * 0.7).toFixed(2)}"/>`;
  });
  return shell(width, height, back.defs + glowDefs(1), `
  ${back.body}
  <g stroke="${IMAGE.bluePale}" stroke-width="1">${web.join("")}</g>
  ${layer(field)}
  <g fill="none" stroke="${IMAGE.blueLit}" stroke-width="2" filter="url(#bloomS)">${links.join("")}</g>
  ${pts.map((p) => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(46 * p.life + 8).toFixed(1)}" fill="${IMAGE.blue}" opacity="${(p.life * 0.20).toFixed(2)}" filter="url(#bloomM)"/>
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(3 + p.life * 6).toFixed(1)}" fill="${p.life > 0.55 ? "#ffffff" : IMAGE.violetLit}" opacity="${(0.25 + p.life * 0.72).toFixed(2)}"/>`).join("")}
  `);
}

/* 2. Context engineering — streams converging into a bright aperture. */
function aperture({ width, height, random }) {
  const back = backdrop({ width, height, lightX: 0.62, lightY: 0.5, random, stars: 120 });
  const fx = width * 0.64;
  const fy = height * 0.5;
  const streams = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25;
    const y0 = height * (0.06 + t * 0.88);
    const bend = (random() - 0.5) * height * 0.18;
    return `<path d="M${(-width * 0.05).toFixed(1)} ${y0.toFixed(1)} C ${(width * 0.3).toFixed(1)} ${(y0 + bend).toFixed(1)}, ${(width * 0.46).toFixed(1)} ${fy.toFixed(1)}, ${fx.toFixed(1)} ${fy.toFixed(1)}" stroke-opacity="${(0.08 + random() * 0.3).toFixed(2)}"/>`;
  });
  const rings = [1, 2, 3].map((i) => `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(i * height * 0.11).toFixed(1)}" fill="none" stroke="${IMAGE.blue}" stroke-opacity="${(0.24 - i * 0.05).toFixed(2)}" stroke-width="1.2"/>`);
  return shell(width, height, back.defs + glowDefs(1), `
  ${back.body}
  ${layer(motes(width, height, random, 100))}
  <g fill="none" stroke="${IMAGE.bluePale}" stroke-width="1.4">${streams.join("")}</g>
  ${rings.join("")}
  <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(height * 0.2).toFixed(1)}" fill="${IMAGE.blue}" opacity="0.2" filter="url(#bloomL)"/>
  <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(height * 0.055).toFixed(1)}" fill="#ffffff" opacity="0.92" filter="url(#bloomM)"/>
  <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(height * 0.02).toFixed(1)}" fill="#ffffff"/>
  `);
}

/* 3. Deterministic boundaries — a diffuse field meeting a crystalline one. */
function divide({ width, height, random }) {
  const back = backdrop({ width, height, lightX: 0.5, lightY: 0.46, random, stars: 110 });
  const bx = width * 0.5;
  const cloud = Array.from({ length: 150 }, () => {
    const x = random() * bx * 0.9;
    const y = height * (0.1 + random() * 0.8);
    return { x, y, r: 0.8 + random() * 3.2, o: 0.12 + random() * 0.5 };
  });
  const cloudLinks = [];
  for (let i = 0; i < cloud.length; i += 1) {
    for (let j = i + 1; j < cloud.length; j += 1) {
      const d = Math.hypot(cloud[i].x - cloud[j].x, cloud[i].y - cloud[j].y);
      if (d > height * 0.09 || random() > 0.09) continue;
      cloudLinks.push(`<line x1="${cloud[i].x.toFixed(1)}" y1="${cloud[i].y.toFixed(1)}" x2="${cloud[j].x.toFixed(1)}" y2="${cloud[j].y.toFixed(1)}" stroke-opacity="${(0.05 + random() * 0.14).toFixed(2)}"/>`);
    }
  }
  const cam = makeCamera({ width, height, focal: 900, cx: width * 0.78, cy: height * 0.5 });
  const lattice = [];
  const latticePts = [];
  for (let gx = 0; gx < 5; gx += 1) {
    for (let gy = 0; gy < 4; gy += 1) {
      for (let gz = 0; gz < 4; gz += 1) {
        const p = cam([(gx - 2) * 120, (gy - 1.5) * 120, gz * 190]);
        latticePts.push({ x: p[0], y: p[1], k: p[2], gx, gy, gz });
      }
    }
  }
  for (const a of latticePts) {
    for (const b of latticePts) {
      const adj = Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) + Math.abs(a.gz - b.gz);
      if (adj !== 1 || a.gx > b.gx || a.gy > b.gy || a.gz > b.gz) continue;
      lattice.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke-opacity="${(0.10 + Math.min(a.k, b.k) * 0.42).toFixed(2)}"/>`);
    }
  }
  return shell(width, height, back.defs + glowDefs(1) + `
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${IMAGE.blue}" stop-opacity="0"/>
      <stop offset="26%" stop-color="#bcd8ff" stop-opacity="0.95"/>
      <stop offset="74%" stop-color="#bcd8ff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${IMAGE.violet}" stop-opacity="0"/>
    </linearGradient>`, `
  ${back.body}
  <g stroke="${IMAGE.violetLit}" stroke-width="1">${cloudLinks.join("")}</g>
  <g>${cloud.map((c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(2)}" fill="${IMAGE.violetLit}" opacity="${c.o.toFixed(2)}"/>`).join("")}</g>
  <g stroke="${IMAGE.blueLit}" stroke-width="1.3">${lattice.join("")}</g>
  <g>${latticePts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1 + p.k * 3).toFixed(2)}" fill="#ffffff" opacity="${(0.2 + p.k * 0.6).toFixed(2)}"/>`).join("")}</g>
  <rect x="${(bx - 22).toFixed(1)}" y="0" width="44" height="${height}" fill="url(#wall)" opacity="0.5" filter="url(#bloomM)"/>
  <rect x="${(bx - 2).toFixed(1)}" y="0" width="4" height="${height}" fill="url(#wall)"/>
  `);
}

/* 4. Human oversight — an ascent to a single bright authority. */
function ascent({ width, height, random }) {
  const back = backdrop({ width, height, lightX: 0.5, lightY: 0.16, random, stars: 130 });
  const tiers = [0.82, 0.6, 0.38, 0.18];
  const groups = tiers.map((ty, i) => {
    const count = [16, 9, 4, 1][i];
    return Array.from({ length: count }, (_, k) => ({
      x: width * (0.5 + ((k - (count - 1) / 2) / Math.max(1, count)) * (0.86 - i * 0.15)),
      y: height * ty + (random() - 0.5) * height * 0.03,
      w: i / 3,
    }));
  });
  const links = [];
  for (let i = 0; i < groups.length - 1; i += 1) {
    for (const a of groups[i]) {
      const b = groups[i + 1][Math.floor(random() * groups[i + 1].length)];
      links.push(`<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${a.x.toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}, ${b.x.toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke-opacity="${(0.1 + i * 0.16).toFixed(2)}"/>`);
    }
  }
  const apex = groups[3][0];
  return shell(width, height, back.defs + glowDefs(1), `
  ${back.body}
  ${layer(motes(width, height, random, 90))}
  ${tiers.map((ty) => `<line x1="${(width * 0.04).toFixed(1)}" y1="${(height * ty).toFixed(1)}" x2="${(width * 0.96).toFixed(1)}" y2="${(height * ty).toFixed(1)}" stroke="${IMAGE.blue}" stroke-opacity="0.10" stroke-width="1"/>`).join("")}
  <g fill="none" stroke="${IMAGE.bluePale}" stroke-width="1.3">${links.join("")}</g>
  ${groups.flat().map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(1.6 + n.w * 4).toFixed(2)}" fill="${n.w > 0.6 ? "#ffffff" : IMAGE.bluePale}" opacity="${(0.28 + n.w * 0.66).toFixed(2)}"/>`).join("")}
  <circle cx="${apex.x.toFixed(1)}" cy="${apex.y.toFixed(1)}" r="${(height * 0.16).toFixed(1)}" fill="${IMAGE.blue}" opacity="0.24" filter="url(#bloomL)"/>
  <circle cx="${apex.x.toFixed(1)}" cy="${apex.y.toFixed(1)}" r="${(height * 0.032).toFixed(1)}" fill="#ffffff" filter="url(#bloomM)" opacity="0.95"/>
  `);
}

/* 5. Recoverability — a ring of light, broken, and returning. */
function ring({ width, height, random }) {
  const back = backdrop({ width, height, lightX: 0.5, lightY: 0.5, random, stars: 120 });
  const cx = width * 0.5;
  const cy = height * 0.52;
  const r = Math.min(width, height) * 0.33;
  const marks = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
    const broken = i > 17 && i < 21;
    return {
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r * 0.92,
      broken,
      anchor: i === 17,
    };
  });
  const arcPath = (from, to, lift) => {
    const a = marks[from];
    const b = marks[to];
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${(cy + lift).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  return shell(width, height, back.defs + glowDefs(1), `
  ${back.body}
  ${layer(motes(width, height, random, 100))}
  <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r * 1.25).toFixed(1)}" ry="${(r * 1.1).toFixed(1)}" fill="${IMAGE.blue}" opacity="0.055" filter="url(#bloomL)"/>
  ${[0.62, 0.81, 1.18].map((k) => `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r * k).toFixed(1)}" ry="${(r * k * 0.92).toFixed(1)}" fill="none" stroke="${IMAGE.blue}" stroke-opacity="0.16" stroke-width="1"/>`).join("")}
  <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.92).toFixed(1)}" fill="none" stroke="${IMAGE.blueLit}" stroke-opacity="0.6" stroke-width="2.4"/>
  <path d="${arcPath(21, 17, -r * 0.9)}" fill="none" stroke="${IMAGE.violetLit}" stroke-opacity="0.6" stroke-width="1.8" stroke-dasharray="7 7"/>
  <path d="${arcPath(17, 24, r * 1.05)}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.2" filter="url(#bloomS)"/>
  ${marks.map((m) => m.broken
      ? `<g stroke="${IMAGE.violetLit}" stroke-width="3.4" stroke-opacity="0.95"><line x1="${(m.x - 13).toFixed(1)}" y1="${(m.y - 13).toFixed(1)}" x2="${(m.x + 13).toFixed(1)}" y2="${(m.y + 13).toFixed(1)}"/><line x1="${(m.x + 13).toFixed(1)}" y1="${(m.y - 13).toFixed(1)}" x2="${(m.x - 13).toFixed(1)}" y2="${(m.y + 13).toFixed(1)}"/></g>`
      : `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.anchor ? 11 : 4.2}" fill="#ffffff" opacity="${m.anchor ? 1 : 0.72}"${m.anchor ? ' filter="url(#bloomM)"' : ""}/>`).join("")}
  `);
}

const SCENES = {
  "agentic-ai-reliability-budget": cascade,
  "context-engineering-production-ai": aperture,
  "deterministic-boundaries-ai-smart-contracts": divide,
  "human-oversight-architecture": ascent,
  "recoverability-architecture": ring,
};

export const ARTICLE_SLUGS = Object.keys(SCENES);

export function editorialScene(slug, { width, height, seed }) {
  const draw = SCENES[slug];
  if (!draw) throw new Error(`no editorial artwork for ${slug}`);
  return draw({ width, height, random: mulberry32(seed ?? 1000 + slug.length * 97) });
}
