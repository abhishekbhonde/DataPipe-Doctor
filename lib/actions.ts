"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createProject, createApiKey, revokeApiKey } from "@/lib/db/queries";

async function requireOrgId() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("No active organization");
  return orgId;
}

export async function createProjectAction(
  _prevState: { ok: boolean } | null,
  formData: FormData,
): Promise<{ ok: boolean }> {
  const orgId = await requireOrgId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Project name is required");
  await createProject(orgId, name);
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface CreateApiKeyState {
  plaintext: string;
  name: string;
  keyPrefix: string;
}

export async function createApiKeyAction(
  projectId: string,
  _prevState: CreateApiKeyState | null,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const orgId = await requireOrgId();
  const name = String(formData.get("name") ?? "").trim() || "Default key";
  const key = await createApiKey(orgId, projectId, name);
  revalidatePath(`/dashboard/${projectId}/settings`);
  return key;
}

export async function revokeApiKeyAction(projectId: string, keyId: string) {
  const orgId = await requireOrgId();
  await revokeApiKey(orgId, keyId);
  revalidatePath(`/dashboard/${projectId}/settings`);
}
