/**
 * The Technology signature: the convergence path drawn as an architecture.
 *
 * Five planes seen in projection rather than five boxes in a column, because
 * the argument is not that these things happen in order — it is that they are
 * layers of one system, each sitting on the one beneath and each reachable from
 * the edges. So the plates recede, a spine runs through them, governance and
 * observability rails run down the outside and tie into every plane, and two
 * long returns arc around the outside: context is written back from execution,
 * and telemetry climbs from execution to intelligence. A flowchart cannot say
 * any of that.
 *
 * One plane is lit. The deterministic gate is the load-bearing element of the
 * whole path — everything above it is advisory and everything below it is
 * irreversible — so it is the only plate that carries the gradient and the
 * bloom, and the only place the eye is asked to stop.
 *
 * Every label in the drawing also appears in the prose beside it. The figure is
 * an aid to reading, never the only place the information exists.
 */
import { INK, STROKE, DASH, SceneDefs } from "./system";
import styles from "./StackMap.module.css";

const LAYERS = [
  { label: "Intelligence", note: "Models, agents, inference", gate: false },
  { label: "Context & memory", note: "Retrieval, state, history", gate: false },
  { label: "Policy & constraint", note: "Authorization, limits, obligations", gate: false },
  { label: "Deterministic gate", note: "The decision that cannot be probabilistic", gate: true },
  { label: "Execution infrastructure", note: "Contracts, settlement, systems of record", gate: false },
] as const;

function Wide() {
  const cx = 360;
  const halfW = 214;
  const depth = 40;
  const thickness = 15;
  const first = 132;
  const spacing = 104;
  const rowY = (index: number) => first + index * spacing;
  const last = rowY(LAYERS.length - 1);

  const face = (y: number) =>
    `M${cx - halfW} ${y} L${cx} ${y - depth} L${cx + halfW} ${y} L${cx} ${y + depth} Z`;
  const side = (y: number) =>
    `M${cx - halfW} ${y} L${cx} ${y + depth} L${cx + halfW} ${y} L${cx + halfW} ${y + thickness} L${cx} ${y + depth + thickness} L${cx - halfW} ${y + thickness} Z`;

  return (
    <svg
      className={styles.wide}
      viewBox="0 0 720 700"
      role="img"
      aria-label="Five architectural layers in projection, from top to bottom: intelligence; context and memory; policy and constraint; a highlighted deterministic gate; and execution infrastructure. A spine connects them. A security and governance rail runs down the left edge and an observability and human oversight rail down the right, each tied into every layer. Two returns arc around the outside: context written back from execution, and telemetry climbing from execution to intelligence."
    >
      <SceneDefs id="stack" />
      <rect width="720" height="700" fill="url(#stack-mesh)" opacity="0.4" />
      <ellipse cx={cx} cy={rowY(3)} rx="300" ry="120" fill="url(#stack-halo)" />

      <text x={cx} y="34" textAnchor="middle" className={styles.edge} fill={INK.textDim}>
        DATA &amp; EVENTS
      </text>
      <path d={`M${cx} 44 V ${first - depth - 10}`} stroke={INK.primary} strokeOpacity="0.6" strokeWidth={STROKE.path} />

      {/* Edge rails. Every layer is reachable from governance and from oversight. */}
      {([
        ["SECURITY & GOVERNANCE", 44, cx - halfW, "start"],
        ["OBSERVABILITY & HUMAN OVERSIGHT", 676, cx + halfW, "end"],
      ] as const).map(([label, railX, plateX, anchor]) => (
        <g key={label}>
          <line
            x1={railX}
            y1={first - depth}
            x2={railX}
            y2={last + depth + thickness}
            stroke={INK.primary}
            strokeOpacity="0.3"
            strokeWidth={STROKE.relation}
            strokeDasharray={DASH.boundary}
          />
          {LAYERS.map((layer, index) => (
            <line
              key={layer.label}
              x1={railX}
              y1={rowY(index)}
              x2={plateX}
              y2={rowY(index)}
              stroke={INK.primary}
              strokeOpacity="0.22"
              strokeWidth={STROKE.field}
            />
          ))}
          <text
            x={railX}
            y={first - depth - 22}
            textAnchor={anchor}
            className={styles.edge}
            fill={INK.textMuted}
          >
            {label}
          </text>
        </g>
      ))}

      {/* The two long returns. Neither is a step in the path; both are real. */}
      <path
        d={`M${cx - halfW - 6} ${rowY(4)} C ${cx - halfW - 92} ${rowY(4)}, ${cx - halfW - 92} ${rowY(1)}, ${cx - halfW - 6} ${rowY(1)}`}
        fill="none"
        stroke={INK.accent}
        strokeOpacity="0.45"
        strokeWidth={STROKE.relation}
        strokeDasharray={DASH.soft}
      />
      <path
        d={`M${cx + halfW + 6} ${rowY(4)} C ${cx + halfW + 92} ${rowY(4)}, ${cx + halfW + 92} ${rowY(0)}, ${cx + halfW + 6} ${rowY(0)}`}
        fill="none"
        stroke={INK.accent}
        strokeOpacity="0.45"
        strokeWidth={STROKE.relation}
        strokeDasharray={DASH.soft}
      />

      {LAYERS.map((layer, index) => {
        const y = rowY(index);
        return (
          <g key={layer.label}>
            {index < LAYERS.length - 1 ? (
              <path
                d={`M${cx} ${y + depth + thickness} V ${rowY(index + 1) - depth}`}
                stroke={layer.gate ? INK.primary : INK.edgeLit}
                strokeOpacity={layer.gate ? 0.9 : 1}
                strokeWidth={layer.gate ? STROKE.governed : STROKE.path}
              />
            ) : null}
            <path d={side(y)} fill={INK.void} stroke={INK.edge} strokeWidth={STROKE.field} />
            {layer.gate ? (
              <path d={face(y)} fill="url(#stack-flow)" opacity="0.3" filter="url(#stack-bloom)" />
            ) : null}
            <path
              d={face(y)}
              fill={layer.gate ? INK.panelLit : INK.panel}
              stroke={layer.gate ? INK.primary : INK.edge}
              strokeWidth={layer.gate ? STROKE.governed : STROKE.relation}
              strokeOpacity={layer.gate ? 0.95 : 1}
            />
            <text
              x={cx}
              y={y - 1}
              textAnchor="middle"
              className={layer.gate ? styles.gateLabel : styles.label}
              fill={layer.gate ? INK.textBright : INK.text}
            >
              {layer.label.toUpperCase()}
            </text>
            <text x={cx} y={y + 17} textAnchor="middle" className={styles.note} fill={INK.textMuted}>
              {layer.note}
            </text>
          </g>
        );
      })}

      <path
        d={`M${cx} ${last + depth + thickness} V ${last + depth + thickness + 40}`}
        stroke={INK.primary}
        strokeOpacity="0.7"
        strokeWidth={STROKE.governed}
      />
      <text x={cx} y={last + depth + thickness + 60} textAnchor="middle" className={styles.edge} fill={INK.textDim}>
        VERIFIED OUTCOMES
      </text>
    </svg>
  );
}

function Narrow() {
  const width = 360;
  const rowHeight = 68;
  const gap = 22;
  const top = 54;
  const rowY = (index: number) => top + index * (rowHeight + gap);
  const last = rowY(LAYERS.length - 1) + rowHeight;

  return (
    <svg
      className={styles.narrow}
      viewBox={`0 0 ${width} ${last + 62}`}
      role="img"
      aria-label="Five architectural layers from top to bottom: intelligence; context and memory; policy and constraint; a highlighted deterministic gate; and execution infrastructure, ending in verified outcomes."
    >
      <SceneDefs id="stackn" />
      <ellipse cx={width / 2} cy={rowY(3) + rowHeight / 2} rx="200" ry="96" fill="url(#stackn-halo)" />

      <text x={width / 2} y="24" textAnchor="middle" className={styles.edge} fill={INK.textDim}>
        DATA &amp; EVENTS
      </text>

      {LAYERS.map((layer, index) => {
        const y = rowY(index);
        return (
          <g key={layer.label}>
            {layer.gate ? (
              <rect x="12" y={y} width={width - 24} height={rowHeight} rx="14" fill="url(#stackn-flow)" opacity="0.28" filter="url(#stackn-bloom)" />
            ) : null}
            <rect
              x="12"
              y={y}
              width={width - 24}
              height={rowHeight}
              rx="14"
              fill={layer.gate ? INK.panelLit : INK.panel}
              stroke={layer.gate ? INK.primary : INK.edge}
              strokeWidth={layer.gate ? STROKE.governed : STROKE.relation}
            />
            {layer.gate ? <rect x="12" y={y} width="5" height={rowHeight} rx="2.5" fill="url(#stackn-rise)" /> : null}
            <text x={width / 2} y={y + 30} textAnchor="middle" className={styles.narrowLabel} fill={layer.gate ? INK.textBright : INK.text}>
              {layer.label.toUpperCase()}
            </text>
            <text x={width / 2} y={y + 50} textAnchor="middle" className={styles.note} fill={INK.textMuted}>
              {layer.note}
            </text>
            {index < LAYERS.length - 1 ? (
              <path
                d={`M${width / 2} ${y + rowHeight} v ${gap}`}
                stroke={layer.gate ? INK.primary : INK.edgeLit}
                strokeWidth={layer.gate ? STROKE.governed : STROKE.path}
              />
            ) : null}
          </g>
        );
      })}

      <path d={`M${width / 2} ${last} V ${last + 26}`} stroke={INK.primary} strokeOpacity="0.7" strokeWidth={STROKE.governed} />
      <text x={width / 2} y={last + 48} textAnchor="middle" className={styles.edge} fill={INK.textDim}>
        VERIFIED OUTCOMES
      </text>
    </svg>
  );
}

export function StackMap({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.map} ${className}`}>
      <Wide />
      <Narrow />
    </div>
  );
}
