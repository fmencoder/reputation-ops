import Image from "next/image";
import { getArticles, getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { ArticleCard } from "@/components/ArticleCard";
import { domainIcon } from "@/components/DomainGrid";
import { BrandImage } from "@/components/BrandImage";
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
           * The reference panel puts a research network here with a set of
           * percentages beside it. The network is reproduced; the percentages
           * are not, and neither is any other figure — every number in that
           * panel was invented at concept stage. What sits under the artwork is
           * the four areas this publication actually covers, which is the one
           * claim the panel was making that happens to be true.
           */
          <aside className={styles.cover}>
            <BrandImage
              name="insights-map"
              alt="A world map drawn as a field of lit points, with research routes arcing between hubs."
              sizes="(min-width: 1024px) 46vw, 100vw"
            />
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
