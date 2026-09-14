"use client";

import { useActionState, useState } from "react";
import { createProjectAction } from "@/lib/actions";
import styles from "./NewProjectForm.module.css";

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [, formAction, pending] = useActionState(async (prevState: { ok: boolean } | null, formData: FormData) => {
    const result = await createProjectAction(prevState, formData);
    if (result.ok) setOpen(false);
    return result;
  }, null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={styles.trigger}>
        <span aria-hidden>+</span>
        New project
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input name="name" placeholder="Project name" required autoFocus className={styles.input} />
      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={styles.cancel}>
        Cancel
      </button>
    </form>
  );
}
