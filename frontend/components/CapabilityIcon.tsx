/**
 * Capability marks, drawn inline.
 *
 * The four original domains ship as raster icons because WordPress rejected SVG
 * uploads and a raster was the only thing that survived. Nothing on this
 * frontend has that constraint, so the capability areas added for the
 * institutional pages are vector: they inherit the palette from the gradient
 * below rather than baking a blue into a file, they stay sharp at any density,
 * and a new capability area costs a path rather than an asset pipeline run.
 *
 * Each glyph states its subject geometrically. None of them is a robot head, a
 * glowing brain or a lightbulb.
 */
import styles from "./CapabilityIcon.module.css";

const GLYPHS: Record<string, React.ReactNode> = {
  /* Agentic: a planner node delegating to three subordinate steps. */
  agentic: (
    <>
      <circle cx="24" cy="10" r="4.5" />
      <circle cx="10" cy="38" r="4" />
      <circle cx="24" cy="38" r="4" />
      <circle cx="38" cy="38" r="4" />
      <path d="M24 14.5v9M24 23.5h-14v10.5M24 23.5v10.5M24 23.5h14v10.5" />
    </>
  ),
  /* Data: stacked strata with a reading taken through them. */
  data: (
    <>
      <ellipse cx="24" cy="13" rx="14" ry="5" />
      <path d="M10 13v10c0 2.8 6.3 5 14 5s14-2.2 14-5V13" />
      <path d="M10 23v10c0 2.8 6.3 5 14 5s14-2.2 14-5V23" />
      <path d="M24 28v10" strokeDasharray="3 4" />
    </>
  ),
  /* Transformation: a stepped path lifting from one plane to another. */
  transformation: (
    <>
      <path d="M8 38h9V28h10V18h13" />
      <path d="M34 12l6 6-6 6" />
      <path d="M8 38V26" strokeDasharray="3 4" />
    </>
  ),
  /* Governance: a boundary with an inspection point on the threshold. */
  governance: (
    <>
      <path d="M24 7l14 6v10c0 9-6 15.5-14 18-8-2.5-14-9-14-18V13z" />
      <path d="M17.5 23.5l4.5 4.5 9-9" />
    </>
  ),
  /* Decision: a branch resolved to one committed outcome. */
  decision: (
    <>
      <path d="M24 8v10" />
      <circle cx="24" cy="22" r="4.5" />
      <path d="M24 26.5v3.5H11v8M24 30h13v8" />
      <rect x="6" y="34" width="10" height="8" rx="2" />
      <rect x="32" y="34" width="10" height="8" rx="2" />
    </>
  ),
  /* Government: an institutional colonnade. */
  government: (
    <>
      <path d="M8 18L24 9l16 9" />
      <path d="M12 18v16M20 18v16M28 18v16M36 18v16" />
      <path d="M7 38h34" />
    </>
  ),
  /* Infrastructure: a distribution network with one instrumented span. */
  infrastructure: (
    <>
      <circle cx="10" cy="14" r="3.5" />
      <circle cx="38" cy="14" r="3.5" />
      <circle cx="24" cy="34" r="3.5" />
      <path d="M13 15.5l8 15.5M35 15.5l-8 15.5M13.5 14h21" />
      <path d="M24 30.5V20" strokeDasharray="3 4" />
    </>
  ),
  /* Climate: an exposure curve rising over a measured baseline. */
  climate: (
    <>
      <path d="M7 34c6 0 8-12 14-12s8 8 12 8 5-6 8-6" />
      <path d="M7 40h34" />
      <path d="M12 40v-4M22 40v-9M32 40v-6" />
    </>
  ),
  /* Inclusion: a perimeter opened to admit an excluded point. */
  inclusion: (
    <>
      <path d="M31 11a14 14 0 1 0 0 26" />
      <circle cx="24" cy="24" r="4" />
      <path d="M36 24h8M40 20l4 4-4 4" />
    </>
  ),
};

export function CapabilityIcon({ glyph }: { glyph: string }) {
  return (
    <span className={styles.frame} aria-hidden="true">
      <svg viewBox="0 0 48 48" className={styles.glyph} role="presentation" focusable="false">
        {GLYPHS[glyph] ?? GLYPHS.agentic}
      </svg>
    </span>
  );
}
