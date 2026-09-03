/**
 * A vertical architecture motif for the long reading columns.
 *
 * Prose on a wide screen leaves half the grid empty; the reference
 * compositions fill that space with structure rather than with more words.
 * This is decorative and hidden from assistive technology — it carries no
 * information the text does not.
 */
import styles from "./ArchitectureRail.module.css";

export function ArchitectureRail({ nodes = 7 }: { nodes?: number }) {
  const spacing = 96;
  const height = spacing * nodes;
  return (
    <svg
      className={styles.rail}
      viewBox={`0 0 240 ${height}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rail-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d84ff" stopOpacity="0" />
          <stop offset="18%" stopColor="#4d84ff" stopOpacity="0.55" />
          <stop offset="82%" stopColor="#7b4dff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7b4dff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="120" y1="0" x2="120" y2={height} stroke="url(#rail-line)" strokeWidth="1.25" />

      {Array.from({ length: nodes }, (_, index) => {
        const y = spacing * (index + 0.5);
        const wide = index % 2 === 0;
        const reach = wide ? 76 : 44;
        return (
          <g key={index}>
            <line
              x1="120"
              y1={y}
              x2={index % 2 === 0 ? 120 + reach : 120 - reach}
              y2={y}
              stroke="#4d84ff"
              strokeOpacity="0.28"
              strokeWidth="1"
            />
            <circle
              cx={index % 2 === 0 ? 120 + reach : 120 - reach}
              cy={y}
              r={wide ? 3 : 2}
              fill={index % 3 === 0 ? "#7b4dff" : "#4d84ff"}
              fillOpacity="0.65"
            />
            <circle cx="120" cy={y} r="4" fill="#05070f" stroke="#4d84ff" strokeOpacity="0.7" />
          </g>
        );
      })}
    </svg>
  );
}
