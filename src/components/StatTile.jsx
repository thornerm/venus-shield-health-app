import { cn } from "@/lib/utils";

const TONE = {
  default: { icon: "text-muted-foreground", value: "text-foreground", ring: "bg-muted" },
  blue: { icon: "text-info", value: "text-foreground", ring: "bg-info/10" },
  amber: { icon: "text-review", value: "text-review", ring: "bg-review/10" },
  high: { icon: "text-high", value: "text-high", ring: "bg-high/10" },
  red: { icon: "text-blocked", value: "text-blocked", ring: "bg-blocked/10" },
  green: { icon: "text-allow", value: "text-allow", ring: "bg-allow/10" },
};

export default function StatTile({ label, value, icon: Icon, tone = "default", hint }) {
  const t = TONE[tone] || TONE.default;
  return (
    <div className="vs-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="vs-eyebrow">{label}</span>
        {Icon && (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", t.ring)}>
            <Icon className={cn("h-3.5 w-3.5", t.icon)} />
          </span>
        )}
      </div>
      <div className={cn("mt-2.5 font-heading text-[28px] font-bold leading-none tracking-tight", t.value)}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}