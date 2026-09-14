import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProject, listRuns, getRunTestCounts, getFlakyTests } from "@/lib/db/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { RunTrendChart } from "@/components/RunTrendChart";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const project = await getProject(orgId, projectId);
  if (!project) return notFound();

  const runs = await listRuns(orgId, projectId, 30);
  const counts = await getRunTestCounts(orgId, runs.map((r) => r.id));
  const flaky = await getFlakyTests(orgId, projectId);

  const chartRuns = runs.map((r) => ({
    id: r.id,
    startedAt: r.startedAt,
    passCount: counts.get(r.id)?.pass ?? 0,
    failCount: counts.get(r.id)?.fail ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/50 dark:text-white/50">
            <Link href="/dashboard" className="hover:underline">
              Projects
            </Link>{" "}
            / {project.name}
          </p>
          <h1 className="text-xl font-semibold">{project.name}</h1>
        </div>
        <Link
          href={`/dashboard/${projectId}/settings`}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
        >
          API keys
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 p-8 text-center text-sm text-black/60 dark:border-white/20 dark:text-white/60">
          No runs yet. Generate an API key in Settings, then run{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">pipedoctor run -- dbt build</code> with it
          set as <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">PIPEDOCTOR_API_KEY</code>.
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-medium text-black/70 dark:text-white/70">Test results over time</h2>
            <RunTrendChart runs={chartRuns} />
          </section>

          {flaky.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">Flaky tests</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {flaky.map((f) => (
                  <li key={f.testName} className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 dark:border-white/10">
                    <span>{f.testName}</span>
                    <span className="text-black/50 dark:text-white/50">
                      {f.fail} fail / {f.pass} pass (last {f.pass + f.fail} runs)
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">Runs</h2>
            <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
              {runs.map((r) => {
                const c = counts.get(r.id) ?? { pass: 0, fail: 0 };
                return (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/${projectId}/runs/${r.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-3">
                        <StatusBadge status={r.status} />
                        <span className="text-black/50 dark:text-white/50">{new Date(r.startedAt).toLocaleString()}</span>
                      </span>
                      <span className="text-black/50 dark:text-white/50">
                        {c.pass} passed, {c.fail} failed
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
