import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProject, listApiKeys } from "@/lib/db/queries";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions";
import { CreateApiKeyForm } from "@/components/CreateApiKeyForm";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const project = await getProject(orgId, projectId);
  if (!project) return notFound();

  const keys = await listApiKeys(orgId, projectId);
  const boundCreate = createApiKeyAction.bind(null, projectId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-black/50 dark:text-white/50">
          <Link href="/dashboard" className="hover:underline">
            Projects
          </Link>{" "}
          /{" "}
          <Link href={`/dashboard/${projectId}`} className="hover:underline">
            {project.name}
          </Link>{" "}
          / Settings
        </p>
        <h1 className="text-xl font-semibold">API keys</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Used by the <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">pipedoctor</code> CLI to push
          run results for this project. Each key is scoped to this project only.
        </p>
      </div>

      <CreateApiKeyForm action={boundCreate} />

      {keys.length > 0 && (
        <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-black/50 dark:text-white/50">
                  {k.keyPrefix}… · created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </p>
              </div>
              <form action={revokeApiKeyAction.bind(null, projectId, k.id)}>
                <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
                  Revoke
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
