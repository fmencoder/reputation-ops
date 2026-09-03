import Image from "next/image";
import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { Button } from "@/components/Button";
import { LayerStack } from "@/components/graphics/LayerStack";
import { ConvergenceScene } from "@/components/graphics/ConvergenceScene";
import { domainIcon } from "@/components/DomainGrid";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Technology",
  description:
    "The four areas of focus: AI systems and agents, blockchain infrastructure, financial technology, and digital infrastructure.",
  path: "/technology/",
});

export default async function TechnologyPage() {
  const { technology } = await getPages();

  return (
    <>
      <PageHeader
        eyebrow={technology.eyebrow}
        headline={technology.headline}
        lead={technology.lead}
        below={
          <div className={styles.actions}>
            <Button href="/insights/">Explore insights →</Button>
            <Button href="/research/" variant="ghost">
              View research
            </Button>
          </div>
        }
        aside={
          <div className={styles.stage}>
            <ConvergenceScene />
          </div>
        }
      />

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

      <Section bordered>
        <div className={styles.converge}>
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
          </div>
          <figure style={{ margin: 0 }}>
            <div className={styles.diagram}>
              <LayerStack />
            </div>
            <figcaption className={styles.caption}>
              The convergence path, with the authorization gate as the load-bearing element. Input
              and verified output sit outside the containment boundary; everything that acts sits
              inside it.
            </figcaption>
          </figure>
        </div>
      </Section>
    </>
  );
}
