interface RunPoint {
  id: string;
  startedAt: Date | string;
  passCount: number;
  failCount: number;
}

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";

export function RunTrendChart({ runs }: { runs: RunPoint[] }) {
  if (runs.length === 0) return null;

  // Oldest first, so the chart reads left-to-right as time passing.
  const ordered = [...runs].reverse();
  const barWidth = 18;
  const gap = 6;
  const height = 96;
  const maxTotal = Math.max(1, ...ordered.map((r) => r.passCount + r.failCount));
  const width = ordered.length * (barWidth + gap);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-black/60 dark:text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GOOD }} />
          Passed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CRITICAL }} />
          Failed
        </span>
      </div>
      <svg width={width} height={height} role="img" aria-label="Pass/fail test counts per run over time">
        {ordered.map((run, i) => {
          const total = run.passCount + run.failCount;
          const passH = total === 0 ? 0 : (run.passCount / maxTotal) * (height - 8);
          const failH = total === 0 ? 0 : (run.failCount / maxTotal) * (height - 8);
          const x = i * (barWidth + gap);
          const failY = height - failH;
          const passY = failY - (failH > 0 && passH > 0 ? 2 : 0) - passH;
          return (
            <g key={run.id}>
              <title>
                {new Date(run.startedAt).toLocaleString()} — {run.passCount} passed, {run.failCount} failed
              </title>
              {passH > 0 && (
                <rect x={x} y={passY} width={barWidth} height={passH} rx={4} fill={GOOD} />
              )}
              {failH > 0 && (
                <rect x={x} y={failY} width={barWidth} height={failH} rx={4} fill={CRITICAL} />
              )}
              {total === 0 && <rect x={x} y={height - 4} width={barWidth} height={4} rx={2} fill="currentColor" opacity={0.15} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
