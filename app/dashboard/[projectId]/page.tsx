import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProject, listRuns, getRunTestCounts, getFlakyTests } from "@/lib/db/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { RunTrendChart } from "@/components/RunTrendChart";
import { KeyIcon, ActivityIcon, AlertIcon } from "@/components/icons";
import styles from "./page.module.css";

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
    <div>
      <div className={styles.head}>
        <div>
          <p className={styles.crumb}>
            <Link href="/dashboard">Projects</Link> / {project.name}
          </p>
          <h1 className={styles.title}>{project.name}</h1>
        </div>
        <Link href={`/dashboard/${projectId}/settings`} className={styles.settingsLink}>
          <KeyIcon width={15} height={15} />
          API keys
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className={styles.empty}>
          No runs yet. Generate an API key in Settings, then run <code>pipedoctor run -- dbt build</code> with it set
          as <code>PIPEDOCTOR_API_KEY</code>.
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <p className={styles.sectionTitle}>
              <ActivityIcon width={14} height={14} />
              Test results over time
            </p>
            <RunTrendChart runs={chartRuns} />
          </div>

          {flaky.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>
                <AlertIcon width={14} height={14} />
                Flaky tests
              </p>
              {flaky.map((f) => (
                <div key={f.testName} className={styles.flakyRow}>
                  <span className={styles.flakyName}>{f.testName}</span>
                  <span className={styles.flakyCount}>
                    {f.fail} fail / {f.pass} pass (last {f.pass + f.fail} runs)
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.runsCard}>
            {runs.map((r) => {
              const c = counts.get(r.id) ?? { pass: 0, fail: 0 };
              return (
                <Link key={r.id} href={`/dashboard/${projectId}/runs/${r.id}`} className={styles.run}>
                  <span className={styles.runMeta}>
                    <StatusBadge status={r.status} />
                    <span className={styles.runDate}>{new Date(r.startedAt).toLocaleString()}</span>
                  </span>
                  <span className={styles.runCounts}>
                    {c.pass} passed, {c.fail} failed
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
