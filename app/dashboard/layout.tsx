import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { StethoscopeIcon } from "@/components/icons";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.mark}>
            <StethoscopeIcon width={16} height={16} />
          </span>
          DataPipe Doctor
        </Link>
        <div className={styles.headerActions}>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={clerkAppearance}
          />
          <UserButton appearance={clerkAppearance} />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
