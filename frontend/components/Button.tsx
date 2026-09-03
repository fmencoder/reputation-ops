import Link from "next/link";
import styles from "./Button.module.css";

export function Button({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${styles.button} ${styles[variant]}`}>
      {children}
    </Link>
  );
}
