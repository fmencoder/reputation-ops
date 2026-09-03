import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/cms/types";
import { asset } from "@/lib/media";
import styles from "./ArticleCard.module.css";

export function ArticleCard({
  article,
  feature = false,
  showImage = true,
}: {
  article: Article;
  feature?: boolean;
  showImage?: boolean;
}) {
  return (
    <Link
      href={article.path}
      className={`${styles.card} ${feature ? styles.feature : ""} ${showImage ? "" : styles.textOnly}`}
    >
      {showImage && article.hero.src ? (
        <div className={styles.frame}>
          <Image
            src={asset(article.hero.src)}
            alt=""
            width={article.hero.width}
            height={article.hero.height}
            sizes={feature ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 380px, (min-width: 620px) 50vw, 100vw"}
            className={styles.image}
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
