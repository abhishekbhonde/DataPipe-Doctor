import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProject, listApiKeys } from "@/lib/db/queries";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions";
import { CreateApiKeyForm } from "@/components/CreateApiKeyForm";
import { RevokeKeyButton } from "@/components/RevokeKeyButton";
import { KeyIcon } from "@/components/icons";
import styles from "./page.module.css";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const project = await getProject(orgId, projectId);
  if (!project) return notFound();

  const keys = await listApiKeys(orgId, projectId);
  const boundCreate = createApiKeyAction.bind(null, projectId);

  return (
    <div>
      <div className={styles.head}>
        <p className={styles.crumb}>
          <Link href="/dashboard">Projects</Link> / <Link href={`/dashboard/${projectId}`}>{project.name}</Link> /
          Settings
        </p>
        <h1 className={styles.title}>API keys</h1>
        <p className={styles.hint}>
          Used by the <code>pipedoctor</code> CLI to push run results for this project. Each key is scoped to this
          project only.
        </p>
      </div>

      <CreateApiKeyForm action={boundCreate} />

      {keys.length > 0 && (
        <div className={styles.keysCard}>
          {keys.map((k) => (
            <div key={k.id} className={styles.keyRow}>
              <div className={styles.keyMain}>
                <span className={styles.keyIcon}>
                  <KeyIcon width={15} height={15} />
                </span>
                <div>
                  <p className={styles.keyName}>{k.name}</p>
                  <p className={styles.keyMeta}>
                    <code>{k.keyPrefix}…</code> · created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
              </div>
              <RevokeKeyButton keyName={k.name} onRevoke={revokeApiKeyAction.bind(null, projectId, k.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
