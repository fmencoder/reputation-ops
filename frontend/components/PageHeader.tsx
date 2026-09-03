import type { Headline } from "@/lib/cms/types";
import { Eyebrow, Rule } from "./Eyebrow";
import { GridField } from "./graphics/GridField";
import styles from "./PageHeader.module.css";

/**
 * The standard page opening.
 *
 * The headline is set in sentence case. WordPress got uppercase because the
 * flattener could not vary type by breakpoint and uppercase held its shape at
 * every width; with real media queries the type can be set the way the
 * references actually set it.
 */
export function PageHeader({
  eyebrow,
  headline,
  lead,
  aside,
  below,
  wide = false,
}: {
  eyebrow: string;
  headline: Headline;
  lead: string;
  aside?: React.ReactNode;
  below?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <header className={`${styles.header} ${aside ? styles.split : ""}`}>
      <GridField tone="hero" />
      <div className={`wrap ${styles.inner}`}>
        <div className={`${styles.copy} ${wide ? styles.wide : ""}`}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className={styles.headline}>
            {headline.lead}{" "}
            {headline.accent ? <span className={styles.accent}>{headline.accent}</span> : null}
          </h1>
          <Rule />
          <p className={styles.lead}>{lead}</p>
          {below}
        </div>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
      </div>
    </header>
  );
}
