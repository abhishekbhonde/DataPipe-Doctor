"use client";

import { useActionState, useState } from "react";
import { createProjectAction } from "@/lib/actions";

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [, formAction, pending] = useActionState(async (prevState: { ok: boolean } | null, formData: FormData) => {
    const result = await createProjectAction(prevState, formData);
    if (result.ok) setOpen(false);
    return result;
  }, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <span aria-hidden>+</span>
        New project
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="name"
        placeholder="Project name"
        required
        autoFocus
        className="h-9 w-56 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
