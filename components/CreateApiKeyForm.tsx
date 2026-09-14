"use client";

import { useActionState } from "react";
import type { CreateApiKeyState } from "@/lib/actions";

export function CreateApiKeyForm({
  action,
}: {
  action: (prevState: CreateApiKeyState | null, formData: FormData) => Promise<CreateApiKeyState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex gap-2">
        <input
          name="name"
          placeholder="Key name (e.g. CI)"
          className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate API key"}
        </button>
      </form>

      {state && (
        <div className="rounded-md border border-black/15 bg-black/[0.03] p-3 text-sm dark:border-white/20 dark:bg-white/[0.05]">
          <p className="mb-1 font-medium">Copy this key now — it won&apos;t be shown again.</p>
          <code className="block break-all rounded bg-black/5 px-2 py-1 dark:bg-white/10">{state.plaintext}</code>
        </div>
      )}
    </div>
  );
}
