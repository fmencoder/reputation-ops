/**
 * The NOVRA graphic system.
 *
 * Every drawing on the site is built from these constants, which is what makes
 * five different article diagrams read as one publication rather than five
 * illustrations. The rules are deliberately few and load-bearing:
 *
 *   Colour carries meaning, not decoration. Electric blue is the attested,
 *   deterministic, load-bearing path. Violet is the probabilistic or untrusted
 *   one, and is always dashed where it is also a path. Nothing else is
 *   coloured.
 *
 *   Weight carries hierarchy. Hairlines rule the field, thin lines carry
 *   ordinary relations, and only the governed path is drawn heavy.
 *
 *   Light is scarce. One halo per composition, at the point the drawing is
 *   about. A second glow means the drawing has two subjects and neither reads.
 *
 * None of this survived on WordPress: gradients, filters, masks and dashed
 * strokes all live in markup the flattener could not carry, which is why the
 * old pages could only ever be dark rectangles with blue headings.
 */

export const INK = {
  /** Attested, deterministic, governed. */
  primary: "#4d84ff",
  primaryDeep: "#2f6bff",
  /** Probabilistic, untrusted, advisory. */
  accent: "#7b4dff",
  /** Panel fill — a node sits on the page, it is not a hole in it. */
  panel: "#0a0e1c",
  panelLit: "#0d1226",
  void: "#05070f",
  edge: "#1b2340",
  edgeLit: "#2a3560",
  text: "#c8d2ea",
  textBright: "#ffffff",
  textMuted: "#6b779c",
  textDim: "#8fa4d4",
} as const;

export const STROKE = {
  /** The ruled field. Present, never read. */
  field: 0.5,
  /** Ordinary relations between parts. */
  relation: 1,
  /** A path something travels along. */
  path: 1.25,
  /** The governed path. Exactly one per drawing. */
  governed: 1.75,
} as const;

/** Untrusted and probabilistic paths are always dashed, at one rhythm. */
export const DASH = { untrusted: "5 5", boundary: "6 6", soft: "3 6" } as const;

/**
 * The gradients and filters every scene draws from.
 *
 * Ids are namespaced per scene because two instances of the same component can
 * appear on one page — the Technology page renders a scene beside a stack — and
 * duplicate SVG ids resolve to whichever came first.
 */
export function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-flow`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={INK.primaryDeep} />
        <stop offset="55%" stopColor={INK.primary} />
        <stop offset="100%" stopColor={INK.accent} />
      </linearGradient>
      <linearGradient id={`${id}-rise`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={INK.primaryDeep} />
        <stop offset="100%" stopColor={INK.accent} />
      </linearGradient>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={INK.primary} stopOpacity="0.55" />
        <stop offset="100%" stopColor={INK.accent} stopOpacity="0.12" />
      </linearGradient>
      <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={INK.primary} stopOpacity="0.42" />
        <stop offset="60%" stopColor={INK.primary} stopOpacity="0.1" />
        <stop offset="100%" stopColor={INK.primary} stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-bloom`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <pattern id={`${id}-mesh`} width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M28 0H0v28" fill="none" stroke={INK.primary} strokeOpacity="0.09" strokeWidth={STROKE.field} />
      </pattern>
    </defs>
  );
}

/** The node grammar: a filled plate, a lit ring, and nothing else. */
export function Node({
  x,
  y,
  r = 5,
  tone = "primary",
  lit = false,
}: {
  x: number;
  y: number;
  r?: number;
  tone?: "primary" | "accent";
  lit?: boolean;
}) {
  const colour = tone === "accent" ? INK.accent : INK.primary;
  return (
    <>
      {lit ? <circle cx={x} cy={y} r={r * 2.6} fill={colour} opacity="0.16" /> : null}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={lit ? colour : INK.panel}
        stroke={colour}
        strokeOpacity={lit ? 1 : 0.75}
        strokeWidth={STROKE.relation}
      />
    </>
  );
}
