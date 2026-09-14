"use client";

import { useActionState, useState } from "react";
import type { CreateApiKeyState } from "@/lib/actions";
import styles from "./CreateApiKeyForm.module.css";

export function CreateApiKeyForm({
  action,
}: {
  action: (prevState: CreateApiKeyState | null, formData: FormData) => Promise<CreateApiKeyState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.wrap}>
      <form
        action={formAction}
        className={styles.form}
        onSubmit={() => setCopied(false)}
      >
        <input name="name" placeholder="Key name (e.g. CI)" className={styles.input} />
        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? "Generating…" : "Generate API key"}
        </button>
      </form>

      {state && (
        <div className={styles.result}>
          <p className={styles.resultHint}>Copy this key now — it won&apos;t be shown again.</p>
          <div className={styles.keyRow}>
            <code className={styles.key}>{state.plaintext}</code>
            <button
              type="button"
              className={styles.copy}
              onClick={() => {
                navigator.clipboard.writeText(state.plaintext);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
