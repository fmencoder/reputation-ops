/**
 * The Research environment: the domains this publication works in, and how they
 * bear on each other.
 *
 * Five domains, six relations, and no numbers. The reference composition for
 * this page carried a distribution chart whose every figure was invented; what
 * is true and worth drawing is the structure — that context work is upstream of
 * reliability, that governance is only real once execution is deterministic,
 * and that recoverability is what remains when the other four have run out.
 *
 * The arrangement is deliberately not a wheel. A pentagon with equal spokes
 * says every domain is equidistant from every other, which is false and reads
 * as a stock diagram; this places them by how they actually connect and leaves
 * the composition asymmetric.
 */
import { INK, STROKE, DASH, SceneDefs } from "./system";
import styles from "./ResearchMap.module.css";

type Key = "context" | "reliability" | "governance" | "determinism" | "recovery";

const DOMAINS: Record<Key, { label: string; x: number; y: number; w: number }> = {
  context: { label: "Context engineering", x: 118, y: 96, w: 176 },
  reliability: { label: "Reliability", x: 372, y: 62, w: 128 },
  governance: { label: "Governance", x: 546, y: 168, w: 136 },
  determinism: { label: "Deterministic execution", x: 404, y: 288, w: 196 },
  recovery: { label: "Recoverability", x: 158, y: 366, w: 150 },
};

/** Every edge is a claim the publication has actually argued. */
const RELATIONS: { from: Key; to: Key; note: string; firm: boolean; bend: number }[] = [
  { from: "context", to: "reliability", note: "determines", firm: true, bend: -38 },
  { from: "reliability", to: "governance", note: "sets thresholds", firm: true, bend: -24 },
  { from: "governance", to: "determinism", note: "is enforced by", firm: true, bend: 30 },
  { from: "determinism", to: "recovery", note: "makes state recoverable", firm: true, bend: 34 },
  { from: "context", to: "determinism", note: "bounds what may commit", firm: false, bend: 44 },
  { from: "reliability", to: "recovery", note: "runs out into", firm: false, bend: -96 },
];

const HEIGHT = 34;

/**
 * Where an edge meets a plate.
 *
 * Edges are drawn between plate borders, not plate centres. Running them to the
 * centre puts a line underneath every label and out the far side, which is how
 * a map stops reading as a map.
 */
function border(key: Key, towardX: number, towardY: number) {
  const domain = DOMAINS[key];
  const dx = towardX - domain.x;
  const dy = towardY - domain.y;
  if (dx === 0 && dy === 0) return { x: domain.x, y: domain.y };
  const scale = Math.min(
    Math.abs(dx) > 0.001 ? (domain.w / 2 + 6) / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0.001 ? (HEIGHT / 2 + 6) / Math.abs(dy) : Infinity,
  );
  return { x: domain.x + dx * scale, y: domain.y + dy * scale };
}

function edgePath(from: Key, to: Key, bend: number) {
  const a = DOMAINS[from];
  const b = DOMAINS[to];
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + bend;
  const start = border(from, cx, cy);
  const end = border(to, cx, cy);
  /*
   * The annotation sits on the curve, at the point the curve actually passes
   * through — a quadratic never reaches its control point, and placing labels
   * there is what dropped "makes state recoverable" on top of the plate it was
   * describing.
   */
  return {
    d: `M${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
    mx: 0.25 * start.x + 0.5 * cx + 0.25 * end.x,
    my: 0.25 * start.y + 0.5 * cy + 0.25 * end.y,
  };
}

function Wide() {
  return (
    <svg
      className={styles.wide}
      viewBox="0 0 700 460"
      role="img"
      aria-label="A map of five research domains and how they bear on each other. Context engineering determines reliability and bounds what may commit through deterministic execution. Reliability sets governance thresholds and runs out into recoverability. Governance is enforced by deterministic execution, which makes state recoverable."
    >
      <SceneDefs id="rmap" />
      <rect width="700" height="460" fill="url(#rmap-mesh)" opacity="0.45" />
      <circle cx={DOMAINS.determinism.x} cy={DOMAINS.determinism.y} r="160" fill="url(#rmap-halo)" />

      {RELATIONS.map((relation) => {
        const { d, mx, my } = edgePath(relation.from, relation.to, relation.bend);
        return (
          <g key={`${relation.from}-${relation.to}`}>
            <path
              d={d}
              fill="none"
              stroke={relation.firm ? INK.primary : INK.accent}
              strokeOpacity={relation.firm ? 0.5 : 0.4}
              strokeWidth={relation.firm ? STROKE.path : STROKE.relation}
              strokeDasharray={relation.firm ? undefined : DASH.soft}
            />
            {/* Stroked in the page colour beneath the fill so the words stay
                legible where they cross another edge. */}
            <text
              x={mx}
              y={my - 7}
              textAnchor="middle"
              className={styles.relation}
              fill={INK.textMuted}
              stroke={INK.void}
              strokeWidth="4"
              paintOrder="stroke"
            >
              {relation.note.toUpperCase()}
            </text>
          </g>
        );
      })}

      {(Object.keys(DOMAINS) as Key[]).map((key) => {
        const domain = DOMAINS[key];
        const lit = key === "determinism";
        return (
          <g key={key}>
            <rect
              x={domain.x - domain.w / 2}
              y={domain.y - HEIGHT / 2}
              width={domain.w}
              height={HEIGHT}
              rx="9"
              fill={lit ? INK.panelLit : INK.panel}
              stroke={lit ? INK.primary : INK.edge}
              strokeWidth={lit ? STROKE.governed : STROKE.relation}
            />
            {lit ? (
              <rect x={domain.x - domain.w / 2} y={domain.y - HEIGHT / 2} width={domain.w} height="3" rx="1.5" fill="url(#rmap-flow)" />
            ) : null}
            <text x={domain.x} y={domain.y + 4} textAnchor="middle" className={styles.domain} fill={lit ? INK.textBright : INK.text}>
              {domain.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      <text x="24" y="440" className={styles.relation} fill={INK.textMuted}>
        SOLID: ARGUED DIRECTLY &nbsp;·&nbsp; DASHED: WORKED THROUGH INDIRECTLY
      </text>
    </svg>
  );
}

/** The phone map keeps all five domains and the reading order, and drops the
 *  relation labels that cannot be set at a legible size on a 390px screen. */
function Narrow() {
  const order: Key[] = ["context", "reliability", "governance", "determinism", "recovery"];
  const rowHeight = 56;
  const gap = 26;
  const top = 18;
  const y = (i: number) => top + i * (rowHeight + gap);
  const height = y(order.length - 1) + rowHeight + 18;

  return (
    <svg
      className={styles.narrow}
      viewBox={`0 0 344 ${height}`}
      role="img"
      aria-label="Five research domains in order: context engineering, reliability, governance, deterministic execution, and recoverability, each bearing on the next."
    >
      <SceneDefs id="rmapn" />
      <ellipse cx="172" cy={y(3) + rowHeight / 2} rx="170" ry="70" fill="url(#rmapn-halo)" />

      {order.map((key, index) => {
        const lit = key === "determinism";
        return (
          <g key={key}>
            <rect
              x="16"
              y={y(index)}
              width="312"
              height={rowHeight}
              rx="12"
              fill={lit ? INK.panelLit : INK.panel}
              stroke={lit ? INK.primary : INK.edge}
              strokeWidth={lit ? STROKE.governed : STROKE.relation}
            />
            <text x="172" y={y(index) + rowHeight / 2 + 5} textAnchor="middle" className={styles.narrowDomain} fill={lit ? INK.textBright : INK.text}>
              {DOMAINS[key].label.toUpperCase()}
            </text>
            {index < order.length - 1 ? (
              <path d={`M172 ${y(index) + rowHeight} v ${gap}`} stroke={INK.primary} strokeOpacity="0.5" strokeWidth={STROKE.path} />
            ) : null}
          </g>
        );
      })}

      {/* The one lateral relation worth keeping at this size: reliability runs
          out into recoverability, drawn around the outside. */}
      <path
        d={`M16 ${y(1) + rowHeight / 2} C -22 ${y(1)}, -22 ${y(4)}, 16 ${y(4) + rowHeight / 2}`}
        fill="none"
        stroke={INK.accent}
        strokeOpacity="0.5"
        strokeWidth={STROKE.relation}
        strokeDasharray={DASH.soft}
      />
    </svg>
  );
}

export function ResearchMap({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.map} ${className}`}>
      <Wide />
      <Narrow />
    </div>
  );
}
