// Convenience for CLI-only setup (no browser needed): creates a project and an
// API key for it, same as clicking "New project" + "Generate API key" in the UI.
// Usage: npm run create-key -- <clerkOrgId> "<project name>"
import { createProject, createApiKey } from "../lib/db/queries";

async function main() {
  const [orgId, projectName] = process.argv.slice(2);
  if (!orgId || !projectName) {
    console.error('Usage: npm run create-key -- <clerkOrgId> "<project name>"');
    process.exit(1);
  }

  const project = await createProject(orgId, projectName);
  const key = await createApiKey(orgId, project.id, "CLI setup");

  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`API key: ${key.plaintext}`);
  console.log("\nSave this key now — it will not be shown again.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
