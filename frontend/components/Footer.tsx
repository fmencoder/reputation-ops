import Link from "next/link";
import { site } from "@/lib/site";
import { Wordmark } from "./Wordmark";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.identity}>
          <Wordmark size="compact" />
          <p className={styles.blurb}>
            Research and perspectives on intelligent systems and digital infrastructure.
          </p>
          <a className={styles.email} href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </div>

        <nav className={styles.links} aria-label="Footer">
          {site.nav.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={`wrap ${styles.base}`}>
        <p>
          © {new Date().getFullYear()} {site.name}. Written by {site.author.name}.
        </p>
      </div>
    </footer>
  );
}
