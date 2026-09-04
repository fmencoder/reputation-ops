/**
 * The environment the portrait sits in.
 *
 * The brief on the portrait has not changed: it is the supplied file, and it is
 * not regenerated, retouched or replaced. What was missing was everything
 * around it — the photograph was floating on a dark rectangle, so the page read
 * as a personal site rather than as the masthead of an engineered publication.
 *
 * This puts it inside a measured field: coordinate arcs, a sparse node lattice
 * and two corner brackets, all held back to a low opacity. The human stays the
 * subject; the system is what he is standing in.
 */
import { INK, STROKE } from "./system";
import styles from "./PortraitField.module.css";

const NODES = [
  [38, 66], [96, 34], [150, 78], [206, 44], [258, 92],
  [26, 156], [88, 196], [162, 168], [232, 208], [268, 148],
  [58, 262], [128, 288], [204, 268], [252, 314], [92, 336],
] as const;

export function PortraitField() {
  return (
    <svg className={styles.field} viewBox="0 0 300 380" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <radialGradient id="portrait-light" cx="72%" cy="18%" r="72%">
          <stop offset="0%" stopColor={INK.primary} stopOpacity="0.2" />
          <stop offset="100%" stopColor={INK.primary} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="300" height="380" fill="url(#portrait-light)" />

      {[92, 148, 204, 260].map((r) => (
        <circle
          key={r}
          cx="216"
          cy="70"
          r={r}
          fill="none"
          stroke={INK.primary}
          strokeOpacity="0.12"
          strokeWidth={STROKE.field}
        />
      ))}

      {NODES.map(([x, y], index) => {
        const next = NODES[index + 1];
        return (
          <g key={index}>
            {next ? (
              <line x1={x} y1={y} x2={next[0]} y2={next[1]} stroke={INK.primary} strokeOpacity="0.14" strokeWidth={STROKE.field} />
            ) : null}
            <circle cx={x} cy={y} r={index % 5 === 0 ? 2.5 : 1.5} fill={index % 4 === 0 ? INK.accent : INK.primary} fillOpacity="0.45" />
          </g>
        );
      })}

      <path d="M14 44 V14 H44" fill="none" stroke={INK.primary} strokeOpacity="0.4" strokeWidth={STROKE.relation} />
      <path d="M286 336 V366 H256" fill="none" stroke={INK.accent} strokeOpacity="0.35" strokeWidth={STROKE.relation} />
    </svg>
  );
}
