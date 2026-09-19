import Link from "next/link";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import styles from "./fallback.module.css";

export default function NotFound() {
  return (
    <Section field tone="hero">
      <Eyebrow>404</Eyebrow>
      <h1 className={styles.heading}>That page is not here.</h1>
      <p className={styles.body}>
        Every article published here keeps its original address. If you followed a link that should
        work, the <Link href="/insights/" className={styles.link}>insights index</Link> lists
        everything.
      </p>
    </Section>
  );
}
