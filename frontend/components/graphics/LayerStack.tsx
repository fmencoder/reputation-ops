/**
 * The Technology environment: the convergence path drawn as system layers.
 *
 * Data and events enter at the top, pass down through intelligence, agents and
 * a highlighted policy and authorization layer, then reach contracts, state and
 * infrastructure and leave as verified outcomes. The six middle layers sit
 * inside a containment boundary — security and governance on one edge,
 * observability and human oversight on the other.
 *
 * Every label in the drawing also appears in the prose beside it. The figure is
 * an aid to reading, never the only place the information exists.
 */
import styles from "./LayerStack.module.css";

const LAYERS = [
  { label: "AI & intelligence layer", gate: false },
  { label: "Autonomous agents", gate: false },
  { label: "Policy & authorization", gate: true },
  { label: "Smart contracts", gate: false },
  { label: "Blockchain & distributed state", gate: false },
  { label: "Digital & financial infrastructure", gate: false },
];

export function LayerStack() {
  const top = 62;
  const rowHeight = 54;
  const gap = 10;
  const width = 520;
  const inner = width - 96;

  return (
    <svg
      className={styles.stack}
      viewBox={`0 0 ${width} ${top + LAYERS.length * (rowHeight + gap) + 84}`}
      role="img"
      aria-label="Layered architecture. Data and events enter at the top and pass down through an AI and intelligence layer, autonomous agents, a highlighted policy and authorization layer, smart contracts, blockchain and distributed state, and digital and financial infrastructure, emerging as verified outcomes. The six middle layers sit inside a containment boundary marked security and governance on one edge and observability and human oversight on the other."
    >
      <defs>
        <linearGradient id="layer-gate" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f6bff" />
          <stop offset="100%" stopColor="#7b4dff" />
        </linearGradient>
        <linearGradient id="layer-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d84ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7b4dff" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <text x={width / 2} y="22" textAnchor="middle" className={styles.edge}>
        DATA &amp; EVENTS
      </text>
      <path d={`M${width / 2} 30 V ${top - 8}`} stroke="#4d84ff" strokeOpacity="0.6" strokeWidth="1.25" />

      <rect
        x="30"
        y={top - 16}
        width={width - 60}
        height={LAYERS.length * (rowHeight + gap) + 22}
        rx="18"
        fill="none"
        stroke="url(#layer-edge)"
        strokeDasharray="6 6"
      />
      <text x="30" y={top - 24} className={styles.edge}>
        SECURITY &amp; GOVERNANCE
      </text>
      <text
        x={width - 30}
        y={top + LAYERS.length * (rowHeight + gap) + 26}
        textAnchor="end"
        className={styles.edge}
      >
        OBSERVABILITY &amp; HUMAN OVERSIGHT
      </text>

      {LAYERS.map((layer, index) => {
        const y = top + index * (rowHeight + gap);
        return (
          <g key={layer.label}>
            <rect
              x="48"
              y={y}
              width={inner}
              height={rowHeight}
              rx="10"
              fill={layer.gate ? "#0d1226" : "#0a0e1c"}
              stroke={layer.gate ? "url(#layer-gate)" : "#1b2340"}
              strokeWidth={layer.gate ? 1.5 : 1}
            />
            {layer.gate ? (
              <rect x="48" y={y} width="4" height={rowHeight} rx="2" fill="url(#layer-gate)" />
            ) : null}
            <text x="72" y={y + rowHeight / 2 + 4} className={layer.gate ? styles.gateLabel : styles.label}>
              {layer.label.toUpperCase()}
            </text>
            {index < LAYERS.length - 1 ? (
              <path
                d={`M${width / 2} ${y + rowHeight} v ${gap}`}
                stroke={layer.gate ? "#4d84ff" : "#2a3560"}
                strokeWidth="1.25"
              />
            ) : null}
          </g>
        );
      })}

      <path
        d={`M${width / 2} ${top + LAYERS.length * (rowHeight + gap) + 6} V ${top + LAYERS.length * (rowHeight + gap) + 46}`}
        stroke="#4d84ff"
        strokeOpacity="0.6"
        strokeWidth="1.25"
      />
      <text
        x={width / 2}
        y={top + LAYERS.length * (rowHeight + gap) + 64}
        textAnchor="middle"
        className={styles.edge}
      >
        VERIFIED OUTCOMES
      </text>
    </svg>
  );
}
