/**
 * The architectural ground the pages sit on.
 *
 * Three layers: a ruled grid that gives the page a measured field, a soft
 * radial light that decides where the eye lands, and a hairline horizon. None
 * of this was expressible on WordPress — a background layer needs a stacking
 * context, a pseudo-element and a mask, and the flattener could carry none of
 * them — which is why the old pages read as flat panels of colour.
 */
import styles from "./GridField.module.css";

type Tone = "hero" | "section" | "quiet";

export function GridField({
  tone = "section",
  className = "",
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`${styles.field} ${styles[tone]} ${className}`} aria-hidden="true">
      <svg className={styles.grid} width="100%" height="100%" role="presentation">
        <defs>
          <pattern id={`grid-${tone}`} width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0v64" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <pattern id={`grid-fine-${tone}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0v16" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-fine-${tone})`} opacity="0.35" />
        <rect width="100%" height="100%" fill={`url(#grid-${tone})`} />
      </svg>
      <span className={styles.glow} />
      <span className={styles.horizon} />
    </div>
  );
}
