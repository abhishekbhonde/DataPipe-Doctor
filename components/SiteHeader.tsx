import Link from "next/link";
import { StethoscopeIcon } from "./icons";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className={styles.bar}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark}>
            <StethoscopeIcon width={16} height={16} />
          </span>
          DataPipe Doctor
        </Link>
        <nav className={styles.nav}>
          {signedIn ? (
            <Link href="/dashboard" className={styles.cta}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={styles.link}>
                Sign in
              </Link>
              <Link href="/sign-up" className={styles.cta}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>
    </div>
  );
}
