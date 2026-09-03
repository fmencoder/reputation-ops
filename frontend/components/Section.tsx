import styles from "./Section.module.css";
import { GridField } from "./graphics/GridField";

/**
 * A page section with an optional graphic environment behind it.
 *
 * Sections carry their own field rather than the page carrying one background,
 * so the visual density can change down the page — dense at the hero, quiet
 * through the reading, architectural again at the manifesto.
 */
export function Section({
  children,
  field,
  tone = "section",
  bordered = false,
  size = "default",
  id,
}: {
  children: React.ReactNode;
  field?: boolean;
  tone?: "hero" | "section" | "quiet";
  bordered?: boolean;
  size?: "default" | "tight" | "loose";
  id?: string;
}) {
  return (
    <section id={id} className={`${styles.section} ${styles[size]} ${bordered ? styles.bordered : ""}`}>
      {field ? <GridField tone={tone} /> : null}
      <div className={`wrap ${styles.inner}`}>{children}</div>
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className={styles.label}>{children}</h2>;
}
