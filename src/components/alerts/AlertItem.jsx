import { Link } from "react-router-dom";
import { ArrowRight, Ban, ClipboardCheck, ShieldAlert, TrendingDown, XCircle } from "lucide-react";
import { SEVERITY_META } from "@/lib/alerts";
import { ageLabel } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  blocked: Ban,
  downgrade: TrendingDown,
  approval: ClipboardCheck,
  denied: XCircle,
  passport: ShieldAlert,
};

export default function AlertItem({ alert }) {
  const severity = SEVERITY_META[alert.severity] || SEVERITY_META.medium;
  const Icon = KIND_ICON[alert.kind] || ShieldAlert;

  return (
    <div className="flex flex-wrap items-start gap-3 px-5 py-4 transition-colors duration-200 hover:bg-surface/40">
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", severity.cls)}>
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", severity.cls)}>
            {severity.label}
          </span>
          <span className="text-[13px] font-medium text-foreground">{alert.title}</span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.detail}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {alert.agent && <span>{alert.agent}{alert.agent_id ? ` · ${alert.agent_id}` : ""}</span>}
          {alert.system && <span className="font-mono">{alert.system}</span>}
          {alert.when && <span>{ageLabel(alert.when)}</span>}
        </div>
      </div>

      <Link to={alert.route} className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
        Review <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}