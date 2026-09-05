import Link from "next/link";
import type { Article } from "@/lib/cms/types";
import { BrandImage, hasArticleArt } from "./BrandImage";
import styles from "./ArticleCard.module.css";

/**
 * An index entry.
 *
 * The art is the article's editorial artwork — a luminous field, unlabelled,
 * in the publication's image brand. It is not the schematic diagram that used
 * to sit here: a row of index cards is a shelf, and a shelf of diagrams reads
 * as documentation rather than as a publication.
 */
export function ArticleCard({
  article,
  feature = false,
  showImage = true,
}: {
  article: Article;
  feature?: boolean;
  showImage?: boolean;
}) {
  const art = showImage && hasArticleArt(article.slug);
  return (
    <Link
      href={article.path}
      className={`${styles.card} ${feature ? styles.feature : ""} ${art ? "" : styles.textOnly}`}
    >
      {art ? (
        <div className={styles.frame}>
          <BrandImage
            name={`article-${article.slug}`}
            alt=""
            sizes={feature ? "(min-width: 1024px) 1100px, 100vw" : "(min-width: 1024px) 520px, 100vw"}
          />
        </div>
      ) : null}
      <div className={styles.body}>
        <p className={styles.kicker}>{article.topic}</p>
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.excerpt}>{article.excerpt}</p>
        <p className={styles.meta}>
          <time dateTime={article.dateMachine}>{article.dateDisplay}</time>
          <span aria-hidden="true"> · </span>
          {article.readingTime}
        </p>
      </div>
    </Link>
  );
}
