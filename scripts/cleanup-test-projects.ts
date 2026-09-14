// One-off: removes smoke-test debris and duplicate seed runs so the dashboard
// isn't cluttered with test artifacts. Usage: npx dotenv -e .env.local -- tsx scripts/cleanup-test-projects.ts <orgId>
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../lib/db";
import { projects, apiKeys, pipelineRuns, models, testResults, aiExplanations } from "../lib/db/schema";

async function main() {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error("Usage: tsx scripts/cleanup-test-projects.ts <orgId>");
    process.exit(1);
  }
  const db = getDb();

  const all = await db.select().from(projects).where(eq(projects.orgId, orgId));

  // Delete every "CI Ingestion Test (smoke)" project (pure smoke-test debris), and all
  // but the newest "Jaffle Shop Analytics (demo)" duplicate.
  const smokeTest = all.filter((p) => p.name.includes("smoke"));
  const demos = all
    .filter((p) => p.name.includes("Jaffle Shop Analytics"))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const staleDemos = demos.slice(1);

  const toDelete = [...smokeTest, ...staleDemos];
  if (toDelete.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const ids = toDelete.map((p) => p.id);
  console.log(`Deleting ${ids.length} project(s): ${toDelete.map((p) => p.name).join(", ")}`);

  const runs = await db.select({ id: pipelineRuns.id }).from(pipelineRuns).where(inArray(pipelineRuns.projectId, ids));
  const runIds = runs.map((r) => r.id);
  const testRows = runIds.length
    ? await db.select({ id: testResults.id }).from(testResults).where(inArray(testResults.runId, runIds))
    : [];
  const testIds = testRows.map((t) => t.id);

  if (testIds.length) await db.delete(aiExplanations).where(inArray(aiExplanations.testResultId, testIds));
  if (runIds.length) await db.delete(testResults).where(inArray(testResults.runId, runIds));
  await db.delete(models).where(inArray(models.projectId, ids));
  await db.delete(pipelineRuns).where(inArray(pipelineRuns.projectId, ids));
  await db.delete(apiKeys).where(and(eq(apiKeys.orgId, orgId), inArray(apiKeys.projectId, ids)));
  await db.delete(projects).where(inArray(projects.id, ids));

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
