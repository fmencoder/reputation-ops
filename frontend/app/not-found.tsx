import Link from "next/link";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";

export default function NotFound() {
  return (
    <Section field tone="hero">
      <Eyebrow>404</Eyebrow>
      <h1 style={{ marginTop: "var(--s-5)", fontSize: "var(--fs-h1)", letterSpacing: "var(--tracking-display)" }}>
        That page is not here.
      </h1>
      <p style={{ marginTop: "var(--s-5)", color: "var(--text-muted)", maxWidth: "48ch" }}>
        Every article published here keeps its original address. If you followed a link that should
        work, the <Link href="/insights/" style={{ color: "var(--accent-bright)" }}>insights index</Link> lists
        everything.
      </p>
    </Section>
  );
}
