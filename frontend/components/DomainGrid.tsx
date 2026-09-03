import Image from "next/image";
import { asset } from "@/lib/media";
import styles from "./DomainGrid.module.css";

/*
 * The four research domains. The icons are the site's own marks, not stock
 * glyphs, and the descriptors are the ones already published — no domain gets
 * a number, a count or a percentage attached to it.
 */
const ICONS: Record<string, string> = {
  "AI Systems & Agents": "/assets/icon-ai-systems.webp",
  "Blockchain Infrastructure": "/assets/icon-blockchain.webp",
  "Financial Technology": "/assets/icon-fintech.webp",
  "Digital Infrastructure": "/assets/icon-infrastructure.webp",
};

export function domainIcon(title: string): string {
  return asset(ICONS[title] ?? "/assets/icon-ai-systems.webp");
}

export function DomainGrid({
  domains,
  descriptors,
}: {
  domains: string[];
  descriptors?: Record<string, string>;
}) {
  return (
    <ul className={styles.grid}>
      {domains.map((domain) => (
        <li key={domain} className={styles.item}>
          <span className={styles.iconFrame}>
            <Image src={domainIcon(domain)} alt="" width={96} height={96} className={styles.icon} />
          </span>
          <span className={styles.text}>
            <span className={styles.label}>{domain}</span>
            {descriptors?.[domain] ? <span className={styles.note}>{descriptors[domain]}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
