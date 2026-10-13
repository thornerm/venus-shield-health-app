import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE = {
  blue: "bg-info/10 text-info",
  gold: "bg-primary/15 text-primary",
  red: "bg-blocked/10 text-blocked",
  amber: "bg-review/10 text-review",
  green: "bg-allow/10 text-allow",
};

const ICONS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };
const PILL = {
  allow: "bg-allow/10 text-allow",
  blocked: "bg-blocked/10 text-blocked",
  review: "bg-review/10 text-review",
  muted: "bg-muted text-muted-foreground",
};

export function TrendPill({ tone = "muted", icon = "flat", children }) {
  const Icon = ICONS[icon] || Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", PILL[tone] || PILL.muted)}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}

export default function MetricCard({ label, value, icon: Icon, tone = "blue", hint, trend, to, valueClassName }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="vs-eyebrow">{label}</span>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", TONE[tone] || TONE.blue)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className={cn("mt-3 font-heading text-[34px] font-bold leading-none tracking-tight text-foreground", valueClassName)}>
        {value}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {trend}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </>
  );

  const shell = cn("vs-card flex flex-col p-5", to && "vs-card-interactive");

  return to
    ? <Link to={to} className={shell}>{body}</Link>
    : <div className={shell}>{body}</div>;
}