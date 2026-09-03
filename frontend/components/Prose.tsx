import styles from "./Prose.module.css";

/**
 * The article body.
 *
 * The HTML arrives from the CMS with its presentation already stripped, so
 * everything here is styled by real CSS: measure, rhythm, hanging figures,
 * scrollable tables, hover on links. On WordPress each of those had to be an
 * inline attribute on every element, or be given up.
 */
export function Prose({ html }: { html: string }) {
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
