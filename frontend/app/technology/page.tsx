import Image from "next/image";
import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { Button } from "@/components/Button";
import { StackMap } from "@/components/graphics/StackMap";
import { BoundaryDetail } from "@/components/graphics/BoundaryDetail";
import { domainIcon } from "@/components/DomainGrid";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Technology",
  description:
    "The four areas of focus: AI systems and agents, blockchain infrastructure, financial technology, and digital infrastructure.",
  path: "/technology/",
});

/*
 * The page is built around two views of one thing.
 *
 * The opening carries the gate seen close up — one request, three obligations,
 * and a boundary that holds. The section beneath carries the whole architecture
 * that gate sits in, with the prose that explains it alongside at the widths
 * where both can be read without scrolling between them.
 */
export default async function TechnologyPage() {
  const { technology } = await getPages();

  return (
    <>
      <PageHeader
        eyebrow={technology.eyebrow}
        headline={technology.headline}
        lead={technology.lead}
        aside={<BoundaryDetail />}
        below={
          <div className={styles.actions}>
            <Button href="/insights/">Explore insights →</Button>
            <Button href="/research/" variant="ghost">
              View research
            </Button>
          </div>
        }
      />

      <Section bordered>
        <div className={styles.signature}>
          <SectionLabel>The architecture</SectionLabel>
          <div className={styles.signatureBody}>
            <figure className={styles.plate}>
              <StackMap />
            </figure>
            <div className={styles.prose}>
              {technology.convergence.map((section) => (
                <div key={section.heading}>
                  <h2 className={styles.proseHeading}>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className={styles.proseBody}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
              <p className={styles.caption}>
                Five layers, seen in projection. Governance runs down one edge and observability
                down the other, tied into every layer; context is written back from execution and
                telemetry climbs the other way. Only the deterministic gate is lit, because
                everything above it is advisory and everything below it is irreversible.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section bordered field tone="quiet">
        <h2 className="sr-only">Areas of focus</h2>
        <div className={styles.cards}>
          {technology.cards.map((card) => (
            <article key={card.title} className={styles.card}>
              <Image
                src={domainIcon(card.title)}
                alt=""
                width={96}
                height={96}
                className={styles.cardIcon}
              />
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardBody}>{card.body}</p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
