import Link from "next/link";
import { getArticles, getPages } from "@/lib/cms";
import { Button } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { ArticleCard } from "@/components/ArticleCard";
import { DomainGrid } from "@/components/DomainGrid";
import { GridField } from "@/components/graphics/GridField";
import { BrandImage } from "@/components/BrandImage";
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
            {/* The board sets the headline in three lines, one sentence each.
                Leaving that to the wrapping algorithm made it depend on the
                font metrics at each breakpoint, and it broke to five lines on
                every wide viewport. The sentences are their own blocks so the
                composition holds at any width; below 620px they wrap inside
                their own line rather than across each other. */}
            <h1 className={styles.headline}>
              {home.headline.lead
                .split(/(?<=\.)\s+/)
                .map((sentence) => (
                  <span key={sentence} className={styles.headlineLine}>
                    {sentence}
                  </span>
                ))}
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

          {/* The artwork carries no labels and is not explained beneath it. It is
              the environment the page opens in, and it runs past the right edge
              of the frame rather than sitting inside a bordered plate. */}
          <div className={styles.scene}>
            <BrandImage
              name="home-earth"
              alt="Earth at night seen from space, the Western Hemisphere lit by a network of connected points."
              priority
              sizes="(min-width: 1024px) 62vw, 100vw"
            />
          </div>
        </div>
      </section>

      <Section bordered size="tight" field tone="quiet">
        <h2 className="sr-only">Areas of focus</h2>
        <div className={styles.domains}>
          <DomainGrid domains={home.domains} descriptors={descriptors} />
        </div>
      </Section>

      {/* The pathway the institutional positioning needs, placed after the
          approved hero and domain strip so neither is altered to make room. */}
      <Section bordered>
        <div className={styles.institutional}>
          <div>
            <SectionLabel>{home.institutional.label}</SectionLabel>
            <h3 className={styles.institutionalHeading}>{home.institutional.heading}</h3>
            <p className={styles.institutionalBody}>{home.institutional.body}</p>
          </div>
          <ul className={styles.pathways}>
            {home.institutional.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.pathway}>
                  <span className={styles.pathwayLabel}>{link.label}</span>
                  <span className={styles.pathwayNote}>{link.note}</span>
                  <span className={styles.pathwayArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
