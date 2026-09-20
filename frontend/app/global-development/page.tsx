import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { Button } from "@/components/Button";
import { CapabilityIcon } from "@/components/CapabilityIcon";
import { BrandImage } from "@/components/BrandImage";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Global Development & Public Sector",
  description:
    "Technology capability for public institutions, development organisations and emerging markets: digital government, institutional AI, development intelligence, infrastructure and climate analytics.",
  path: "/global-development/",
});

/*
 * The institutional relationship disclosure is still load-bearing — naming
 * development banks as the context for a capability is exactly the
 * construction a reader converts into a client list, and the page has to deny
 * that reading in its own words. What changed is where it earns its place: it
 * now sits after the capabilities and the operating conditions, as the note a
 * reader meets once they have read what is being claimed, rather than as the
 * first card on the page. It is styled as a disclosure and not as a capability
 * — quieter type, no accent rule, no raised panel — because a disclosure that
 * looks like a headline is read as one.
 */
export default async function GlobalDevelopmentPage() {
  const { globalDevelopment: gd } = await getPages();

  return (
    <>
      <PageHeader
        eyebrow={gd.eyebrow}
        headline={gd.headline}
        lead={gd.lead}
        aside={
          <figure className={styles.stage}>
            <BrandImage
              name="global-map"
              alt="A world map rendered as a field of points, with brighter nodes linked across regions."
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
          </figure>
        }
        below={
          <div className={styles.actions}>
            <Button href="/contact/">Start a conversation →</Button>
            <Button href="/capabilities/" variant="ghost">
              All capabilities
            </Button>
          </div>
        }
      />

      <Section bordered field tone="quiet">
        <h2 className="sr-only">Capability areas</h2>
        <div className={styles.areas}>
          {gd.areas.map((area) => (
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
        <div className={styles.context}>
          <SectionLabel>Operating conditions</SectionLabel>
          <div className={styles.prose}>
            {gd.context.map((section) => (
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
      </Section>

      <Section bordered size="tight">
        <div className={styles.engagement}>
          <h2 className={styles.engagementHeading}>{gd.engagement.heading}</h2>
          <p className={styles.engagementBody}>{gd.engagement.body}</p>
          <Button href="/contact/">Contact →</Button>
        </div>
      </Section>

      <Section size="tight">
        <aside className={styles.standing} aria-labelledby="institutional-disclosure">
          <h2 id="institutional-disclosure" className={styles.standingHeading}>
            {gd.standingHeading}
          </h2>
          <p className={styles.standingText}>{gd.standing}</p>
        </aside>
      </Section>
    </>
  );
}
