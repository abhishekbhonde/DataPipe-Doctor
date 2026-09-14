import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
            D
          </span>
          DataPipe Doctor
        </Link>
        <div className="flex items-center gap-4">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={clerkAppearance}
          />
          <UserButton appearance={clerkAppearance} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
