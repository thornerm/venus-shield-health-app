export default function TopOffenders({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No violations recorded.</p>
      ) : (
        rows.map((r) => (
          <div key={r.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{r.name}</span>
              <span className="tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface">
              <div className="h-full rounded-full bg-blocked" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}