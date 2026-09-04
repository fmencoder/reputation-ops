/**
 * A close view of the gate, for the Technology opening.
 *
 * The home landscape shows the whole topology and the stack map shows the
 * layers; this is the instrument. Three obligations are evaluated against one
 * request — authorization, limits, and an invariant — and the boundary holds
 * until all three clear. Two clear, one holds, and the request is stopped: the
 * drawing shows the case that matters rather than the case that flatters.
 *
 * Same grammar as everything else on the site — blue for what is attested,
 * violet dashed for what is not, one halo, one governed path — so it reads as
 * another view of one system rather than another picture.
 */
import { INK, STROKE, DASH, SceneDefs, Node } from "./system";
import styles from "./BoundaryDetail.module.css";

const CHECKS = [
  { label: "Authorization", clears: true },
  { label: "Limits", clears: true },
  { label: "Invariant", clears: false },
] as const;

export function BoundaryDetail() {
  const gate = 348;
  const rows = [96, 168, 240];

  return (
    <div className={styles.detail}>
      <svg
        className={styles.svg}
        viewBox="0 0 480 340"
        role="img"
        aria-label="A close view of the deterministic gate. One request is evaluated against three obligations — authorization, limits and an invariant. Authorization and limits clear; the invariant holds, and the request is stopped at the boundary rather than reaching execution."
      >
        <SceneDefs id="bd" />
        <rect width="480" height="340" fill="url(#bd-mesh)" opacity="0.45" />
        <circle cx={gate} cy="168" r="132" fill="url(#bd-halo)" />

        <text x="24" y="46" className={styles.label} fill={INK.textDim}>
          ONE REQUEST · THREE OBLIGATIONS
        </text>

        <Node x={40} y={168} r={6} lit />
        <path d="M48 168 H 84" stroke={INK.primary} strokeWidth={STROKE.governed} strokeOpacity="0.85" />

        {CHECKS.map((check, index) => {
          const y = rows[index];
          const colour = check.clears ? INK.primary : INK.accent;
          return (
            <g key={check.label}>
              <path
                d={`M84 168 C 118 168, 118 ${y}, 152 ${y}`}
                fill="none"
                stroke={colour}
                strokeWidth={STROKE.path}
                strokeOpacity="0.55"
              />
              <rect
                x="152"
                y={y - 17}
                width="124"
                height="34"
                rx="8"
                fill={INK.panel}
                stroke={colour}
                strokeOpacity="0.6"
                strokeWidth={STROKE.relation}
                strokeDasharray={check.clears ? undefined : DASH.untrusted}
              />
              <text x="166" y={y + 4} className={styles.label} fill={INK.text}>
                {check.label.toUpperCase()}
              </text>
              <path
                d={`M276 ${y} H ${gate - 10}`}
                fill="none"
                stroke={colour}
                strokeWidth={STROKE.path}
                strokeOpacity={check.clears ? 0.7 : 0.5}
                strokeDasharray={check.clears ? undefined : DASH.untrusted}
              />
              <text x={gate - 16} y={y - 12} textAnchor="end" className={styles.state} fill={colour}>
                {check.clears ? "CLEARS" : "HOLDS"}
              </text>
            </g>
          );
        })}

        <rect x={gate - 10} y="46" width="20" height="248" rx="10" fill="url(#bd-rise)" opacity="0.32" filter="url(#bd-bloom)" />
        <rect x={gate - 6} y="52" width="12" height="236" rx="6" fill="url(#bd-rise)" />
        <text x={gate} y="34" textAnchor="middle" className={styles.label} fill={INK.textBright}>
          BOUNDARY
        </text>

        {/* Nothing crosses. The path beyond the gate is drawn, and empty. */}
        <path d={`M${gate + 12} 168 H 404`} stroke={INK.edgeLit} strokeWidth={STROKE.path} strokeDasharray={DASH.boundary} />
        <rect x="404" y="146" width="44" height="44" rx="8" fill={INK.panel} stroke={INK.edge} strokeWidth={STROKE.relation} />
        <text x="426" y="212" textAnchor="middle" className={styles.state} fill={INK.textMuted}>
          NOT REACHED
        </text>
      </svg>
    </div>
  );
}
