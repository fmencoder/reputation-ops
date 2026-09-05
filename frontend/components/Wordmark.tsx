/**
 * The masthead lockup: the angular NOVRA N, then NOVRA over INTELLIGENCE.
 *
 * The mark is the ribbon N from the approved board, not the flat letterform
 * that stood in for it. Three angular strokes — a left post, a diagonal that
 * runs the full height, and a right post — cut so the diagonal passes in front
 * of one post and behind the other. That overlap is the whole identity: it is
 * what makes the silhouette distinctive at 26px and what a plain N does not
 * have. Blue at the top left, electric blue through the middle, restrained
 * violet at the foot.
 *
 * Inline SVG rather than an uploaded image — WordPress stripped inline SVG and
 * rejected SVG uploads, which is why the old site shipped a raster of a shape
 * that is a few hundred bytes of vector.
 */
import Link from "next/link";
import { site } from "@/lib/site";
import styles from "./Wordmark.module.css";

export function Wordmark({ size = "default" }: { size?: "default" | "compact" }) {
  const id = `nmark-${size}`;
  return (
    <Link
      href="/"
      className={`${styles.brand} ${size === "compact" ? styles.compact : ""}`}
      aria-label={`${site.name} home`}
    >
      <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-post`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b93ff" />
            <stop offset="100%" stopColor="#2f6bff" />
          </linearGradient>
          <linearGradient id={`${id}-band`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#6aa4ff" />
            <stop offset="46%" stopColor="#4d84ff" />
            <stop offset="100%" stopColor="#7b4dff" />
          </linearGradient>
          <linearGradient id={`${id}-rear`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f7bff" />
            <stop offset="100%" stopColor="#7b4dff" />
          </linearGradient>
        </defs>

        {/* Right post, behind the diagonal. */}
        <path d="M44 4h16v56H44V4z" fill={`url(#${id}-rear)`} />
        {/* The diagonal, cut away where the right post passes in front of it. */}
        <path d="M4 4h15l25 34V4h0v56h-1L19 26v34H4V4z" fill={`url(#${id}-band)`} />
        {/* Left post, in front of the diagonal. */}
        <path d="M4 4h15v56H4V4z" fill={`url(#${id}-post)`} />
        {/* The seam where the diagonal slips behind the right post. */}
        <path d="M44 38v22h-1L33 46l11-8z" fill="#0a1024" fillOpacity="0.34" />
      </svg>
      <span className={styles.lockup}>
        <span className={styles.name}>{site.wordmark}</span>
        <span className={styles.suffix}>{site.suffix}</span>
      </span>
    </Link>
  );
}
