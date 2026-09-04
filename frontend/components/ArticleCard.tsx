import Link from "next/link";
import type { Article } from "@/lib/cms/types";
import { ArticleArt, hasArticleArt } from "./graphics/ArticleArt";
import styles from "./ArticleCard.module.css";

/**
 * An index entry.
 *
 * The art is the article's own diagram, not a photograph of a circuit board.
 * Every card in the index therefore belongs to one family and each one still
 * says what its article is about — which is the whole point of drawing them
 * rather than buying them.
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
          <ArticleArt slug={article.slug} variant="card" />
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
