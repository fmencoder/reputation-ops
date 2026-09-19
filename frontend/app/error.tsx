"use client";

/**
 * Route-level error boundary.
 *
 * Every page here is prerendered, so this is not a busy path — but "not busy"
 * is not "unreachable". The masthead is a client component, and a hydration or
 * runtime failure inside it would otherwise be shown to a visitor as the
 * framework's own error screen, which is unstyled, says nothing useful, and on
 * an institutional site reads as a broken deployment.
 *
 * It deliberately does not render the error message. A message can carry a
 * path, a stack frame or a dependency name, none of which helps the reader and
 * all of which is information the page does not need to publish.
 */
import { useEffect } from "react";
import Link from "next/link";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import styles from "./fallback.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /*
     * The console is the only sink configured today — no Sentry, no third-party
     * reporter, on purpose. The digest is what Vercel's runtime logs key on, so
     * printing it is what makes a report from a visitor traceable to a build.
     */
    console.error("Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <Section field tone="hero">
      <Eyebrow>Error</Eyebrow>
      <h1 className={styles.heading}>Something went wrong on this page.</h1>
      <p className={styles.body}>
        The page failed to render. Nothing was lost and nothing was sent. Try again, or go back to
        the <Link href="/" className={styles.link}>homepage</Link>.
        {error.digest ? <> Reference: <code>{error.digest}</code>.</> : null}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.retry} onClick={reset}>
          Try again
        </button>
      </div>
    </Section>
  );
}
