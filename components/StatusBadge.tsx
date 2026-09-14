const STATUS = {
  pass: { label: "Passed", icon: "✓" },
  success: { label: "Passed", icon: "✓" },
  fail: { label: "Failed", icon: "✕" },
  failed: { label: "Failed", icon: "✕" },
  error: { label: "Error", icon: "!" },
  partial: { label: "Partial", icon: "◐" },
} as const;

type Status = keyof typeof STATUS;

export function StatusBadge({ status }: { status: string }) {
  const key = (status in STATUS ? status : "error") as Status;
  const { label, icon } = STATUS[key];
  const variant = key === "pass" || key === "success" ? "good" : key === "partial" ? "warning" : "critical";

  return (
    <span
      data-variant={variant}
      className="pipedoctor-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    >
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}
