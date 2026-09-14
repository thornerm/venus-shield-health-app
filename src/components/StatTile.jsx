export default function StatTile({ label, value, icon: Icon, tone = "default", hint }) {
  const toneCls = {
    default: "text-foreground",
    blue: "text-blue-600",
    amber: "text-review",
    red: "text-blocked",
    green: "text-allow",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className={`h-4 w-4 ${toneCls}`} />}
      </div>
      <div className={`mt-2 font-heading text-3xl font-bold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}