import Link from "next/link";
import { getArticles, getPages } from "@/lib/cms";
import { Button } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { ArticleCard } from "@/components/ArticleCard";
import { DomainGrid } from "@/components/DomainGrid";
import { GridField } from "@/components/graphics/GridField";
import { ConvergenceScene } from "@/components/graphics/ConvergenceScene";
import { Section, SectionLabel } from "@/components/Section";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "NOVRA Intelligence — Intelligent systems. Digital infrastructure.",
  description:
    "Research and perspectives on artificial intelligence, autonomous systems, blockchain infrastructure, financial technology, and the emerging digital systems shaping the future.",
  path: "/",
});

export default async function HomePage() {
  const [pages, articles] = await Promise.all([getPages(), getArticles()]);
  const { home, technology } = pages;
  const latest = articles.slice(0, 3);

  /*
   * The domain strip carries the descriptors already published on the
   * Technology page rather than a fresh sentence written for the home page.
   * One approved description per domain, in one place, used in both.
   */
  const descriptors = Object.fromEntries(
    technology.cards.map((card) => [card.title, card.body]),
  );

  return (
    <>
      <section className={styles.hero}>
        <GridField tone="hero" />
        <div className={`wrap ${styles.heroInner}`}>
          <div>
            <Eyebrow>{home.eyebrow}</Eyebrow>
            <h1 className={styles.headline}>
              {home.headline.lead}{" "}
              <span className={styles.headlineAccent}>{home.headline.accent}</span>
            </h1>
            <p className={styles.lead}>{home.lead}</p>
            <div className={styles.actions}>
              <Button href="/insights/">Explore insights →</Button>
              <Button href="/research/" variant="ghost">
                View research
              </Button>
            </div>
          </div>

          <figure className={styles.scene}>
            <div className={styles.plate}>
              <ConvergenceScene />
            </div>
            <figcaption className={styles.caption}>
              Four classes of input converge on one deterministic gate. Nothing commits without
              passing it.
            </figcaption>
          </figure>
        </div>
      </section>

      <Section bordered size="tight" field tone="quiet">
        <h2 className="sr-only">Areas of focus</h2>
        <div className={styles.domains}>
          <DomainGrid domains={home.domains} descriptors={descriptors} />
        </div>
      </Section>

      <Section bordered>
        <div className={styles.latest}>
          <SectionLabel>From the publication</SectionLabel>
          {latest[0] ? <ArticleCard article={latest[0]} feature /> : null}
          <div className={styles.latestGrid}>
            {latest.slice(1).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <p className={styles.more}>
            <Link href="/insights/" className={styles.moreLink}>
              All insights →
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
