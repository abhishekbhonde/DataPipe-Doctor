import { generateObject } from "ai";
import { z } from "zod";

const EXPLANATION_MODEL = process.env.PIPEDOCTOR_MODEL ?? "anthropic/claude-sonnet-4.5";

const explanationSchema = z.object({
  rootCause: z.string().describe("Plain-English explanation of why this test actually failed, grounded in the SQL and lineage given — not a restatement of the failure message."),
  suggestedFix: z.string().nullable().describe("A concrete SQL or logic change that would fix it, or null if no fix can be inferred from the given context."),
});

export interface FailingTestContext {
  testName: string;
  failureMessage: string | null;
  model: { uniqueId: string; name: string; compiledSql: string | null };
  parentModels: { uniqueId: string; name: string; compiledSql: string | null }[];
  sampleRows: Record<string, unknown>[] | null;
}

export async function explainTestFailure(ctx: FailingTestContext) {
  const prompt = buildPrompt(ctx);
  const { object, usage } = await generateObject({
    model: EXPLANATION_MODEL,
    schema: explanationSchema,
    prompt,
  });
  return {
    rootCause: object.rootCause,
    suggestedFix: object.suggestedFix,
    tokensUsed: usage?.totalTokens ?? null,
  };
}

function buildPrompt(ctx: FailingTestContext) {
  const parents = ctx.parentModels.length
    ? ctx.parentModels
        .map((p) => `-- parent: ${p.name} (${p.uniqueId})\n${p.compiledSql ?? "(compiled SQL unavailable)"}`)
        .join("\n\n")
    : "(no upstream parent models found in lineage)";

  const rows = ctx.sampleRows?.length
    ? JSON.stringify(ctx.sampleRows.slice(0, 5), null, 2)
    : "(no sample rows captured)";

  return `You are diagnosing a failed dbt data pipeline test. Explain the root cause in plain English using ONLY the SQL and data given below — do not restate the failure message, explain WHY it happened.

## Failing test
Test: ${ctx.testName}
Model: ${ctx.model.name} (${ctx.model.uniqueId})
Failure message: ${ctx.failureMessage ?? "(none provided)"}

## Failing model's compiled SQL
${ctx.model.compiledSql ?? "(compiled SQL unavailable)"}

## Upstream parent models (lineage)
${parents}

## Sample offending rows
${rows}`;
}
