/**
 * A quiet network field for section headers.
 *
 * Deterministic by construction — the node positions come from a fixed seed, so
 * the same markup renders on the server and the client and the field never
 * changes between deploys. Random positions would hydrate differently every
 * request and flag as a mismatch.
 */
import styles from "./NodeWeb.module.css";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function NodeWeb({ seed = 20260902, className = "" }: { seed?: number; className?: string }) {
  const random = mulberry32(seed);
  const nodes = Array.from({ length: 26 }, () => ({
    x: Math.round(random() * 1200),
    y: Math.round(random() * 220),
    r: 1 + Math.round(random() * 2),
  }));

  const edges: [number, number][] = [];
  nodes.forEach((node, index) => {
    nodes.slice(index + 1).forEach((other, offset) => {
      const distance = Math.hypot(node.x - other.x, node.y - other.y);
      if (distance < 210) edges.push([index, index + 1 + offset]);
    });
  });

  return (
    <svg
      className={`${styles.web} ${className}`}
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {edges.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          stroke="#4d84ff"
          strokeOpacity="0.16"
          strokeWidth="0.75"
        />
      ))}
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={index % 5 === 0 ? "#7b4dff" : "#4d84ff"}
          fillOpacity="0.5"
        />
      ))}
    </svg>
  );
}
