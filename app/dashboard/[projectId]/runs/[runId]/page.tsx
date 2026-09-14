import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProject, getRunDetail } from "@/lib/db/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { LineageGraph } from "@/components/LineageGraph";
import styles from "./page.module.css";

export default async function RunPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const project = await getProject(orgId, projectId);
  if (!project) return notFound();

  const detail = await getRunDetail(orgId, projectId, runId);
  if (!detail) return notFound();

  return (
    <div>
      <p className={styles.crumb}>
        <Link href="/dashboard">Projects</Link> / <Link href={`/dashboard/${projectId}`}>{project.name}</Link> / Run
      </p>
      <div className={styles.head}>
        <h1 className={styles.title}>{new Date(detail.run.startedAt).toLocaleString()}</h1>
        <StatusBadge status={detail.run.status} />
      </div>

      <LineageGraph
        models={detail.models.map((m) => ({ id: m.id, uniqueId: m.uniqueId, name: m.name, dependsOn: m.dependsOn }))}
        testResults={detail.testResults.map((t) => ({
          id: t.id,
          modelId: t.modelId,
          testName: t.testName,
          status: t.status,
          failureMessage: t.failureMessage,
        }))}
        explanations={detail.explanations.map((e) => ({
          testResultId: e.testResultId,
          rootCause: e.rootCause,
          suggestedFix: e.suggestedFix,
        }))}
      />
    </div>
  );
}
