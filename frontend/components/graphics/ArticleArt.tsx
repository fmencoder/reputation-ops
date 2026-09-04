/**
 * The article-art system.
 *
 * Five diagrams, one family. Each article keeps its own conceptual
 * architecture — a budget being spent, a window being filled, a boundary being
 * crossed, a decision being escalated, a state being rewound — but they are
 * drawn in one grammar: the same canvas proportion, the same ruled mesh, the
 * same node (a dark plate inside a lit ring), the same hairline/relation/
 * governed weights, the same uppercase annotation, and the same rule that blue
 * is what is attested and violet, dashed, is what is not. One halo per drawing,
 * at the thing the article is about.
 *
 * This replaces the raster heroes carried over from WordPress. Those were
 * per-article pictures with nothing in common and nothing to say about the
 * argument beneath them; the migration was not worth doing to re-serve them
 * from a faster host.
 *
 * Every drawing is responsive by composition, not by scale: the phone variant
 * of each carries fewer elements at a larger size, because a five-step ladder
 * annotated at 9px is a grey smear on a 390px screen.
 */
import { INK, STROKE, DASH, SceneDefs, Node } from "./system";
import styles from "./ArticleArt.module.css";

type Slug =
  | "agentic-ai-reliability-budget"
  | "context-engineering-production-ai"
  | "deterministic-boundaries-ai-smart-contracts"
  | "human-oversight-architecture"
  | "recoverability-architecture";

interface Composition {
  /** What the drawing shows, for anyone who cannot see it. */
  alt: string;
  wide: (id: string) => React.ReactNode;
  narrow: (id: string) => React.ReactNode;
}

const W = { w: 720, h: 360 };
const N = { w: 344, h: 268 };

/* ------------------------------------------------------------------ */
/* 1. The reliability budget: what compounding does to a chain of steps */

const STEPS = 9;
const PER_STEP = 0.97;
const budget = (): { x: number; y: number }[] =>
  Array.from({ length: STEPS + 1 }, (_, i) => ({
    x: 78 + i * 62,
    y: 74 + (1 - Math.pow(PER_STEP, i)) * 560,
  }));

const reliabilityBudget: Composition = {
  alt: "A chain of nine agent steps, each individually reliable, drawn as a descending staircase. A horizontal budget line marks the tolerable failure rate; the staircase crosses it partway along, and the crossing is marked. Compounding, not any single step, is what exhausts the budget.",
  wide: (id) => {
    const points = budget();
    const threshold = 214;
    const crossing = points.find((point) => point.y > threshold) ?? points[points.length - 1];
    return (
      <>
        <circle cx={crossing.x} cy={threshold} r="118" fill={`url(#${id}-halo)`} />
        <line x1="60" y1={threshold} x2="690" y2={threshold} stroke={INK.accent} strokeOpacity="0.55" strokeWidth={STROKE.path} strokeDasharray={DASH.untrusted} />
        <text x="690" y={threshold - 10} textAnchor="end" className={styles.label} fill={INK.accent}>
          ERROR BUDGET
        </text>
        <path
          d={points.map((point, i) => (i === 0 ? `M${point.x} ${point.y}` : `L${point.x} ${points[i - 1].y} L${point.x} ${point.y}`)).join(" ")}
          fill="none"
          stroke={INK.primary}
          strokeWidth={STROKE.governed}
          strokeOpacity="0.9"
        />
        {points.map((point, i) => (
          <g key={i}>
            <Node x={point.x} y={point.y} r={4} lit={point.x === crossing.x} />
            {i > 0 ? (
              <text x={point.x} y={W.h - 22} textAnchor="middle" className={styles.tick} fill={INK.textMuted}>
                {i}
              </text>
            ) : null}
          </g>
        ))}
        <text x="60" y="52" className={styles.label} fill={INK.text}>
          EACH STEP {PER_STEP}
        </text>
        <text x={crossing.x + 12} y={threshold + 26} className={styles.label} fill={INK.textBright}>
          BUDGET EXHAUSTED
        </text>
        <text x="360" y={W.h - 6} textAnchor="middle" className={styles.tick} fill={INK.textMuted}>
          STEPS IN THE CHAIN
        </text>
      </>
    );
  },
  narrow: (id) => {
    const points = Array.from({ length: 5 }, (_, i) => ({
      x: 42 + i * 66,
      y: 62 + (1 - Math.pow(0.94, i)) * 620,
    }));
    const threshold = 172;
    return (
      <>
        <ellipse cx="172" cy={threshold} rx="150" ry="72" fill={`url(#${id}-halo)`} />
        <line x1="20" y1={threshold} x2="324" y2={threshold} stroke={INK.accent} strokeOpacity="0.55" strokeWidth={STROKE.path} strokeDasharray={DASH.untrusted} />
        <text x="324" y={threshold - 10} textAnchor="end" className={styles.narrowLabel} fill={INK.accent}>
          BUDGET
        </text>
        <path
          d={points.map((point, i) => (i === 0 ? `M${point.x} ${point.y}` : `L${point.x} ${points[i - 1].y} L${point.x} ${point.y}`)).join(" ")}
          fill="none"
          stroke={INK.primary}
          strokeWidth={STROKE.governed}
        />
        {points.map((point, i) => (
          <Node key={i} x={point.x} y={point.y} r={6} lit={i === points.length - 1} />
        ))}
        <text x="172" y={N.h - 10} textAnchor="middle" className={styles.narrowLabel} fill={INK.textMuted}>
          COMPOUNDING FAILURE
        </text>
      </>
    );
  },
};

/* ------------------------------------------------------------------ */
/* 2. Context engineering: a bounded window, and what does not fit      */

const SOURCES = [
  { label: "Instructions", keep: true },
  { label: "Retrieval", keep: true },
  { label: "Memory", keep: true },
  { label: "Tool schemas", keep: false },
] as const;

const contextEngineering: Composition = {
  alt: "Four sources — instructions, retrieval, memory and tool schemas — pass through a selection and compression stage into a context window of fixed capacity. What fits is drawn solid inside the window; what does not fit is drawn dashed in violet and falls away below it.",
  wide: (id) => {
    const rows = [72, 136, 200, 264];
    const select = 292;
    const windowX = 430;
    return (
      <>
        <circle cx={windowX + 110} cy="168" r="150" fill={`url(#${id}-halo)`} />
        {SOURCES.map((source, index) => {
          const y = rows[index];
          const colour = source.keep ? INK.primary : INK.accent;
          return (
            <g key={source.label}>
              <rect x="34" y={y - 17} width="200" height="34" rx="8" fill={INK.panel} stroke={colour} strokeOpacity="0.5" strokeWidth={STROKE.relation} />
              <text x="52" y={y + 4} className={styles.label} fill={INK.text}>
                {source.label.toUpperCase()}
              </text>
              <path
                d={`M234 ${y} C 266 ${y}, 266 168, ${select} 168`}
                fill="none"
                stroke={colour}
                strokeWidth={STROKE.path}
                strokeOpacity="0.5"
              />
            </g>
          );
        })}
        <rect x={select} y="112" width="18" height="112" rx="9" fill={`url(#${id}-rise)`} opacity="0.35" filter={`url(#${id}-bloom)`} />
        <rect x={select + 3} y="118" width="12" height="100" rx="6" fill={`url(#${id}-rise)`} />
        <text x={select + 9} y="102" textAnchor="middle" className={styles.label} fill={INK.textDim}>
          SELECT · COMPRESS
        </text>

        <rect x={windowX} y="66" width="248" height="204" rx="14" fill={INK.panel} fillOpacity="0.7" stroke={INK.primary} strokeOpacity="0.6" strokeWidth={STROKE.governed} />
        <text x={windowX + 124} y="52" textAnchor="middle" className={styles.label} fill={INK.textBright}>
          CONTEXT WINDOW · FIXED
        </text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x={windowX + 20 + (i % 2) * 112}
            y={86 + Math.floor(i / 2) * 58}
            width="96"
            height="42"
            rx="7"
            fill={INK.panelLit}
            stroke={INK.primary}
            strokeOpacity="0.45"
            strokeWidth={STROKE.relation}
          />
        ))}
        <path d={`M${select + 18} 200 C ${windowX - 40} 260, ${windowX - 20} 320, ${windowX + 40} 330`} fill="none" stroke={INK.accent} strokeWidth={STROKE.relation} strokeDasharray={DASH.untrusted} strokeOpacity="0.6" />
        <text x={windowX + 52} y="336" className={styles.label} fill={INK.accent}>
          DOES NOT FIT
        </text>
      </>
    );
  },
  narrow: (id) => (
    <>
      <ellipse cx="172" cy="150" rx="160" ry="86" fill={`url(#${id}-halo)`} />
      {SOURCES.slice(0, 3).map((source, index) => (
        <g key={source.label}>
          <Node x={58 + index * 114} y={34} r={7} />
          <path d={`M${58 + index * 114} 44 C ${58 + index * 114} 80, 172 84, 172 104`} fill="none" stroke={INK.primary} strokeWidth={STROKE.path} strokeOpacity="0.5" />
        </g>
      ))}
      <rect x="76" y="104" width="192" height="16" rx="8" fill={`url(#${id}-rise)`} />
      <text x="172" y="96" textAnchor="middle" className={styles.narrowLabel} fill={INK.textDim}>
        SELECT · COMPRESS
      </text>
      <rect x="34" y="140" width="276" height="96" rx="14" fill={INK.panel} fillOpacity="0.7" stroke={INK.primary} strokeOpacity="0.6" strokeWidth={STROKE.governed} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={52 + (i % 2) * 134} y={158 + Math.floor(i / 2) * 42} width="118" height="32" rx="7" fill={INK.panelLit} stroke={INK.primary} strokeOpacity="0.45" />
      ))}
      <text x="172" y={N.h - 8} textAnchor="middle" className={styles.narrowLabel} fill={INK.textBright}>
        CONTEXT WINDOW · FIXED
      </text>
    </>
  ),
};

/* ------------------------------------------------------------------ */
/* 3. Where the probabilistic meets the deterministic                   */

const CLOUD = [
  [64, 92], [118, 62], [96, 150], [152, 116], [58, 196], [130, 210],
  [186, 78], [176, 176], [104, 258], [166, 262], [206, 140], [46, 138],
] as const;

const deterministicBoundary: Composition = {
  alt: "On the left, a scattered field of violet nodes joined by soft dashed links — the probabilistic region. On the right, a crisp orthogonal blue lattice — the deterministic region. A single hard boundary separates them, and only one attested path crosses it.",
  wide: (id) => {
    const boundary = 330;
    return (
      <>
        <circle cx={boundary} cy="180" r="150" fill={`url(#${id}-halo)`} />
        {CLOUD.map(([x, y], i) =>
          CLOUD.slice(i + 1)
            .filter(([ox, oy]) => Math.hypot(x - ox, y - oy) < 96)
            .map(([ox, oy], j) => (
              <line key={`${i}-${j}`} x1={x} y1={y} x2={ox} y2={oy} stroke={INK.accent} strokeOpacity="0.28" strokeWidth={STROKE.field} strokeDasharray={DASH.soft} />
            )),
        )}
        {CLOUD.map(([x, y], i) => (
          <Node key={i} x={x} y={y} r={i % 4 === 0 ? 5 : 3} tone="accent" />
        ))}
        <text x="46" y="44" className={styles.label} fill={INK.accent}>
          PROBABILISTIC
        </text>

        <line x1={boundary} y1="34" x2={boundary} y2="326" stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.9" />
        <rect x={boundary - 5} y="34" width="10" height="292" fill={`url(#${id}-rise)`} opacity="0.3" filter={`url(#${id}-bloom)`} />
        <text x={boundary} y="24" textAnchor="middle" className={styles.label} fill={INK.textBright}>
          BOUNDARY
        </text>

        {Array.from({ length: 20 }, (_, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const x = 396 + col * 62;
          const y = 84 + row * 62;
          return (
            <g key={i}>
              <rect x={x} y={y} width="44" height="44" rx="6" fill={INK.panel} stroke={INK.primary} strokeOpacity="0.42" strokeWidth={STROKE.relation} />
              {col < 4 ? <line x1={x + 44} y1={y + 22} x2={x + 62} y2={y + 22} stroke={INK.primary} strokeOpacity="0.3" strokeWidth={STROKE.field} /> : null}
              {row < 3 ? <line x1={x + 22} y1={y + 44} x2={x + 22} y2={y + 62} stroke={INK.primary} strokeOpacity="0.3" strokeWidth={STROKE.field} /> : null}
            </g>
          );
        })}
        <text x="396" y="64" className={styles.label} fill={INK.primary}>
          DETERMINISTIC
        </text>
        <path d={`M228 180 H ${boundary - 4}`} stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.95" />
        <path d={`M${boundary + 4} 180 H 396`} stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.95" />
        <text x="252" y="168" className={styles.label} fill={INK.textDim}>
          ATTESTED
        </text>
      </>
    );
  },
  narrow: (id) => {
    const boundary = 148;
    return (
      <>
        <ellipse cx="172" cy="140" rx="160" ry="96" fill={`url(#${id}-halo)`} />
        {CLOUD.slice(0, 6).map(([x, y], i) => (
          <Node key={i} x={24 + x * 0.5} y={40 + y * 0.62} r={6} tone="accent" />
        ))}
        <text x="24" y="26" className={styles.narrowLabel} fill={INK.accent}>
          PROBABILISTIC
        </text>
        <line x1={boundary} y1="34" x2={boundary} y2="228" stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.9" />
        {Array.from({ length: 6 }, (_, i) => {
          const x = 178 + (i % 2) * 78;
          const y = 62 + Math.floor(i / 2) * 62;
          return <rect key={i} x={x} y={y} width="62" height="44" rx="7" fill={INK.panel} stroke={INK.primary} strokeOpacity="0.45" strokeWidth={STROKE.relation} />;
        })}
        <text x="178" y="46" className={styles.narrowLabel} fill={INK.primary}>
          DETERMINISTIC
        </text>
        <text x="172" y={N.h - 8} textAnchor="middle" className={styles.narrowLabel} fill={INK.textBright}>
          ONE ATTESTED CROSSING
        </text>
      </>
    );
  },
};

/* ------------------------------------------------------------------ */
/* 4. The escalation ladder                                             */

const BANDS = [
  { label: "Human authority", y: 60, tone: "primary" as const },
  { label: "Reviewed", y: 168, tone: "primary" as const },
  { label: "Autonomous", y: 276, tone: "accent" as const },
];

const humanOversight: Composition = {
  alt: "Three horizontal bands — autonomous at the bottom, reviewed in the middle, human authority at the top — separated by threshold lines. Several decisions stay in the autonomous band; one crosses both thresholds and terminates at a lit node in the human authority band.",
  wide: (id) => (
    <>
      <circle cx="560" cy="60" r="130" fill={`url(#${id}-halo)`} />
      {BANDS.map((band) => (
        <g key={band.label}>
          <line x1="40" y1={band.y + 54} x2="680" y2={band.y + 54} stroke={INK.primary} strokeOpacity="0.28" strokeWidth={STROKE.field} strokeDasharray={DASH.boundary} />
          <text x="40" y={band.y - 8} className={styles.label} fill={band.tone === "accent" ? INK.accent : INK.textDim}>
            {band.label.toUpperCase()}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 120 + i * 104;
        const escalates = i === 4;
        const stops = i === 2 ? 1 : escalates ? 0 : 2;
        const endY = BANDS[stops].y + 22;
        return (
          <g key={i}>
            <Node x={x} y={BANDS[2].y + 22} r={4} tone="accent" />
            <path
              d={`M${x} ${BANDS[2].y + 22} C ${x + 40} ${BANDS[2].y}, ${x + 60} ${endY + 40}, ${x + 88} ${endY}`}
              fill="none"
              stroke={escalates ? INK.primary : INK.accent}
              strokeWidth={escalates ? STROKE.governed : STROKE.path}
              strokeOpacity={escalates ? 0.95 : 0.45}
              strokeDasharray={escalates ? undefined : DASH.untrusted}
            />
            <Node x={x + 88} y={endY} r={escalates ? 7 : 4} lit={escalates} tone={stops === 2 ? "accent" : "primary"} />
          </g>
        );
      })}
      <text x="560" y="40" textAnchor="middle" className={styles.label} fill={INK.textBright}>
        ESCALATED
      </text>
      <text x="40" y="348" className={styles.tick} fill={INK.textMuted}>
        THRESHOLDS ARE SET FROM MEASURED RELIABILITY, NOT FROM COMFORT
      </text>
    </>
  ),
  narrow: (id) => (
    <>
      <ellipse cx="172" cy="52" rx="150" ry="60" fill={`url(#${id}-halo)`} />
      {["Human authority", "Reviewed", "Autonomous"].map((label, index) => {
        const y = 40 + index * 82;
        return (
          <g key={label}>
            <rect x="16" y={y - 26} width="312" height="52" rx="12" fill={INK.panel} stroke={index === 0 ? INK.primary : INK.edge} strokeWidth={index === 0 ? STROKE.governed : STROKE.relation} />
            <text x="172" y={y + 4} textAnchor="middle" className={styles.narrowLabel} fill={index === 2 ? INK.accent : INK.text}>
              {label.toUpperCase()}
            </text>
          </g>
        );
      })}
      <path d="M172 178 V 148 M172 96 V 66" stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.9" />
      <Node x={172} y={40} r={8} lit />
      <text x="172" y={N.h - 8} textAnchor="middle" className={styles.narrowLabel} fill={INK.textDim}>
        ONE PATH ESCALATES
      </text>
    </>
  ),
};

/* ------------------------------------------------------------------ */
/* 5. Checkpoint, fault, rewind, replay                                 */

const recoverability: Composition = {
  alt: "A timeline of durable checkpoints. A fault occurs partway along; a return arc runs back to the last checkpoint before it, and the work is replayed forward from there. The span between the last checkpoint and the fault is marked as the work that has to be redone.",
  wide: (id) => {
    const line = 190;
    const marks = [86, 200, 314, 428, 542, 656];
    const fault = 498;
    const anchor = 428;
    return (
      <>
        <circle cx={anchor} cy={line} r="140" fill={`url(#${id}-halo)`} />
        <line x1="46" y1={line} x2="690" y2={line} stroke={INK.primary} strokeOpacity="0.45" strokeWidth={STROKE.path} />
        {marks.map((x) => (
          <g key={x}>
            <line x1={x} y1={line - 18} x2={x} y2={line + 18} stroke={INK.primary} strokeOpacity="0.5" strokeWidth={STROKE.relation} />
            <Node x={x} y={line} r={x === anchor ? 7 : 4} lit={x === anchor} />
          </g>
        ))}
        <text x="46" y="48" className={styles.label} fill={INK.textDim}>
          DURABLE CHECKPOINTS
        </text>
        <text x={anchor} y={line + 44} textAnchor="middle" className={styles.label} fill={INK.textBright}>
          LAST GOOD STATE
        </text>

        <path d={`M${fault - 16} ${line - 46} l 32 32 M${fault + 16} ${line - 46} l -32 32`} stroke={INK.accent} strokeWidth={STROKE.governed} strokeOpacity="0.95" />
        <text x={fault} y={line - 58} textAnchor="middle" className={styles.label} fill={INK.accent}>
          FAULT
        </text>

        <path
          d={`M${fault} ${line + 22} C ${fault} ${line + 92}, ${anchor} ${line + 92}, ${anchor} ${line + 22}`}
          fill="none"
          stroke={INK.accent}
          strokeWidth={STROKE.path}
          strokeOpacity="0.7"
          strokeDasharray={DASH.untrusted}
        />
        <text x={(fault + anchor) / 2} y={line + 108} textAnchor="middle" className={styles.label} fill={INK.accent}>
          REWIND
        </text>

        <path
          d={`M${anchor} ${line - 22} C ${anchor} ${line - 86}, ${656} ${line - 86}, ${656} ${line - 22}`}
          fill="none"
          stroke={INK.primary}
          strokeWidth={STROKE.governed}
          strokeOpacity="0.9"
        />
        <text x={(anchor + 656) / 2} y={line - 94} textAnchor="middle" className={styles.label} fill={INK.primary}>
          REPLAY
        </text>
      </>
    );
  },
  narrow: (id) => {
    const line = 132;
    const marks = [46, 128, 210, 292];
    const anchor = 210;
    return (
      <>
        <ellipse cx={anchor} cy={line} rx="150" ry="80" fill={`url(#${id}-halo)`} />
        <line x1="24" y1={line} x2="320" y2={line} stroke={INK.primary} strokeOpacity="0.45" strokeWidth={STROKE.path} />
        {marks.map((x) => (
          <Node key={x} x={x} y={line} r={x === anchor ? 9 : 6} lit={x === anchor} />
        ))}
        <path d={`M276 ${line - 40} l 26 26 M302 ${line - 40} l -26 26`} stroke={INK.accent} strokeWidth={STROKE.governed} />
        <text x="289" y={line - 50} textAnchor="middle" className={styles.narrowLabel} fill={INK.accent}>
          FAULT
        </text>
        <path
          d={`M289 ${line + 24} C 289 ${line + 74}, ${anchor} ${line + 74}, ${anchor} ${line + 24}`}
          fill="none"
          stroke={INK.accent}
          strokeWidth={STROKE.path}
          strokeDasharray={DASH.untrusted}
          strokeOpacity="0.75"
        />
        <text x="172" y={line + 96} textAnchor="middle" className={styles.narrowLabel} fill={INK.textBright}>
          REWIND · REPLAY
        </text>
      </>
    );
  },
};

const COMPOSITIONS: Record<Slug, Composition> = {
  "agentic-ai-reliability-budget": reliabilityBudget,
  "context-engineering-production-ai": contextEngineering,
  "deterministic-boundaries-ai-smart-contracts": deterministicBoundary,
  "human-oversight-architecture": humanOversight,
  "recoverability-architecture": recoverability,
};

export function hasArticleArt(slug: string): slug is Slug {
  return slug in COMPOSITIONS;
}

/**
 * The diagram for one article.
 *
 * `variant` decides the crop, not the drawing: an index card shows the same
 * composition through a shorter window, so a row of cards keeps a card-like
 * proportion while the article hero is given the full canvas.
 */
export function ArticleArt({
  slug,
  variant = "hero",
  className = "",
}: {
  slug: string;
  variant?: "hero" | "card";
  className?: string;
}) {
  if (!hasArticleArt(slug)) return null;
  const composition = COMPOSITIONS[slug];
  const id = `art-${slug}-${variant}`;

  return (
    <div className={`${styles.art} ${styles[variant]} ${className}`}>
      <svg
        className={styles.wide}
        viewBox={`0 0 ${W.w} ${W.h}`}
        preserveAspectRatio={variant === "card" ? "xMidYMid slice" : "xMidYMid meet"}
        role="img"
        aria-label={composition.alt}
      >
        <SceneDefs id={`${id}-w`} />
        <rect width={W.w} height={W.h} fill={`url(#${id}-w-mesh)`} opacity="0.45" />
        {composition.wide(`${id}-w`)}
      </svg>
      <svg
        className={styles.narrow}
        viewBox={`0 0 ${N.w} ${N.h}`}
        preserveAspectRatio={variant === "card" ? "xMidYMid slice" : "xMidYMid meet"}
        role="img"
        aria-label={composition.alt}
      >
        <SceneDefs id={`${id}-n`} />
        <rect width={N.w} height={N.h} fill={`url(#${id}-n-mesh)`} opacity="0.4" />
        {composition.narrow(`${id}-n`)}
      </svg>
    </div>
  );
}
