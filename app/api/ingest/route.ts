import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { resolveApiKey, createRun, upsertModels, insertTestResults, saveExplanation } from "@/lib/db/queries";
import { parseManifest, parseRunResults, overallRunStatus } from "@/lib/dbt/parse";
import { explainTestFailure } from "@/lib/ai/explain";

const bodySchema = z.object({
  startedAt: z.string(),
  finishedAt: z.string(),
  manifest: z.record(z.string(), z.any()),
  runResults: z.record(z.string(), z.any()),
  sampleRows: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-pipedoctor-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-pipedoctor-key header" }, { status: 401 });
  }

  const keyRecord = await resolveApiKey(apiKey);
  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { startedAt, finishedAt, manifest, runResults, sampleRows } = parsed.data;
  const { orgId, projectId } = keyRecord;

  const runKey = crypto.randomUUID();
  const [manifestBlob, resultsBlob] = await Promise.all([
    put(`runs/${runKey}/manifest.json`, JSON.stringify(manifest), { access: "private", contentType: "application/json" }),
    put(`runs/${runKey}/run_results.json`, JSON.stringify(runResults), { access: "private", contentType: "application/json" }),
  ]);

  const parsedModels = parseManifest(manifest as never);
  const parsedTests = parseRunResults(manifest as never, runResults as never);
  const status = overallRunStatus(parsedTests);

  const run = await createRun(orgId, projectId, {
    status,
    startedAt: new Date(startedAt),
    finishedAt: new Date(finishedAt),
    manifestBlobUrl: manifestBlob.url,
    resultsBlobUrl: resultsBlob.url,
  });

  const modelIdByUniqueId = await upsertModels(orgId, projectId, run.id, parsedModels);
  const modelByUniqueId = new Map(parsedModels.map((m) => [m.uniqueId, m]));

  const insertedResults = await insertTestResults(
    orgId,
    run.id,
    parsedTests.map((t) => ({
      modelId: t.modelUniqueId ? (modelIdByUniqueId.get(t.modelUniqueId) ?? null) : null,
      testName: t.testName,
      status: t.status,
      failureMessage: t.failureMessage,
      sampleRows: sampleRows?.[t.testUniqueId] ?? null,
    })),
  );

  const failing = parsedTests
    .map((t, i) => ({ parsed: t, row: insertedResults[i] }))
    .filter(({ parsed }) => parsed.status !== "pass");

  let explainedCount = 0;
  for (const { parsed, row } of failing) {
    const model = parsed.modelUniqueId ? modelByUniqueId.get(parsed.modelUniqueId) : null;
    if (!model) continue; // can't build useful context without the model's SQL
    const parents = model.dependsOn.map((id) => modelByUniqueId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);

    try {
      const explanation = await explainTestFailure({
        testName: parsed.testName,
        failureMessage: parsed.failureMessage,
        model: { uniqueId: model.uniqueId, name: model.name, compiledSql: model.compiledSql },
        parentModels: parents.map((p) => ({ uniqueId: p.uniqueId, name: p.name, compiledSql: p.compiledSql })),
        sampleRows: (sampleRows?.[parsed.testUniqueId] as Record<string, unknown>[] | undefined) ?? null,
      });
      await saveExplanation(orgId, row.id, explanation);
      explainedCount++;
    } catch (err) {
      console.error(`AI explanation failed for test ${parsed.testName}:`, err);
    }
  }

  return NextResponse.json({
    runId: run.id,
    status,
    testCount: parsedTests.length,
    failedCount: failing.length,
    explainedCount,
  });
}
