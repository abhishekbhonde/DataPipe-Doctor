import { pgTable, text, timestamp, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const apiKeys = pgTable("api_keys", {
  id: id(),
  orgId: text("org_id").notNull(),
  projectId: text("project_id").notNull(),
  hashedKey: text("hashed_key").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const projects = pgTable("projects", {
  id: id(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pipelineRuns = pgTable("pipeline_runs", {
  id: id(),
  projectId: text("project_id").notNull(),
  orgId: text("org_id").notNull(),
  status: text("status").notNull(), // 'success' | 'failed' | 'partial'
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  manifestBlobUrl: text("manifest_blob_url"),
  resultsBlobUrl: text("results_blob_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const models = pgTable(
  "models",
  {
    id: id(),
    projectId: text("project_id").notNull(),
    orgId: text("org_id").notNull(),
    uniqueId: text("unique_id").notNull(), // dbt's unique_id, e.g. model.jaffle_shop.stg_orders
    name: text("name").notNull(),
    compiledSql: text("compiled_sql"),
    dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
    lastSeenRunId: text("last_seen_run_id"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("models_project_unique_id_idx").on(table.projectId, table.uniqueId)],
);

export const testResults = pgTable("test_results", {
  id: id(),
  runId: text("run_id").notNull(),
  modelId: text("model_id"),
  orgId: text("org_id").notNull(),
  testName: text("test_name").notNull(),
  status: text("status").notNull(), // 'pass' | 'fail' | 'error'
  failureMessage: text("failure_message"),
  sampleRows: jsonb("sample_rows").$type<Record<string, unknown>[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiExplanations = pgTable("ai_explanations", {
  id: id(),
  testResultId: text("test_result_id").notNull().unique(),
  orgId: text("org_id").notNull(),
  rootCause: text("root_cause").notNull(),
  suggestedFix: text("suggested_fix"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
