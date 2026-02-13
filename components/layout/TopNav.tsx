"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import styles from "./top-nav.module.css";

const navItems = [
  { href: "/editor/custom", label: "Custom Editor" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Doc Architecture Lab
        </Link>
        <nav className={styles.nav} aria-label="Editor Navigation">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`${styles.link} ${isActive ? styles.active : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.status}>Production-Grade Comparison Workspace</div>
      </div>
    </header>
  );
}
