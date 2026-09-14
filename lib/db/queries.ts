import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { apiKeys, models, pipelineRuns, projects, testResults, aiExplanations } from "./schema";
import { generateApiKey, hashApiKey } from "../api-keys";

// Every function below takes orgId explicitly and filters by it — this is the
// single place tenant isolation is enforced, so no route re-derives it ad hoc.

export async function listProjects(orgId: string) {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.orgId, orgId)).orderBy(desc(projects.createdAt));
}

export async function createProject(orgId: string, name: string) {
  const db = getDb();
  const [project] = await db.insert(projects).values({ orgId, name }).returning();
  return project;
}

export async function getProject(orgId: string, projectId: string) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  return project ?? null;
}

export async function listApiKeys(orgId: string, projectId: string) {
  const db = getDb();
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, orgId), eq(apiKeys.projectId, projectId)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function createApiKey(orgId: string, projectId: string, name: string) {
  const db = getDb();
  const { plaintext, hashed, keyPrefix } = generateApiKey();
  const [record] = await db
    .insert(apiKeys)
    .values({ orgId, projectId, name, hashedKey: hashed, keyPrefix })
    .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix });
  return { ...record, plaintext };
}

export async function revokeApiKey(orgId: string, keyId: string) {
  const db = getDb();
  await db.delete(apiKeys).where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));
}

/** Trust boundary: this is the one lookup not scoped by a known orgId — the
 * API key itself establishes org + project identity for CLI ingestion. */
export async function resolveApiKey(plaintextKey: string) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashApiKey(plaintextKey)));
  if (!record) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id));
  return record;
}

export async function listRuns(orgId: string, projectId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(pipelineRuns)
    .where(and(eq(pipelineRuns.orgId, orgId), eq(pipelineRuns.projectId, projectId)))
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(limit);
}

export async function getRunTestCounts(orgId: string, runIds: string[]) {
  const db = getDb();
  if (runIds.length === 0) return new Map<string, { pass: number; fail: number }>();
  const rows = await db
    .select({ runId: testResults.runId, status: testResults.status })
    .from(testResults)
    .where(and(eq(testResults.orgId, orgId), inArray(testResults.runId, runIds)));

  const counts = new Map<string, { pass: number; fail: number }>();
  for (const r of rows) {
    const entry = counts.get(r.runId) ?? { pass: 0, fail: 0 };
    if (r.status === "pass") entry.pass++;
    else entry.fail++;
    counts.set(r.runId, entry);
  }
  return counts;
}

export async function getRun(orgId: string, projectId: string, runId: string) {
  const db = getDb();
  const [run] = await db
    .select()
    .from(pipelineRuns)
    .where(and(eq(pipelineRuns.id, runId), eq(pipelineRuns.projectId, projectId), eq(pipelineRuns.orgId, orgId)));
  return run ?? null;
}

export async function createRun(
  orgId: string,
  projectId: string,
  data: { status: string; startedAt: Date; finishedAt: Date; manifestBlobUrl: string; resultsBlobUrl: string },
) {
  const db = getDb();
  const [run] = await db
    .insert(pipelineRuns)
    .values({ orgId, projectId, ...data })
    .returning();
  return run;
}

export async function upsertModels(
  orgId: string,
  projectId: string,
  runId: string,
  incoming: { uniqueId: string; name: string; compiledSql: string | null; dependsOn: string[] }[],
) {
  const db = getDb();
  const result = new Map<string, string>(); // uniqueId -> models.id
  for (const m of incoming) {
    const [row] = await db
      .insert(models)
      .values({ orgId, projectId, lastSeenRunId: runId, ...m })
      .onConflictDoUpdate({
        target: [models.projectId, models.uniqueId],
        set: { compiledSql: m.compiledSql, dependsOn: m.dependsOn, name: m.name, lastSeenRunId: runId, updatedAt: new Date() },
      })
      .returning({ id: models.id, uniqueId: models.uniqueId });
    result.set(row.uniqueId, row.id);
  }
  return result;
}

export async function insertTestResults(
  orgId: string,
  runId: string,
  incoming: {
    modelId: string | null;
    testName: string;
    status: string;
    failureMessage: string | null;
    sampleRows: Record<string, unknown>[] | null;
  }[],
) {
  const db = getDb();
  if (incoming.length === 0) return [];
  return db
    .insert(testResults)
    .values(incoming.map((t) => ({ orgId, runId, ...t })))
    .returning();
}

export async function saveExplanation(
  orgId: string,
  testResultId: string,
  data: { rootCause: string; suggestedFix: string | null; tokensUsed: number | null },
) {
  const db = getDb();
  const [row] = await db.insert(aiExplanations).values({ orgId, testResultId, ...data }).returning();
  return row;
}

export async function getRunDetail(orgId: string, projectId: string, runId: string) {
  const db = getDb();
  const run = await getRun(orgId, projectId, runId);
  if (!run) return null;

  const [runModels, results] = await Promise.all([
    db.select().from(models).where(and(eq(models.orgId, orgId), eq(models.projectId, projectId))),
    db.select().from(testResults).where(and(eq(testResults.orgId, orgId), eq(testResults.runId, runId))),
  ]);

  const explanations = results.length
    ? await db
        .select()
        .from(aiExplanations)
        .where(
          and(
            eq(aiExplanations.orgId, orgId),
            inArray(
              aiExplanations.testResultId,
              results.map((r) => r.id),
            ),
          ),
        )
    : [];

  return { run, models: runModels, testResults: results, explanations };
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: Date;
  latestRun: { status: string; startedAt: Date } | null;
  passCount: number;
  failCount: number;
}

/** Everything the dashboard's project list needs in one pass: each project's
 * latest run status + counts, plus org-wide totals for the stats strip. */
export async function getDashboardOverview(orgId: string) {
  const projectList = await listProjects(orgId);
  if (projectList.length === 0) {
    return { projects: [] as ProjectSummary[], stats: { totalProjects: 0, runsThisWeek: 0, failingProjects: 0 } };
  }

  const db = getDb();
  const projectIds = projectList.map((p) => p.id);
  const allRuns = await db
    .select()
    .from(pipelineRuns)
    .where(and(eq(pipelineRuns.orgId, orgId), inArray(pipelineRuns.projectId, projectIds)))
    .orderBy(desc(pipelineRuns.startedAt));

  const latestRunByProject = new Map<string, (typeof allRuns)[number]>();
  for (const r of allRuns) {
    if (!latestRunByProject.has(r.projectId)) latestRunByProject.set(r.projectId, r);
  }

  const counts = await getRunTestCounts(
    orgId,
    [...latestRunByProject.values()].map((r) => r.id),
  );

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const runsThisWeek = allRuns.filter((r) => r.startedAt >= weekAgo).length;
  const failingProjects = [...latestRunByProject.values()].filter((r) => r.status !== "success").length;

  const projects: ProjectSummary[] = projectList.map((p) => {
    const run = latestRunByProject.get(p.id);
    const c = run ? counts.get(run.id) : undefined;
    return {
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      latestRun: run ? { status: run.status, startedAt: run.startedAt } : null,
      passCount: c?.pass ?? 0,
      failCount: c?.fail ?? 0,
    };
  });

  return { projects, stats: { totalProjects: projectList.length, runsThisWeek, failingProjects } };
}

/** A test is "flaky" if it failed in some but not all of its last N runs for the project. */
export async function getFlakyTests(orgId: string, projectId: string, lastNRuns = 10) {
  const db = getDb();
  const runs = await listRuns(orgId, projectId, lastNRuns);
  if (runs.length < 2) return [];
  const runIds = runs.map((r) => r.id);
  const results = await db
    .select()
    .from(testResults)
    .where(and(eq(testResults.orgId, orgId), inArray(testResults.runId, runIds)));

  const byTest = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    const entry = byTest.get(r.testName) ?? { pass: 0, fail: 0 };
    if (r.status === "pass") entry.pass++;
    else entry.fail++;
    byTest.set(r.testName, entry);
  }
  return [...byTest.entries()]
    .filter(([, v]) => v.pass > 0 && v.fail > 0)
    .map(([testName, v]) => ({ testName, ...v }));
}
