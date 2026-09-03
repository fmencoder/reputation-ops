/**
 * The home hero environment: four classes of input converging on one gate.
 *
 * This is the argument the publication is about, drawn rather than described —
 * model output and policy arrive attested, retrieved context and tool results
 * arrive untrusted (dashed, violet), and nothing reaches COMMIT without passing
 * the gate. The reference composition puts a generic globe here; a globe would
 * say nothing.
 *
 * Two compositions, not one scaled down. The desktop scene runs left-to-right
 * with labelled rails; the phone scene stacks the same four inputs into a
 * vertical funnel, because rails 320px wide are unreadable and a shrunk copy of
 * the desktop drawing is exactly the failure the migration was meant to end.
 */
import styles from "./ConvergenceScene.module.css";

const INPUTS = [
  { label: "Model output", trusted: true },
  { label: "Retrieved context", trusted: false },
  { label: "Policy + limits", trusted: true },
  { label: "External tool result", trusted: false },
];

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gate`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#2f6bff" />
        <stop offset="55%" stopColor="#4d84ff" />
        <stop offset="100%" stopColor="#7b4dff" />
      </linearGradient>
      <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4d84ff" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#4d84ff" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
  );
}

function Wide() {
  const gateX = 470;
  const rows = [96, 196, 296, 396];
  return (
    <svg
      className={styles.wide}
      viewBox="0 0 720 520"
      role="img"
      aria-label="Four classes of input — model output, retrieved context, policy and limits, and external tool result — converge on a single deterministic gate. Retrieved context and external tool result are drawn dashed and violet to mark untrusted origin. One path leaves the gate to a node labelled commit."
    >
      <Defs id="wide" />
      <circle cx={gateX} cy="256" r="150" fill="url(#wide-halo)" />

      {rows.map((y, index) => {
        const input = INPUTS[index];
        const stroke = input.trusted ? "#4d84ff" : "#7b4dff";
        return (
          <g key={input.label}>
            <rect
              x="16"
              y={y - 22}
              width="238"
              height="44"
              rx="10"
              fill="#0a0e1c"
              stroke={stroke}
              strokeOpacity={input.trusted ? 0.55 : 0.5}
              strokeDasharray={input.trusted ? undefined : "5 4"}
            />
            <circle cx="40" cy={y} r="4" fill={stroke} />
            <text x="56" y={y + 4} className={styles.label} fill="#c8d2ea">
              {input.label.toUpperCase()}
            </text>
            <path
              d={`M254 ${y} C 350 ${y}, 380 256, ${gateX - 14} 256`}
              fill="none"
              stroke={stroke}
              strokeWidth="1.25"
              strokeOpacity="0.55"
              strokeDasharray={input.trusted ? undefined : "5 5"}
            />
          </g>
        );
      })}

      <rect x={gateX - 10} y="150" width="20" height="212" rx="10" fill="url(#wide-gate)" opacity="0.35" filter="url(#wide-blur)" />
      <rect x={gateX - 7} y="156" width="14" height="200" rx="7" fill="url(#wide-gate)" />
      <text x={gateX} y="132" textAnchor="middle" className={styles.label} fill="#8fa4d4">
        GATE
      </text>

      <path d={`M${gateX + 12} 256 H 596`} stroke="#4d84ff" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />
      <rect x="596" y="234" width="104" height="44" rx="10" fill="#0a0e1c" stroke="#4d84ff" strokeOpacity="0.7" />
      <text x="648" y="260" textAnchor="middle" className={styles.label} fill="#ffffff">
        COMMIT
      </text>

      <g className={styles.legend}>
        <line x1="16" y1="474" x2="44" y2="474" stroke="#4d84ff" strokeWidth="1.25" />
        <text x="52" y="478" fill="#6b779c">ATTESTED ORIGIN</text>
        <line x1="196" y1="474" x2="224" y2="474" stroke="#7b4dff" strokeWidth="1.25" strokeDasharray="5 5" />
        <text x="232" y="478" fill="#6b779c">UNTRUSTED ORIGIN</text>
      </g>
    </svg>
  );
}

function Narrow() {
  const columns = [46, 130, 214, 298];
  return (
    <svg
      className={styles.narrow}
      viewBox="0 0 344 300"
      role="img"
      aria-label="Four classes of input converge on a single deterministic gate and one path leaves it to commit. Two of the four are drawn dashed to mark untrusted origin."
    >
      <Defs id="narrow" />
      <ellipse cx="172" cy="196" rx="132" ry="60" fill="url(#narrow-halo)" />

      {columns.map((x, index) => {
        const input = INPUTS[index];
        const stroke = input.trusted ? "#4d84ff" : "#7b4dff";
        return (
          <g key={input.label}>
            <rect
              x={x - 34}
              y="18"
              width="68"
              height="34"
              rx="8"
              fill="#0a0e1c"
              stroke={stroke}
              strokeOpacity="0.55"
              strokeDasharray={input.trusted ? undefined : "4 4"}
            />
            <circle cx={x} cy="35" r="3.5" fill={stroke} />
            <path
              d={`M${x} 52 C ${x} 120, 172 130, 172 178`}
              fill="none"
              stroke={stroke}
              strokeWidth="1.15"
              strokeOpacity="0.5"
              strokeDasharray={input.trusted ? undefined : "4 5"}
            />
          </g>
        );
      })}

      <rect x="82" y="178" width="180" height="16" rx="8" fill="url(#narrow-gate)" opacity="0.35" filter="url(#narrow-blur)" />
      <rect x="88" y="181" width="168" height="11" rx="5.5" fill="url(#narrow-gate)" />
      <text x="172" y="170" textAnchor="middle" className={styles.label} fill="#8fa4d4">
        GATE
      </text>

      <path d="M172 194 V 232" stroke="#4d84ff" strokeWidth="1.5" strokeOpacity="0.8" />
      <rect x="122" y="232" width="100" height="38" rx="9" fill="#0a0e1c" stroke="#4d84ff" strokeOpacity="0.7" />
      <text x="172" y="256" textAnchor="middle" className={styles.label} fill="#ffffff">
        COMMIT
      </text>
    </svg>
  );
}

export function ConvergenceScene({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.scene} ${className}`}>
      <Wide />
      <Narrow />
    </div>
  );
}
