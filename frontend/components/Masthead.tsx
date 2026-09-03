"use client";

/**
 * The site header. A real navigation on desktop, a real drawer on a phone.
 *
 * The old header could only be a flex row that wrapped, because a menu needs a
 * media query to hide itself and a click handler to open — neither of which
 * survives inline-style flattening. At 390px the six links wrapped onto two
 * lines and pushed the hero down the page.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { Wordmark } from "./Wordmark";
import styles from "./Masthead.module.css";

export function Masthead() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
   * The drawer closes on the link itself rather than in an effect watching the
   * path. Setting state from an effect after navigation renders the new page
   * once with the drawer still open and then again without it; closing it in
   * the click handler is one render and no flash.
   */
  const close = () => setOpen(false);

  // Stop the page behind the drawer scrolling while it is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <header className={styles.masthead}>
      <div className={`wrap ${styles.inner}`}>
        <Wordmark />

        <nav className={styles.nav} aria-label="Primary">
          {site.nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.link}
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((was) => !was)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className={`${styles.bars} ${open ? styles.barsOpen : ""}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>

      <div id="mobile-nav" className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`} hidden={!open}>
        <nav aria-label="Primary mobile">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.drawerLink}
              onClick={close}
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <a className={styles.drawerEmail} href={`mailto:${site.email}`} onClick={close}>
          {site.email}
        </a>
      </div>
    </header>
  );
}
