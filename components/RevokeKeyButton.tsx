"use client";

import { useTransition } from "react";
import styles from "./RevokeKeyButton.module.css";

export function RevokeKeyButton({ keyName, onRevoke }: { keyName: string; onRevoke: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={styles.button}
      onClick={() => {
        if (!window.confirm(`Revoke "${keyName}"? Any CI job still using it will get 401 Unauthorized.`)) return;
        startTransition(onRevoke);
      }}
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
