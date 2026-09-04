import Image from "next/image";
import { getArticles, getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { ArticleCard } from "@/components/ArticleCard";
import { domainIcon } from "@/components/DomainGrid";
import { NodeWeb } from "@/components/graphics/NodeWeb";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Insights",
  description:
    "In-depth analysis and original research on the technologies and systems reshaping how software is built and operated.",
  path: "/insights/",
});

export default async function InsightsPage() {
  const [pages, articles] = await Promise.all([getPages(), getArticles()]);
  const { insights } = pages;

  return (
    <>
      <PageHeader
        eyebrow={insights.eyebrow}
        headline={insights.headline}
        lead={insights.lead}
        aside={
          /*
           * The reference composition puts an analytics panel here — counters
           * and a distribution chart. Every figure in it was invented, so none
           * of it is rendered and none of the numbers appear anywhere in this
           * source.
           *
           * What replaces it is set as the contents plate of a research
           * publication: a masthead rule, the areas numbered in sequence, and a
           * standing line at the foot. It carries exactly one claim, which is
           * true — these are the four areas this publication covers.
           */
          <aside className={styles.cover}>
            <NodeWeb className={styles.web} seed={9021} />
            <p className={styles.coverLabel}>Research areas</p>
            <ol className={styles.coverIndex}>
              {insights.domains.map((domain, index) => (
                <li key={domain} className={styles.coverEntry}>
                  <span className={styles.coverNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <Image
                    src={domainIcon(domain)}
                    alt=""
                    width={96}
                    height={96}
                    className={styles.coverIcon}
                  />
                  <span className={styles.coverName}>{domain}</span>
                </li>
              ))}
            </ol>
            <p className={styles.coverFoot}>Written and edited by Fredrick Mendez</p>
          </aside>
        }
      />

      <Section bordered id="latest">
        <div className={styles.index}>
          <SectionLabel>Latest publications</SectionLabel>
          {articles[0] ? <ArticleCard article={articles[0]} feature /> : null}
          <div className={styles.grid}>
            {articles.slice(1).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
