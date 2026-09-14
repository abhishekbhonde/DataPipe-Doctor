#!/usr/bin/env node
// Wraps a dbt command, then pushes its own manifest.json/run_results.json to DataPipe Doctor.
// Usage: pipedoctor run [--project-dir <dir>] -- <dbt command...>
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== "run") {
    console.error("Usage: pipedoctor run [--project-dir <dir>] -- <dbt command...>");
    process.exit(1);
  }

  let projectDir = process.cwd();
  const dashIndex = args.indexOf("--");
  const flags = args.slice(1, dashIndex === -1 ? undefined : dashIndex);
  const dirFlagIndex = flags.indexOf("--project-dir");
  if (dirFlagIndex !== -1) projectDir = path.resolve(flags[dirFlagIndex + 1]);

  const command = dashIndex === -1 ? [] : args.slice(dashIndex + 1);
  if (command.length === 0) {
    console.error("No dbt command given. Example: pipedoctor run -- dbt build");
    process.exit(1);
  }

  const apiKey = process.env.PIPEDOCTOR_API_KEY;
  if (!apiKey) {
    console.error("PIPEDOCTOR_API_KEY is not set.");
    process.exit(1);
  }
  const apiUrl = process.env.PIPEDOCTOR_API_URL ?? "http://localhost:3000";

  const startedAt = new Date().toISOString();
  const exitCode = await runCommand(command, projectDir);
  const finishedAt = new Date().toISOString();

  const targetDir = path.join(projectDir, "target");
  let manifest: unknown;
  let runResults: unknown;
  try {
    [manifest, runResults] = await Promise.all([
      readJson(path.join(targetDir, "manifest.json")),
      readJson(path.join(targetDir, "run_results.json")),
    ]);
  } catch (err) {
    console.error(`\nCould not read dbt artifacts from ${targetDir}:`, (err as Error).message);
    process.exit(exitCode || 1);
  }

  console.log("\nPushing run results to DataPipe Doctor...");
  const res = await fetch(`${apiUrl}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-pipedoctor-key": apiKey },
    body: JSON.stringify({ startedAt, finishedAt, manifest, runResults }),
  });

  if (!res.ok) {
    console.error(`Ingest failed (${res.status}):`, await res.text());
    process.exit(exitCode || 1);
  }

  const summary = await res.json();
  console.log(
    `Run ${summary.status}: ${summary.testCount} tests, ${summary.failedCount} failed, ${summary.explainedCount} explained.`,
  );
  console.log(`View it at ${apiUrl}/dashboard`);

  process.exit(exitCode);
}

function runCommand(command: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { cwd, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
