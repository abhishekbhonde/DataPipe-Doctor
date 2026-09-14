// Parses dbt's own artifacts (target/manifest.json, target/run_results.json) —
// no custom SQL/DAG parsing needed, dbt already computed the lineage.

interface ManifestNode {
  resource_type: string;
  unique_id: string;
  name: string;
  compiled_code?: string;
  compiled_sql?: string;
  depends_on?: { nodes?: string[] };
}

interface Manifest {
  nodes: Record<string, ManifestNode>;
}

interface RunResultEntry {
  unique_id: string;
  status: string;
  message?: string | null;
}

interface RunResults {
  results: RunResultEntry[];
}

export interface ParsedModel {
  uniqueId: string;
  name: string;
  compiledSql: string | null;
  dependsOn: string[];
}

export interface ParsedTestResult {
  testUniqueId: string;
  testName: string;
  modelUniqueId: string | null;
  status: "pass" | "fail" | "error";
  failureMessage: string | null;
}

export function parseManifest(manifest: Manifest): ParsedModel[] {
  return Object.values(manifest.nodes)
    .filter((n) => n.resource_type === "model")
    .map((n) => ({
      uniqueId: n.unique_id,
      name: n.name,
      compiledSql: n.compiled_code ?? n.compiled_sql ?? null,
      dependsOn: (n.depends_on?.nodes ?? []).filter((d) => d.startsWith("model.")),
    }));
}

export function parseRunResults(manifest: Manifest, runResults: RunResults): ParsedTestResult[] {
  return runResults.results
    .filter((r) => r.unique_id.startsWith("test."))
    .map((r) => {
      const testNode = manifest.nodes[r.unique_id];
      const modelUniqueId = testNode?.depends_on?.nodes?.find((d) => d.startsWith("model.")) ?? null;
      return {
        testUniqueId: r.unique_id,
        testName: testNode?.name ?? r.unique_id,
        modelUniqueId,
        status: normalizeStatus(r.status),
        failureMessage: r.message ?? null,
      };
    });
}

function normalizeStatus(status: string): "pass" | "fail" | "error" {
  if (status === "pass") return "pass";
  if (status === "error") return "error";
  return "fail"; // fail, warn -> treated as fail for our purposes
}

export function overallRunStatus(results: ParsedTestResult[]): "success" | "failed" | "partial" {
  if (results.length === 0) return "success";
  const failing = results.filter((r) => r.status !== "pass").length;
  if (failing === 0) return "success";
  if (failing === results.length) return "failed";
  return "partial";
}
