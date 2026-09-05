import Image from "next/image";
import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section, SectionLabel } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { domainIcon } from "@/components/DomainGrid";
import { ArchitectureRail } from "@/components/graphics/ArchitectureRail";
import { BrandImage } from "@/components/BrandImage";
import { asset } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "About",
  description: "About NOVRA Intelligence and Fredrick Mendez, who writes it.",
  path: "/about/",
});

export default async function AboutPage() {
  const { about } = await getPages();

  return (
    <>
      <PageHeader
        eyebrow={about.eyebrow}
        headline={about.headline}
        lead={about.lead}
        below={
          /* Three visually distinct lines: name strongest, role as the accent
             label, descriptor smallest. Nothing else is claimed. */
          <div className={styles.identity}>
            <p className={styles.identityName}>{about.identity.name}</p>
            <p className={styles.identityRole}>{about.identity.role}</p>
            <p className={styles.identityDescriptor}>{about.identity.descriptor}</p>
          </div>
        }
        aside={
          /*
           * The portrait is the supplied file, unretouched and uncropped. It is
           * capped well below the width of its column: the page is about the
           * work, and a portrait that fills half the screen says otherwise.
           * Nothing is set beneath it.
           *
           * What is new is the field it stands in: the orbital environment from
           * the approved board, with the photograph inset on it so the geometry
           * reads around the portrait rather than behind it — where, the image
           * covering its own frame edge to edge, it would never be seen at all.
           * The man is the subject; the system is what he is standing in.
           */
          <figure className={styles.portraitStage} style={{ margin: 0 }}>
            <BrandImage
              name="about-orbital"
              alt=""
              className={styles.orbital}
              sizes="(min-width: 1024px) 480px, 100vw"
            />
            <div className={styles.portraitFrame}>
              <Image
                src={asset(about.portrait.src)}
                alt={about.portrait.alt}
                width={about.portrait.width}
                height={about.portrait.height}
                priority
                sizes="(min-width: 1024px) 300px, 260px"
                className={styles.portrait}
              />
            </div>
          </figure>
        }
      />

      <Section bordered field tone="quiet">
        <SectionLabel>Our research focus</SectionLabel>
        <div className={styles.focus}>
          {about.researchFocus.map((card) => (
            <article key={card.title} className={styles.focusCard}>
              <Image
                src={domainIcon(card.title)}
                alt=""
                width={96}
                height={96}
                className={styles.focusIcon}
              />
              <h3 className={styles.focusTitle}>{card.title}</h3>
              <p className={styles.focusBody}>{card.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section bordered id="fredrick-mendez">
        <div className={styles.profileLayout}>
          <div className={styles.profile}>
            {about.profile.map((section) => (
              <div key={section.heading}>
                <h2 className={styles.profileHeading}>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className={styles.profileBody}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className={styles.profileRail}>
            <ArchitectureRail nodes={6} />
          </div>
        </div>
      </Section>

      {/*
        The idea behind NOVRA. This copy is reproduced exactly as approved and is
        not to be rewritten, trimmed or padded out. It makes no institutional
        claim and names no credential, which is the point. The lattice beside it
        is decorative and hidden from assistive technology: the text carries the
        meaning on its own.
      */}
      <Section bordered field tone="hero" size="loose">
        <div className={styles.manifesto}>
          <div className={styles.lattice} aria-hidden="true">
            <span className={styles.latticeGlow} />
            {/* The artwork is near-black on a near-black ground; without a
                plate behind it, it simply disappears into the page. */}
            <Image
              src={asset("/assets/novra-n-lattice.webp")}
              alt=""
              width={480}
              height={760}
              sizes="(min-width: 1024px) 340px, 300px"
              className={styles.latticeImage}
            />
          </div>
          <div>
            <Eyebrow>{about.manifesto.eyebrow}</Eyebrow>
            <h2 className={styles.manifestoHeadline}>
              {about.manifesto.headline.lead}{" "}
              <span className={styles.manifestoAccent}>{about.manifesto.headline.accent}</span>
            </h2>
            {about.manifesto.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className={styles.manifestoBody}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section size="tight">
        <div className={styles.publication}>
          <p className={styles.publicationKicker}>{about.publication.kicker}</p>
          <h2 className={styles.publicationTitle}>{about.publication.title}</h2>
          <p className={styles.publicationBody}>{about.publication.body}</p>
        </div>
      </Section>
    </>
  );
}
