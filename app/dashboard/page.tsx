import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { getDashboardOverview } from "@/lib/db/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "@/components/NewProjectForm";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-foreground">Create an organization to get started</h1>
        <p className="max-w-md text-sm text-muted">
          Every project, API key, and pipeline run is scoped to an organization — this is how DataPipe Doctor keeps
          different customers&apos; data isolated.
        </p>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" appearance={clerkAppearance} />
      </div>
    );
  }

  const { projects, stats } = await getDashboardOverview(orgId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted">Pipeline reliability across your organization.</p>
        </div>
        <NewProjectForm />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Projects" value={stats.totalProjects} />
        <Stat label="Runs this week" value={stats.runsThisWeek} />
        <Stat
          label="Currently failing"
          value={stats.failingProjects}
          tone={stats.failingProjects > 0 ? "critical" : "good"}
        />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Create a project, generate an API key in its settings, then run{" "}
            <code className="rounded bg-surface px-1 py-0.5">pipedoctor run -- dbt build</code> to push your first
            results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/${p.id}`}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{p.name}</p>
                {p.latestRun ? (
                  <StatusBadge status={p.latestRun.status} />
                ) : (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">No runs</span>
                )}
              </div>
              {p.latestRun ? (
                <p className="text-sm text-muted">
                  {p.passCount} passed, {p.failCount} failed · {relativeTime(p.latestRun.startedAt)}
                </p>
              ) : (
                <p className="text-sm text-muted">Created {relativeTime(p.createdAt)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "critical" }) {
  const color = tone === "critical" && value > 0 ? "text-[#d03b3b]" : tone === "good" ? "text-[#0ca30c]" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
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
