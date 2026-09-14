import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { listProjects } from "@/lib/db/queries";
import { createProjectAction } from "@/lib/actions";

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Create an organization to get started</h1>
        <p className="max-w-md text-sm text-black/60 dark:text-white/60">
          Every project, API key, and pipeline run is scoped to an organization — this is how DataPipe Doctor keeps
          different customers&apos; data isolated.
        </p>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
      </div>
    );
  }

  const projects = await listProjects(orgId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <form action={createProjectAction} className="flex gap-2">
          <input
            name="name"
            placeholder="Project name"
            required
            className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            New project
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No projects yet. Create one, then generate an API key in its settings to start pushing dbt run results.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/${p.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-black/40 dark:text-white/40">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
