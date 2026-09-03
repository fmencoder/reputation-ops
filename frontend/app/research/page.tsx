import { getArticles, getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { ArticleCard } from "@/components/ArticleCard";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Research",
  description:
    "Longer-form investigation into agentic system reliability, evaluation methodology, and AI governance.",
  path: "/research/",
});

/*
 * Research is a curated view of the reliability and governance threads, not a
 * second library. Every card points at the same permalink Insights uses — an
 * article is never published at two URLs — and the threads are derived from the
 * editorial kickers the articles already carry rather than invented here.
 */
const THREADS = ["Reliability", "Governance", "Architecture"] as const;

export default async function ResearchPage() {
  const [pages, articles] = await Promise.all([getPages(), getArticles()]);
  const { research } = pages;

  return (
    <>
      <PageHeader
        eyebrow={research.eyebrow}
        headline={research.headline}
        lead={research.lead}
        wide
      />

      <Section bordered size="tight">
        <div className={styles.intro}>
          <h2 className={styles.introHeading}>{research.intro.heading}</h2>
          {research.intro.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className={styles.introBody}>
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <Section bordered field tone="quiet">
        <div className={styles.threads}>
          {THREADS.map((thread) => {
            const inThread = articles.filter((article) => article.topic === thread);
            if (inThread.length === 0) return null;
            return (
              <div key={thread} className={styles.thread}>
                <p className={styles.threadLabel}>{thread}</p>
                <div className={styles.threadCards}>
                  {inThread.map((article) => (
                    <ArticleCard key={article.id} article={article} showImage={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section size="tight">
        <div className={styles.open}>
          <p className={styles.openKicker}>In progress</p>
          <h2 className={styles.openTitle}>Open questions</h2>
          <p className={styles.openBody}>{research.openQuestions}</p>
        </div>
      </Section>
    </>
  );
}
