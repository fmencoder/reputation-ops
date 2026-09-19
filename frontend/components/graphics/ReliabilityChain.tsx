/**
 * Compounding reliability across a chained system.
 *
 * This replaces a decorative rail that sat under a caption claiming it showed
 * a reliability budget. It did not — it is explicitly ornamental — and a
 * drawing that is captioned as evidence has to carry the evidence.
 *
 * Everything plotted here is arithmetic on a stated assumption, not a measured
 * claim about any system: end-to-end success is the per-step success rate
 * raised to the number of steps. At 99% per step, fifty steps end at 60.5%.
 * That is the whole argument of the reliability-budget piece, and it is the
 * reason tuning a single step is the wrong lever.
 */
import { INK, STROKE } from "./system";
import styles from "./ReliabilityChain.module.css";

const STEPS = 50;
const PER_STEP = 0.99;

/* Plot frame. */
const X0 = 62;
const X1 = 496;
const Y_TOP = 44;
const Y_BOTTOM = 232;
/** The vertical axis runs 100% down to 50%; the curve never leaves that band. */
const HIGH = 1;
const LOW = 0.5;

const x = (step: number) => X0 + (step / STEPS) * (X1 - X0);
const y = (p: number) => Y_TOP + ((HIGH - p) / (HIGH - LOW)) * (Y_BOTTOM - Y_TOP);

const curve = Array.from({ length: STEPS + 1 }, (_, step) => {
  const p = PER_STEP ** step;
  return `${x(step).toFixed(1)},${y(p).toFixed(1)}`;
}).join(" ");

/** The three readings the caption refers to, computed rather than written in. */
const MARKS = [10, 25, 50].map((step) => ({
  step,
  p: PER_STEP ** step,
}));

const GRID = [1, 0.9, 0.8, 0.7, 0.6, 0.5];

export function ReliabilityChain() {
  return (
    <svg
      className={styles.figure}
      viewBox="0 0 540 300"
      role="img"
      aria-label={
        "A decay curve showing end-to-end success rate against the number of chained steps, " +
        "assuming each step succeeds 99% of the time. Ten steps end at 90.4%, twenty-five at 77.8%, " +
        "and fifty at 60.5%."
      }
    >
      <defs>
        <linearGradient id="rc-curve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={INK.primary} />
          <stop offset="100%" stopColor={INK.accent} />
        </linearGradient>
        <linearGradient id="rc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.primaryDeep} stopOpacity="0.22" />
          <stop offset="100%" stopColor={INK.primaryDeep} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal rules, read against the axis labels on the left. */}
      {GRID.map((p) => (
        <g key={p}>
          <line
            x1={X0}
            y1={y(p)}
            x2={X1}
            y2={y(p)}
            stroke={INK.edge}
            strokeWidth={STROKE.field}
          />
          <text x={X0 - 10} y={y(p) + 3.5} className={styles.axis} textAnchor="end">
            {Math.round(p * 100)}%
          </text>
        </g>
      ))}

      {/* The area under the curve, so the loss reads as volume not just a line. */}
      <polygon points={`${x(0)},${Y_BOTTOM} ${curve} ${x(STEPS)},${Y_BOTTOM}`} fill="url(#rc-fill)" />

      <polyline
        points={curve}
        fill="none"
        stroke="url(#rc-curve)"
        strokeWidth={STROKE.governed}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {MARKS.map((mark) => (
        <g key={mark.step}>
          <line
            x1={x(mark.step)}
            y1={y(mark.p)}
            x2={x(mark.step)}
            y2={Y_BOTTOM}
            stroke={INK.edgeLit}
            strokeWidth={STROKE.relation}
            strokeDasharray="3 4"
          />
          <circle cx={x(mark.step)} cy={y(mark.p)} r="4.5" fill={INK.void} stroke={INK.primary} strokeWidth="1.6" />
          <text
            x={x(mark.step)}
            y={y(mark.p) - 12}
            className={styles.reading}
            textAnchor={mark.step === STEPS ? "end" : "middle"}
          >
            {(mark.p * 100).toFixed(1)}%
          </text>
        </g>
      ))}

      {/* Baseline and the step axis. */}
      <line x1={X0} y1={Y_BOTTOM} x2={X1} y2={Y_BOTTOM} stroke={INK.edgeLit} strokeWidth={STROKE.relation} />
      {[0, 10, 25, 50].map((step) => (
        <text key={step} x={x(step)} y={Y_BOTTOM + 20} className={styles.axis} textAnchor="middle">
          {step}
        </text>
      ))}
      <text x={(X0 + X1) / 2} y={Y_BOTTOM + 42} className={styles.axisLabel} textAnchor="middle">
        CHAINED STEPS
      </text>
      {/* Anchored from the left edge: anchoring it to the axis pushed the
          label off the viewBox and it shipped clipped. */}
      <text x={6} y={Y_TOP - 18} className={styles.axisLabel} textAnchor="start">
        END-TO-END SUCCESS
      </text>
      <text x={X1} y={Y_TOP - 18} className={styles.note} textAnchor="end">
        assuming 99% per step
      </text>
    </svg>
  );
}
