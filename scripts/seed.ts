// Seeds a demo project with realistic (jaffle_shop-style) lineage and a deliberately
// broken model, so the app can be explored without a real dbt project.
// Usage: npm run db:seed -- <clerkOrgId>
import { createProject, createRun, upsertModels, insertTestResults, saveExplanation } from "../lib/db/queries";
import { explainTestFailure } from "../lib/ai/explain";

const STG_CUSTOMERS_SQL = `select
  id as customer_id,
  first_name,
  last_name
from raw.jaffle_shop.customers`;

const STG_ORDERS_SQL = `select
  id as order_id,
  user_id as customer_id,
  order_date,
  status
from raw.jaffle_shop.orders`;

const STG_PAYMENTS_SQL = `select
  id as payment_id,
  order_id,
  payment_method,
  amount
from raw.stripe.payments
where status <> 'fail'`;

const CUSTOMERS_SQL = `select
  c.customer_id,
  c.first_name,
  c.last_name,
  count(o.order_id) as order_count
from stg_customers c
left join stg_orders o on o.customer_id = c.customer_id
group by 1, 2, 3`;

// The bug: LEFT JOIN keeps orders that never matched a payments row (e.g. refunded/void
// orders inserted before the Stripe webhook backfill landed on 2026-09-10), so
// amount is null for those rows instead of being excluded or defaulted to 0.
const ORDERS_SQL = `select
  o.order_id,
  o.customer_id,
  o.order_date,
  p.amount
from stg_orders o
left join stg_payments p on p.order_id = o.order_id`;

const MODELS = [
  { uniqueId: "model.jaffle_shop.stg_customers", name: "stg_customers", compiledSql: STG_CUSTOMERS_SQL, dependsOn: [] },
  { uniqueId: "model.jaffle_shop.stg_orders", name: "stg_orders", compiledSql: STG_ORDERS_SQL, dependsOn: [] },
  { uniqueId: "model.jaffle_shop.stg_payments", name: "stg_payments", compiledSql: STG_PAYMENTS_SQL, dependsOn: [] },
  {
    uniqueId: "model.jaffle_shop.customers",
    name: "customers",
    compiledSql: CUSTOMERS_SQL,
    dependsOn: ["model.jaffle_shop.stg_customers", "model.jaffle_shop.stg_orders"],
  },
  {
    uniqueId: "model.jaffle_shop.orders",
    name: "orders",
    compiledSql: ORDERS_SQL,
    dependsOn: ["model.jaffle_shop.stg_orders", "model.jaffle_shop.stg_payments"],
  },
];

const SAMPLE_BAD_ROWS = [
  { order_id: "1084", customer_id: "42", order_date: "2026-09-11", amount: null },
  { order_id: "1091", customer_id: "17", order_date: "2026-09-12", amount: null },
  { order_id: "1103", customer_id: "8", order_date: "2026-09-12", amount: null },
];

async function main() {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error("Usage: npm run db:seed -- <clerkOrgId>");
    process.exit(1);
  }

  const project = await createProject(orgId, "Jaffle Shop Analytics (demo)");
  console.log(`Created demo project ${project.id} in org ${orgId}`);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  // A flaky-looking pattern: pass, fail, pass, fail — good for exercising the
  // trend chart and flaky-test detector, not just a single failing run.
  const runPlan = [
    { offsetDays: 3, failing: false },
    { offsetDays: 2, failing: true },
    { offsetDays: 1, failing: false },
    { offsetDays: 0, failing: true },
  ];

  for (const plan of runPlan) {
    const startedAt = new Date(now - plan.offsetDays * day);
    const finishedAt = new Date(startedAt.getTime() + 45_000);

    const run = await createRun(orgId, project.id, {
      status: plan.failing ? "partial" : "success",
      startedAt,
      finishedAt,
      manifestBlobUrl: "seeded",
      resultsBlobUrl: "seeded",
    });

    const modelIdByUniqueId = await upsertModels(orgId, project.id, run.id, MODELS);
    const modelByUniqueId = new Map(MODELS.map((m) => [m.uniqueId, m]));

    const testDefs = [
      { testName: "unique_stg_customers_customer_id", modelUniqueId: "model.jaffle_shop.stg_customers", status: "pass" as const, failureMessage: null },
      { testName: "not_null_stg_orders_order_id", modelUniqueId: "model.jaffle_shop.stg_orders", status: "pass" as const, failureMessage: null },
      {
        testName: "not_null_orders_amount",
        modelUniqueId: "model.jaffle_shop.orders",
        status: plan.failing ? ("fail" as const) : ("pass" as const),
        failureMessage: plan.failing ? "Got 3 results, configured to fail if != 0" : null,
      },
    ];

    const inserted = await insertTestResults(
      orgId,
      run.id,
      testDefs.map((t) => ({
        modelId: modelIdByUniqueId.get(t.modelUniqueId) ?? null,
        testName: t.testName,
        status: t.status,
        failureMessage: t.failureMessage,
        sampleRows: t.status === "fail" ? SAMPLE_BAD_ROWS : null,
      })),
    );

    const failingIdx = testDefs.findIndex((t) => t.status === "fail");
    if (failingIdx !== -1) {
      const model = modelByUniqueId.get(testDefs[failingIdx].modelUniqueId)!;
      const parents = model.dependsOn.map((id) => modelByUniqueId.get(id)!).filter(Boolean);
      console.log(`Generating AI explanation for run ${run.id}...`);
      const explanation = await explainTestFailure({
        testName: testDefs[failingIdx].testName,
        failureMessage: testDefs[failingIdx].failureMessage,
        model: { uniqueId: model.uniqueId, name: model.name, compiledSql: model.compiledSql },
        parentModels: parents.map((p) => ({ uniqueId: p.uniqueId, name: p.name, compiledSql: p.compiledSql })),
        sampleRows: SAMPLE_BAD_ROWS,
      });
      await saveExplanation(orgId, inserted[failingIdx].id, explanation);
    }

    console.log(`Seeded run ${run.id} (${plan.failing ? "with failure" : "clean"})`);
  }

  console.log("\nDone. Open /dashboard to view the demo project.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
