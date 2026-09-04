import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/cms";
import { Prose } from "@/components/Prose";
import { Section, SectionLabel } from "@/components/Section";
import { ArticleCard } from "@/components/ArticleCard";
import { GridField } from "@/components/graphics/GridField";
import { ArticleArt, hasArticleArt } from "@/components/graphics/ArticleArt";
import { JsonLd } from "@/components/JsonLd";
import { articleMetadata, articleSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import styles from "./page.module.css";

/*
 * The dated path is the published URL and does not change. It is matched
 * segment by segment rather than by slug alone so that a request for the right
 * article at the wrong date is a 404 rather than a second URL serving the same
 * piece.
 */
type Params = { year: string; month: string; day: string; slug: string };

const pathFor = (params: Params) =>
  `/${params.year}/${params.month}/${params.day}/${params.slug}/`;

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => {
    const [, year, month, day, slug] = article.path.split("/");
    return { year, month, day, slug };
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const article = await getArticle(pathFor(await params));
  if (!article) return {};
  return articleMetadata(article);
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const article = await getArticle(pathFor(resolved));
  if (!article) notFound();

  const others = (await getArticles()).filter((other) => other.id !== article.id).slice(0, 2);

  return (
    <>
      <article className={styles.article}>
        <GridField tone="quiet" />
        <div className={`wrap ${styles.inner}`}>
          <header>
            <p className={styles.kicker}>{article.topic}</p>
            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.standfirst}>{article.excerpt}</p>
            <div className={styles.byline}>
              <Link href="/about/#fredrick-mendez" className={styles.bylineName} rel="author">
                {site.author.name}
              </Link>
              <span aria-hidden="true">·</span>
              <time dateTime={article.dateMachine}>{article.dateDisplay}</time>
              <span aria-hidden="true">·</span>
              <span>{article.readingTime}</span>
            </div>
          </header>

          {hasArticleArt(article.slug) ? (
            <figure className={styles.hero}>
              <ArticleArt slug={article.slug} />
              <figcaption className={styles.heroCaption}>
                {article.hero.caption ?? article.hero.alt}
              </figcaption>
            </figure>
          ) : null}

          <div className={styles.body}>
            <Prose html={article.bodyHtml} />
          </div>

          {article.sources.length ? (
            <aside className={styles.sources}>
              <h2 className={styles.sourcesHeading}>Sources</h2>
              <ol className={styles.sourceList}>
                {article.sources.map((source) => (
                  <li key={source.url || source.text} className={styles.source}>
                    <span>
                      {source.text}
                      {source.url ? (
                        <a className={styles.sourceLink} href={source.url} rel="noopener nofollow">
                          {source.url}
                        </a>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          ) : null}

          <aside className={styles.authorBox}>
            <p className={styles.kicker}>Written by</p>
            <h2 className={styles.sourcesHeading} style={{ marginTop: "var(--s-3)" }}>
              <Link href="/about/#fredrick-mendez" className={styles.bylineName}>
                {site.author.name}
              </Link>
            </h2>
            <p style={{ color: "var(--text-muted)" }}>{site.author.descriptor}</p>
          </aside>
        </div>
      </article>

      <Section bordered>
        <div className={styles.related}>
          <SectionLabel>Related insights</SectionLabel>
          <div className={styles.relatedGrid}>
            {others.map((other) => (
              <ArticleCard key={other.id} article={other} />
            ))}
          </div>
        </div>
      </Section>

      <JsonLd data={articleSchema(article)} />
    </>
  );
}
