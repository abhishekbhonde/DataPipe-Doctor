import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { getDashboardOverview } from "@/lib/db/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "@/components/NewProjectForm";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { FolderIcon, ActivityIcon, AlertIcon } from "@/components/icons";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div className={styles.gate}>
        <h1 className={styles.gateTitle}>Create an organization to get started</h1>
        <p className={styles.gateBody}>
          Every project, API key, and pipeline run is scoped to an organization — this is how DataPipe Doctor keeps
          different customers&apos; data isolated.
        </p>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" appearance={clerkAppearance} />
      </div>
    );
  }

  const { projects, stats } = await getDashboardOverview(orgId);

  return (
    <div>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>Pipeline reliability across your organization.</p>
        </div>
        <NewProjectForm />
      </div>

      <div className={styles.stats}>
        <Stat icon={FolderIcon} label="Projects" value={stats.totalProjects} />
        <Stat icon={ActivityIcon} label="Runs this week" value={stats.runsThisWeek} />
        <Stat
          icon={AlertIcon}
          label="Currently failing"
          value={stats.failingProjects}
          tone={stats.failingProjects > 0 ? "critical" : "good"}
        />
      </div>

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <FolderIcon width={22} height={22} />
          </span>
          <p className={styles.emptyTitle}>No projects yet</p>
          <p className={styles.emptyBody}>
            Create a project, generate an API key in its settings, then run{" "}
            <code>pipedoctor run -- dbt build</code> to push your first results.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/${p.id}`} className={styles.project}>
              <div className={styles.projectHead}>
                <span className={styles.projectIcon}>
                  <FolderIcon width={16} height={16} />
                </span>
                <p className={styles.projectName}>{p.name}</p>
              </div>
              {p.latestRun ? (
                <div className={styles.projectMetaRow}>
                  <StatusBadge status={p.latestRun.status} />
                  <span className={styles.projectMeta}>
                    {p.passCount} passed, {p.failCount} failed · {relativeTime(p.latestRun.startedAt)}
                  </span>
                </div>
              ) : (
                <div className={styles.projectMetaRow}>
                  <span className={styles.noRuns}>No runs</span>
                  <span className={styles.projectMeta}>Created {relativeTime(p.createdAt)}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: (props: { width?: number; height?: number }) => React.ReactElement;
  label: string;
  value: number;
  tone?: "good" | "critical";
}) {
  const toneClass =
    tone === "critical" && value > 0 ? styles.statValueCritical : tone === "good" ? styles.statValueGood : "";
  const iconToneClass = tone === "critical" && value > 0 ? styles.statIconCritical : "";
  return (
    <div className={styles.stat}>
      <div className={styles.statHead}>
        <p className={styles.statLabel}>{label}</p>
        <span className={`${styles.statIcon} ${iconToneClass}`}>
          <Icon width={15} height={15} />
        </span>
      </div>
      <p className={`${styles.statValue} ${toneClass}`}>{value}</p>
    </div>
  );
}

function relativeTime(date: Date) {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
