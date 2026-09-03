import styles from "./Eyebrow.module.css";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`${styles.rule} ${className}`} />;
}
