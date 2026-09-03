import { getPages } from "@/lib/cms";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "How to reach Fredrick Mendez about anything published on NOVRA Intelligence, including corrections.",
  path: "/contact/",
});

export default async function ContactPage() {
  const { contact } = await getPages();

  return (
    <>
      <PageHeader eyebrow={contact.eyebrow} headline={contact.headline} lead={contact.lead} />
      <Section size="tight">
        <div className={styles.card}>
          {/* h2, not h3: the h1 is the page title and skipping a level breaks the outline. */}
          <h2 className={styles.heading}>Email</h2>
          <a className={styles.email} href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          <p className={styles.note}>{contact.note}</p>
        </div>
      </Section>
    </>
  );
}
