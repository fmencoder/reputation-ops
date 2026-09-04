import { getArticles, getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { ArticleCard } from "@/components/ArticleCard";
import { NodeWeb } from "@/components/graphics/NodeWeb";
import { ResearchMap } from "@/components/graphics/ResearchMap";
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
        aside={
          /*
           * The threads, with the number of published articles in each. These
           * are counted from the index at build time — the only numbers on the
           * site, and the only ones that can be checked by clicking them.
           */
          <div className={styles.panel}>
            <NodeWeb className={styles.web} seed={4471} />
            <p className={styles.panelLabel}>Threads</p>
            <ul className={styles.panelList}>
              {THREADS.map((thread) => {
                const count = articles.filter((article) => article.topic === thread).length;
                if (count === 0) return null;
                return (
                  <li key={thread} className={styles.panelItem}>
                    <span className={styles.panelName}>{thread}</span>
                    <span className={styles.panelCount}>
                      {count} {count === 1 ? "article" : "articles"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        }
      />

      <Section bordered>
        <div className={styles.domains}>
          <SectionLabel>The domains, and how they bear on each other</SectionLabel>
          <figure className={styles.mapPlate}>
            <ResearchMap />
          </figure>
          <p className={styles.mapCaption}>
            Five domains and six relations. There are no figures in this drawing and none are
            wanted: what is worth showing is the structure — that context work sits upstream of
            reliability, that governance is only real once execution is deterministic, and that
            recoverability is what remains when the other four have run out.
          </p>
        </div>
      </Section>

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
