// End-to-end smoke test: exercises the HTTP ingestion path, negative cases,
// tenant isolation, and the flaky-test/trend-count read paths.
// Usage: npm run smoke-test -- <orgIdA> <orgIdB>
import {
  createProject,
  createApiKey,
  revokeApiKey,
  getProject,
  listProjects,
  getFlakyTests,
  listRuns,
  getRunTestCounts,
} from "../lib/db/queries";

const API_URL = process.env.PIPEDOCTOR_API_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}`, detail ?? "");
    fail++;
  }
}

const MANIFEST = {
  nodes: {
    "model.smoke.stg_a": {
      resource_type: "model",
      unique_id: "model.smoke.stg_a",
      name: "stg_a",
      compiled_code: "select 1 as id",
      depends_on: { nodes: [] },
    },
    "model.smoke.mart_a": {
      resource_type: "model",
      unique_id: "model.smoke.mart_a",
      name: "mart_a",
      compiled_code: "select id from stg_a where id is not null",
      depends_on: { nodes: ["model.smoke.stg_a"] },
    },
    "test.smoke.not_null_mart_a_id": {
      resource_type: "test",
      unique_id: "test.smoke.not_null_mart_a_id",
      name: "not_null_mart_a_id",
      depends_on: { nodes: ["model.smoke.mart_a"] },
    },
  },
};

const RUN_RESULTS = {
  results: [{ unique_id: "test.smoke.not_null_mart_a_id", status: "fail", message: "Got 1 result, configured to fail if != 0" }],
};

async function ingest(apiKey: string) {
  return fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-pipedoctor-key": apiKey },
    body: JSON.stringify({
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      manifest: MANIFEST,
      runResults: RUN_RESULTS,
    }),
  });
}

async function main() {
  const [orgA, orgB] = process.argv.slice(2);
  if (!orgA || !orgB) {
    console.error("Usage: npm run smoke-test -- <orgIdA> <orgIdB>");
    process.exit(1);
  }

  console.log("1. HTTP ingestion (happy path)");
  const projectA = await createProject(orgA, "CI Ingestion Test (smoke)");
  const keyA = await createApiKey(orgA, projectA.id, "smoke-test-key");
  const res1 = await ingest(keyA.plaintext);
  const body1 = await res1.json();
  check("returns 200", res1.status === 200, res1.status);
  check("testCount is 1", body1.testCount === 1, body1);
  check("failedCount is 1", body1.failedCount === 1, body1);
  check("explainedCount is 1 (AI ran)", body1.explainedCount === 1, body1);

  console.log("2. Negative cases");
  const resNoKey = await fetch(`${API_URL}/api/ingest`, { method: "POST", body: "{}" });
  check("missing key -> 401", resNoKey.status === 401, resNoKey.status);

  const resBadKey = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "x-pipedoctor-key": "pdk_not_a_real_key", "content-type": "application/json" },
    body: JSON.stringify({ startedAt: "x", finishedAt: "x", manifest: {}, runResults: {} }),
  });
  check("bad key -> 401", resBadKey.status === 401, resBadKey.status);

  const resMalformed = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: { "x-pipedoctor-key": keyA.plaintext, "content-type": "application/json" },
    body: JSON.stringify({ startedAt: "not-a-date-but-a-string-is-fine", manifest: {} }), // missing runResults/finishedAt
  });
  check("malformed payload -> 400", resMalformed.status === 400, resMalformed.status);

  console.log("3. Revoked key is rejected");
  await revokeApiKey(orgA, keyA.id);
  const resRevoked = await ingest(keyA.plaintext);
  check("revoked key -> 401", resRevoked.status === 401, resRevoked.status);

  console.log("4. Tenant isolation");
  const projectB = await createProject(orgB, "Org B project (smoke)");
  const crossRead = await getProject(orgA, projectB.id);
  check("org A cannot read org B's project", crossRead === null, crossRead);
  const orgAProjects = await listProjects(orgA);
  check(
    "org A's project list does not include org B's project",
    !orgAProjects.some((p) => p.id === projectB.id),
    orgAProjects,
  );

  console.log("5. Flaky-test detection & trend counts (seeded demo project)");
  const orgAAllProjects = await listProjects(orgA);
  const demoProject = orgAAllProjects.find((p) => p.name.includes("Jaffle Shop"));
  if (demoProject) {
    const flaky = await getFlakyTests(orgA, demoProject.id);
    check(
      "not_null_orders_amount detected as flaky",
      flaky.some((f) => f.testName === "not_null_orders_amount"),
      flaky,
    );
    const runs = await listRuns(orgA, demoProject.id, 10);
    const counts = await getRunTestCounts(orgA, runs.map((r) => r.id));
    const totalFail = [...counts.values()].reduce((sum, c) => sum + c.fail, 0);
    check("seeded runs have failing tests recorded", totalFail > 0, totalFail);
  } else {
    console.log("  SKIP  (demo project not found — run npm run db:seed first)");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
