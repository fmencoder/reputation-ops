/**
 * The home environment: a NOVRA system landscape.
 *
 * Not an illustration placed on a page — the page's ground floor. It draws the
 * whole claim the publication is built on, left to right: many streams of
 * intelligence arrive, a convergence architecture reconciles them, one governed
 * boundary decides, and an execution layer holds only what passed. The streams
 * are deliberately unequal — two of the five are probabilistic and drawn
 * dashed in violet — because the argument is about what happens when untrusted
 * input reaches an actuator, not about tidy pipelines.
 *
 * Depth comes from three receding planes behind the streams, illumination from
 * a single halo at the boundary, and asymmetry from putting the dense field
 * high-left and the sparse execution lattice low-right. That composition is the
 * whole reason for the migration: planes need a stacking context, the halo needs
 * a filter, and the dashed probabilistic paths need stroke-dasharray — none of
 * which an inline style attribute can carry.
 *
 * Two compositions, not one scaled. The phone drawing is a vertical funnel with
 * half the node count and twice the element size; a shrunk copy of the desktop
 * scene is exactly the failure this replaces.
 */
import { INK, STROKE, DASH, SceneDefs, Node } from "./system";
import styles from "./SystemLandscape.module.css";

/** The five classes of input, in the order they are drawn. */
const STREAMS = [
  { label: "Model output", trusted: true, satellites: [[-34, -22], [-52, 8]] },
  { label: "Retrieved context", trusted: false, satellites: [[-46, -14], [-30, 20], [-58, 4]] },
  { label: "Policy & limits", trusted: true, satellites: [[-40, 16]] },
  { label: "Tool result", trusted: false, satellites: [[-36, -20], [-54, 10]] },
  { label: "Operator intent", trusted: true, satellites: [[-44, -8]] },
] as const;

function Wide() {
  const rows = [74, 158, 250, 342, 430];
  const spine = 404;
  const gate = 566;
  const mid = 252;

  return (
    <svg
      className={styles.wide}
      viewBox="0 0 880 560"
      role="img"
      aria-label="A system landscape. Five streams of input — model output, retrieved context, policy and limits, tool result and operator intent — converge through a reconciliation architecture on a single governed boundary, and one path continues from it into an execution layer. Retrieved context and tool result are drawn dashed in violet to mark probabilistic origin."
    >
      <SceneDefs id="land" />

      {/* The ruled field, and three receding planes that give the scene depth. */}
      <rect width="880" height="560" fill="url(#land-mesh)" opacity="0.5" />
      {[0, 1, 2].map((plane) => {
        const inset = plane * 34;
        return (
          <path
            key={plane}
            d={`M${40 + inset} ${500 - inset} L${300 + inset} ${386 - inset} L${840 - inset} ${408 - inset} L${560 - inset} ${528 - inset} Z`}
            fill="none"
            stroke={INK.primary}
            strokeOpacity={0.14 - plane * 0.035}
            strokeWidth={STROKE.field}
          />
        );
      })}

      <circle cx={gate} cy={mid} r="176" fill="url(#land-halo)" />

      {/* Streams. Each is a lead node, its satellites, and its path inward. */}
      {STREAMS.map((stream, index) => {
        const y = rows[index];
        const colour = stream.trusted ? INK.primary : INK.accent;
        const lead = 176;
        return (
          <g key={stream.label}>
            {stream.satellites.map(([dx, dy], s) => (
              <g key={s}>
                <line
                  x1={lead + dx}
                  y1={y + dy}
                  x2={lead}
                  y2={y}
                  stroke={colour}
                  strokeOpacity="0.28"
                  strokeWidth={STROKE.field}
                />
                <Node x={lead + dx} y={y + dy} r={2.5} tone={stream.trusted ? "primary" : "accent"} />
              </g>
            ))}
            <Node x={lead} y={y} r={5} tone={stream.trusted ? "primary" : "accent"} />
            <text x={lead + 16} y={y - 12} className={styles.label} fill={INK.text}>
              {stream.label.toUpperCase()}
            </text>
            <path
              d={`M${lead + 8} ${y} C 268 ${y}, 320 ${mid}, ${spine} ${mid + (index - 2) * 26}`}
              fill="none"
              stroke={colour}
              strokeWidth={STROKE.path}
              strokeOpacity="0.5"
              strokeDasharray={stream.trusted ? undefined : DASH.untrusted}
            />
          </g>
        );
      })}

      {/* Convergence architecture: a bounded lattice where the streams reconcile. */}
      <rect
        x={spine - 26}
        y={mid - 96}
        width="130"
        height="192"
        rx="14"
        fill={INK.panel}
        fillOpacity="0.6"
        stroke={INK.primary}
        strokeOpacity="0.3"
      />
      {[-52, -26, 0, 26, 52].map((offset) => (
        <line
          key={offset}
          x1={spine - 14}
          y1={mid + offset}
          x2={spine + 92}
          y2={mid + offset * 0.35}
          stroke={INK.primary}
          strokeOpacity="0.34"
          strokeWidth={STROKE.relation}
        />
      ))}
      {[-52, -26, 0, 26, 52].map((offset) => (
        <Node key={offset} x={spine + 92} y={mid + offset * 0.35} r={3} />
      ))}
      <text x={spine + 39} y={mid - 110} textAnchor="middle" className={styles.label} fill={INK.textDim}>
        CONVERGENCE
      </text>

      {/* The governed boundary. The one heavy element in the drawing. */}
      <path d={`M${spine + 96} ${mid} H ${gate - 12}`} stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.85" />
      <rect x={gate - 11} y={mid - 118} width="22" height="236" rx="11" fill="url(#land-rise)" opacity="0.32" filter="url(#land-bloom)" />
      <rect x={gate - 7} y={mid - 110} width="14" height="220" rx="7" fill="url(#land-rise)" />
      <text x={gate} y={mid - 128} textAnchor="middle" className={styles.label} fill={INK.textBright}>
        GOVERNED BOUNDARY
      </text>

      {/* Execution layer: what passed, and nothing else. */}
      <path d={`M${gate + 12} ${mid} H 664`} stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.85" />
      {Array.from({ length: 12 }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 664 + col * 54;
        const y = mid - 62 + row * 62;
        const lit = i === 4;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="44"
              height="44"
              rx="8"
              fill={lit ? INK.panelLit : INK.panel}
              stroke={lit ? INK.primary : INK.edge}
              strokeOpacity={lit ? 0.9 : 1}
              strokeWidth={STROKE.relation}
            />
            {lit ? <rect x={x} y={y} width="44" height="3" rx="1.5" fill={INK.primary} /> : null}
          </g>
        );
      })}
      <text x="664" y={mid - 76} className={styles.label} fill={INK.textDim}>
        EXECUTION LAYER
      </text>

      <g className={styles.legend}>
        <line x1="40" y1="524" x2="70" y2="524" stroke={INK.primary} strokeWidth={STROKE.path} />
        <text x="78" y="528" fill={INK.textMuted}>ATTESTED ORIGIN</text>
        <line x1="240" y1="524" x2="270" y2="524" stroke={INK.accent} strokeWidth={STROKE.path} strokeDasharray={DASH.untrusted} />
        <text x="278" y="528" fill={INK.textMuted}>PROBABILISTIC ORIGIN</text>
      </g>
    </svg>
  );
}

function Narrow() {
  const columns = [52, 122, 192, 262, 332];
  const gateY = 250;

  return (
    <svg
      className={styles.narrow}
      viewBox="0 0 384 470"
      role="img"
      aria-label="Five streams of input converge on a single governed boundary, and one path continues from it into an execution layer. Two of the five are drawn dashed in violet to mark probabilistic origin."
    >
      <SceneDefs id="landn" />
      <rect width="384" height="470" fill="url(#landn-mesh)" opacity="0.4" />
      <ellipse cx="192" cy={gateY} rx="180" ry="86" fill="url(#landn-halo)" />

      {STREAMS.map((stream, index) => {
        const x = columns[index];
        const colour = stream.trusted ? INK.primary : INK.accent;
        return (
          <g key={stream.label}>
            <Node x={x} y={46} r={7} tone={stream.trusted ? "primary" : "accent"} />
            <path
              d={`M${x} 56 C ${x} 140, 192 152, 192 ${gateY - 34}`}
              fill="none"
              stroke={colour}
              strokeWidth={STROKE.path}
              strokeOpacity="0.5"
              strokeDasharray={stream.trusted ? undefined : DASH.untrusted}
            />
          </g>
        );
      })}
      <text x="192" y="22" textAnchor="middle" className={styles.label} fill={INK.textDim}>
        FIVE STREAMS
      </text>

      {/* Convergence, compressed to a single reconciling band. */}
      <rect x="76" y={gateY - 34} width="232" height="30" rx="10" fill={INK.panel} fillOpacity="0.7" stroke={INK.primary} strokeOpacity="0.3" />
      {[-72, -24, 24, 72].map((offset) => (
        <Node key={offset} x={192 + offset} y={gateY - 19} r={3.5} />
      ))}

      <rect x="60" y={gateY + 4} width="264" height="22" rx="11" fill="url(#landn-rise)" opacity="0.34" filter="url(#landn-bloom)" />
      <rect x="66" y={gateY + 8} width="252" height="14" rx="7" fill="url(#landn-rise)" />
      <text x="192" y={gateY + 48} textAnchor="middle" className={styles.label} fill={INK.textBright}>
        GOVERNED BOUNDARY
      </text>

      <path d={`M192 ${gateY + 58} V ${gateY + 92}`} stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.85" />
      {Array.from({ length: 6 }, (_, i) => {
        const x = 60 + (i % 3) * 92;
        const y = gateY + 100 + Math.floor(i / 3) * 62;
        const lit = i === 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="72"
            height="48"
            rx="9"
            fill={lit ? INK.panelLit : INK.panel}
            stroke={lit ? INK.primary : INK.edge}
            strokeWidth={STROKE.relation}
          />
        );
      })}
      <text x="192" y="462" textAnchor="middle" className={styles.label} fill={INK.textDim}>
        EXECUTION LAYER
      </text>
    </svg>
  );
}

export function SystemLandscape({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.scene} ${className}`}>
      <Wide />
      <Narrow />
    </div>
  );
}
