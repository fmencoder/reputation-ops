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
           * source. What replaces them is the thing the panel was gesturing at
           * and which is true: the four areas this publication covers.
           */
          <div className={styles.panel}>
            <NodeWeb className={styles.web} seed={9021} />
            <p className={styles.panelLabel}>Research areas</p>
            <ul className={styles.panelList}>
              {insights.domains.map((domain) => (
                <li key={domain} className={styles.panelItem}>
                  <Image
                    src={domainIcon(domain)}
                    alt=""
                    width={96}
                    height={96}
                    className={styles.panelIcon}
                  />
                  <span className={styles.panelName}>{domain}</span>
                </li>
              ))}
            </ul>
          </div>
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
