import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { Button } from "@/components/Button";
import { CapabilityIcon } from "@/components/CapabilityIcon";
import { ReliabilityChain } from "@/components/graphics/ReliabilityChain";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Capabilities",
  description:
    "Capability areas across AI and agentic systems, data intelligence and analytics, digital transformation, AI governance, and automation and decision systems.",
  path: "/capabilities/",
});

/*
 * A capability page is read by someone deciding whether to start a
 * conversation, so it answers two questions in order: what the practice works
 * on, and how it approaches the work. The standing note is the third thing on
 * the page rather than a footnote, because the reader's next assumption after
 * a capability list is that the list describes delivered engagements.
 */
export default async function CapabilitiesPage() {
  const { capabilities } = await getPages();

  return (
    <>
      <PageHeader
        eyebrow={capabilities.eyebrow}
        headline={capabilities.headline}
        lead={capabilities.lead}
        wide
        below={
          <div className={styles.actions}>
            <Button href="/global-development/">Global development →</Button>
            <Button href="/contact/" variant="ghost">
              Start a conversation
            </Button>
          </div>
        }
      />

      <Section bordered field tone="quiet">
        <h2 className="sr-only">Capability areas</h2>
        <div className={styles.areas}>
          {capabilities.areas.map((area) => (
            <article key={area.title} className={styles.area}>
              <CapabilityIcon glyph={area.icon} />
              <div>
                <h3 className={styles.areaTitle}>{area.title}</h3>
                <p className={styles.areaBody}>{area.body}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section bordered>
        <div className={styles.method}>
          <SectionLabel>How the work is approached</SectionLabel>
          <div className={styles.methodBody}>
            <figure className={styles.plate}>
              <ReliabilityChain />
              <figcaption className={styles.plateCaption}>
                Why the budget is the unit, not the step. Each point is the per-step success rate
                compounded over the chain — arithmetic on a stated assumption, not a measurement of
                any deployed system. A component good enough to ship alone is not good enough to
                chain fifty deep.
              </figcaption>
            </figure>
            <div className={styles.prose}>
              {capabilities.method.map((section) => (
                <div key={section.heading}>
                  <h3 className={styles.proseHeading}>{section.heading}</h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className={styles.proseBody}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section bordered size="tight">
        <aside className={styles.standing} aria-label="Statement of standing">
          <p className={styles.standingText}>{capabilities.standing}</p>
        </aside>
      </Section>
    </>
  );
}
