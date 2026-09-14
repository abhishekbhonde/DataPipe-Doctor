---
name: datapipe-doctor-plan
description: Architecture and implementation plan for DataPipe Doctor — an AI-powered root-cause explainer for dbt pipeline test failures. Load this when working on this project's backend, data model, ingestion, AI explanation logic, or dashboard UI, or when picking up implementation after a break.
---

# DataPipe Doctor — Architecture & Plan

## What this is

DataPipe Doctor explains *why* a dbt data pipeline test failed (not just that it did). It reads the failing model's compiled SQL, its lineage (upstream parents), and sample bad rows, and uses an LLM to produce a plain-English root cause + suggested fix. Built as a real multi-tenant SaaS from day one, not a single-user demo — see "Why multi-tenant" below.

## Why multi-tenant

This project is explicitly shaped like a real product (not a toy) because that's what makes it credible in a portfolio: multi-tenant architecture, real auth, real data isolation. It's positioned to match current hiring demand — data pipeline reliability is the named "AI scaling bottleneck," and AI-driven root-cause explanation is the "verify the output is correct" skill the 2026 job market is short on.

## Provider decisions

- **Auth + tenancy: Clerk** (Vercel Marketplace native). Clerk **Organizations** *is* the tenant model — do not hand-roll `users`/`organizations` tables. Every app table is scoped by Clerk's `org_id`.
- **Database: Postgres via Vercel Marketplace** (Neon). Provision via `vercel integration add`, never hand-configured credentials.
- **Artifact storage: Vercel Blob** for raw `manifest.json`/`run_results.json`. Keep Postgres rows lean — parsed data in tables, raw JSON in Blob.
- **Compute: Vercel Functions, Fluid compute (default)** — plain Node.js, no edge runtime.
- **AI: AI SDK + AI Gateway** — model-agnostic `"provider/model"` strings, gives spend observability per org for free.
- **Lineage UI: React Flow** for the DAG — the centerpiece screen for demos/screenshots.

## Data model (Postgres, every table carries `org_id` from Clerk)

- `api_keys` — id, org_id, hashed_key, name, created_at, last_used_at (CLI ingestion auth; separate from Clerk's interactive session since CI can't do OAuth)
- `projects` — id, org_id, name, created_at
- `pipeline_runs` — id, project_id, org_id, status, started_at, finished_at, manifest_blob_url, results_blob_url
- `models` — id, project_id, unique_id, name, compiled_sql, depends_on (jsonb array of parent unique_ids)
- `test_results` — id, run_id, model_id, test_name, status, failure_message, sample_rows (jsonb)
- `ai_explanations` — id, test_result_id, root_cause, suggested_fix, tokens_used, created_at

All reads/writes go through a single `withOrgScope(orgId)` query helper (`lib/db.ts`) so tenant isolation lives in one place. Postgres row-level security is a later hardening step, not required for MVP.

## Ingestion flow

1. User (via Clerk, in dashboard) creates a `project` and generates an API key (shown once, stored hashed).
2. CLI script (`cli/pipedoctor.ts`, `pipedoctor run -- <dbt command>`) wraps the dbt command, reads dbt's own `target/manifest.json` + `target/run_results.json`, POSTs both to `/api/ingest` with the API key header.
3. `/api/ingest` validates the hashed key → resolves `org_id`/`project_id`, uploads raw JSON to Blob, parses it, upserts `models`, inserts `pipeline_runs` + `test_results`.
4. For each failed test, inline in the same request (MVP scale, no queue yet): build context (failing model's SQL + parents' SQL from `depends_on` + sample bad rows) → call LLM via AI Gateway → store in `ai_explanations`.
5. **Future, not built yet:** move step 4 to Vercel Queues/Workflow if ingestion volume grows, so `/api/ingest` can return immediately.

## Dashboard (Next.js App Router, Clerk-protected)

- `/dashboard` — project list + Clerk `<OrganizationSwitcher />`
- `/dashboard/[project]` — run history + pass/fail trend chart
- `/dashboard/[project]/runs/[runId]` — React Flow lineage graph (nodes colored by pass/fail); click a failed node → AI root-cause + suggested fix panel
- `/dashboard/[project]/settings` — API key create/revoke
- Flaky-test surfacing computed on read (test failing in some but not all of last N runs) — no background job for MVP

## Build order

1. Scaffold Next.js (App Router, TS, Tailwind), `vercel link`, provision Postgres (Neon) + Clerk (Organizations enabled) via `vercel integration add`, `vercel env pull`, base schema, confirm empty app deploys
2. Ingestion: `/api/ingest` route, `cli/pipedoctor.ts`, seed data via dbt's public `jaffle_shop` sample project with a deliberately broken model
3. AI root-cause: context builder + AI Gateway call, verify against the seeded broken model
4. Dashboard UI: run list + trend chart, lineage graph + explanation panel, API key management
5. Demo polish: permanent seeded demo org/project (zero-setup viewing for recruiters), deploy, empty/loading/error states

## Critical files

- `lib/db.ts` — Postgres client + `withOrgScope`
- `lib/schema.sql` — table definitions (see Data model above)
- `app/api/ingest/route.ts` — ingestion endpoint
- `lib/ai/explain.ts` — context builder + AI Gateway call
- `cli/pipedoctor.ts` — CLI wrapper
- `app/dashboard/[project]/runs/[runId]/page.tsx` + `LineageGraph` component — centerpiece UI

## Verification checklist

- Empty app deploys, Clerk sign-up/org-creation works, DB connection confirmed
- CLI run against seeded jaffle_shop project lands correct rows in `pipeline_runs`/`test_results`/Blob
- AI explanation for the deliberately-broken model is actually correct/sensible, not generic
- Full manual flow works end-to-end in browser: create org → generate key → run CLI → see run → open lineage graph → click failed node → read explanation
- Tenant isolation: a second Clerk org cannot see the first org's projects/runs/API keys
