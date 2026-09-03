/**
 * The masthead lockup: the angular N mark, NOVRA dominant, INTELLIGENCE
 * directly beneath in electric blue. Identical on every page.
 *
 * The mark is inline SVG rather than an uploaded image — WordPress stripped
 * inline SVG and rejected SVG uploads, which is why the old site shipped a
 * raster of a shape that is 400 bytes of vector.
 */
import Link from "next/link";
import { site } from "@/lib/site";
import styles from "./Wordmark.module.css";

export function Wordmark({ size = "default" }: { size?: "default" | "compact" }) {
  return (
    <Link href="/" className={`${styles.brand} ${size === "compact" ? styles.compact : ""}`} aria-label={`${site.name} home`}>
      <svg className={styles.mark} viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="nmark" x1="0" y1="48" x2="48" y2="0">
            <stop offset="0%" stopColor="#2f6bff" />
            <stop offset="52%" stopColor="#4058e8" />
            <stop offset="100%" stopColor="#7b4dff" />
          </linearGradient>
        </defs>
        <path d="M4 45V3h9.6v42H4z" fill="#4d84ff" />
        <path d="M13.6 3h9.6l12.6 19.4V3H45v42h-9.6L22.8 25.6V45h-9.2V3z" fill="url(#nmark)" />
      </svg>
      <span className={styles.lockup}>
        <span className={styles.name}>{site.wordmark}</span>
        <span className={styles.suffix}>{site.suffix}</span>
      </span>
    </Link>
  );
}
