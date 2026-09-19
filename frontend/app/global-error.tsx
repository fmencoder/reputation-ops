"use client";

/**
 * The boundary of last resort: an error thrown in the root layout itself.
 *
 * It replaces <html> and <body>, which means none of the site's stylesheet,
 * tokens or font are loaded when it renders. Everything it needs is therefore
 * either inline or in the .bare rules, and it links rather than routes, because
 * the router is part of what may have failed.
 */
import styles from "./fallback.module.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body className={styles.bare}>
        <div className={styles.bareInner}>
          <h1 className={styles.bareHeading}>NOVRA Intelligence is temporarily unavailable.</h1>
          <p className={styles.bareBody}>
            This page could not be rendered. Reloading usually resolves it.
            {error.digest ? <> Reference: {error.digest}.</> : null}
          </p>
          <p className={styles.bareBody}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                a client-side <Link> navigates with the router, and the router
                is inside the tree that just failed. A plain anchor forces a
                full document load, which is the only thing guaranteed to work
                from here. */}
            <a href="/" className={styles.bareLink}>
              Return to the homepage
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
