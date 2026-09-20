import type { Metadata } from "next";
import { site } from "@/lib/site";
import styles from "./page.module.css";

/*
 * Temporary internal comparison. Not linked from anywhere, not in the nav, not
 * in the sitemap (which is built from site.nav), and marked noindex — it exists
 * so the founder can look at four marks side by side under real conditions and
 * say which one, if any, replaces the current N.
 *
 * Nothing here touches the production mark. That is components/Wordmark.tsx and
 * it is unchanged; the "current" tile on this page renders a copy of it from
 * public/brand/n-current.svg so all four sit in identical frames.
 *
 * The lockup type below is a replication of Wordmark.module.css, value for
 * value, not an import of it — the point is to see a candidate N against the
 * approved wordmark without editing the approved wordmark.
 */
export const metadata: Metadata = {
  title: "N monogram — internal comparison",
  robots: { index: false, follow: false },
};

const OPTIONS = [
  {
    id: "current",
    label: "Current",
    file: "/brand/n-current.svg",
    note: "In production today. Three strokes with the diagonal passing in front of one post and behind the other; the span reads lighter than the posts it joins, and the foot runs to violet.",
  },
  {
    id: "a",
    label: "Option A — Institutional Evolution",
    file: "/brand/n-option-a.svg",
    note: "The same silhouette, squared up. The span is widened to 15.4 units so its perpendicular thickness is exactly the posts' 14, every join is mitred flush, and the violet foot becomes indigo. Depth is three tones and nothing else.",
  },
  {
    id: "b",
    label: "Option B — Convergence",
    file: "/brand/n-option-b.svg",
    note: "Two surfaces rather than three strokes: the near post and the span are one continuous plane, the far post is the other, and they meet along a single mitre. The tonal step across that seam is the only thing describing depth.",
  },
  {
    id: "c",
    label: "Option C — Global Intelligence",
    file: "/brand/n-option-c.svg",
    note: "One closed figure, divided on the diagonal it is already built from. A taller frame and a finer stroke than A and B, with counters congruent under a half turn — the same object read from either end.",
  },
] as const;

/** The approved lockup's type, replicated so a candidate can be seen beside it. */
function Lockup({ file }: { file: string }) {
  return (
    <span className={styles.brand}>
      {/* eslint-disable-next-line @next/next/no-img-element --
          These are standalone SVG files being compared as files. next/image
          will not serve an SVG without dangerouslyAllowSVG, and turning that
          on in next.config for a temporary review page is not a trade worth
          making. */}
      <img src={file} alt="" className={styles.lockMark} width={34} height={34} />
      <span>
        <span className={styles.name}>{site.wordmark}</span>
        <span className={styles.suffix}>{site.suffix}</span>
      </span>
    </span>
  );
}

const SIZES = [
  { px: 34, caption: "Desktop header (34px)" },
  { px: 30, caption: "Mobile header (30px)" },
  { px: 26, caption: "Footer compact (26px)" },
  { px: 16, caption: "Favicon (16px)" },
];

export default function BrandReviewPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Internal review — not published</p>
        <h1 className={styles.title}>N monogram comparison</h1>
        <p className={styles.lead}>
          Four marks under real conditions: the site&rsquo;s own background, the
          real header sizes, and the approved NOVRA INTELLIGENCE wordmark. The
          production mark is unchanged and no option has been selected — this
          page exists to be looked at, not to ship anything.
        </p>
      </header>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>1 — Standalone</h2>
        <div className={styles.row}>
          {OPTIONS.map((o) => (
            <figure key={o.id} className={styles.cell}>
              {/* eslint-disable-next-line @next/next/no-img-element -- see Lockup */}
              <img src={o.file} alt={`${o.label} monogram`} className={styles.hero} width={160} height={160} />
              <figcaption>
                <p className={styles.cellLabel}>{o.label}</p>
                <p className={styles.cellNote}>{o.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>2 — At the sizes it actually ships</h2>
        <div className={styles.row}>
          {OPTIONS.map((o) => (
            <div key={o.id} className={styles.cell}>
              <div className={styles.sizes}>
                {SIZES.map((s) => (
                  <div key={s.px} className={styles.sizeItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- see Lockup */}
                    <img src={o.file} alt="" width={s.px} height={s.px} style={{ width: s.px, height: s.px }} />
                    <span className={styles.sizeCaption}>{s.px}px</span>
                  </div>
                ))}
              </div>
              <p className={styles.cellLabel}>{o.label}</p>
            </div>
          ))}
        </div>
        <p className={styles.footnote}>
          {SIZES.map((s) => s.caption).join(" · ")}
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>3 — Beside the wordmark</h2>
        <div className={styles.lockups}>
          {OPTIONS.map((o) => (
            <div key={o.id} className={styles.lockupRow}>
              <Lockup file={o.file} />
              <span className={styles.lockupLabel}>{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>4 — Favicon / app icon</h2>
        <div className={styles.favRow}>
          {OPTIONS.map((o) => (
            <div key={o.id} className={styles.favCell}>
              <div className={styles.favTile}>
                {/* eslint-disable-next-line @next/next/no-img-element -- see Lockup */}
                <img src={o.file} alt="" width={16} height={16} />
              </div>
              <div className={styles.favTile}>
                {/* eslint-disable-next-line @next/next/no-img-element -- see Lockup */}
                <img src={o.file} alt="" width={32} height={32} />
              </div>
              <span className={styles.lockupLabel}>{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.footnote}>
        All four are vector SVG in <code>public/brand/</code>. Nothing on this
        page is referenced by the site.
      </p>
    </div>
  );
}
