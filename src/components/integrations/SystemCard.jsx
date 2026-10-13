import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { INTEGRATION_STATUS } from "@/lib/integrations";
import { ageLabel } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import {
  BookOpen, Clock, CreditCard, Github, Globe, Headphones, Landmark, Linkedin,
  Mail, MessageSquare, Scale, ScrollText, Server, Settings2, ShieldCheck, Ban,
} from "lucide-react";

const CHIP = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold";

// Each system keeps its own mark; anything unmapped falls back to a generic node.
const ICONS = {
  billing: CreditCard,
  stripe: CreditCard,
  crm: Landmark,
  salesforce: Landmark,
  email: Mail,
  helpdesk: Headphones,
  slack: MessageSquare,
  internal_kb: BookOpen,
  linkedin: Linkedin,
  governance: Scale,
  audit_trail: ScrollText,
  external_endpoint: Globe,
  github: Github,
};

function Metric({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <div className="vs-eyebrow">{label}</div>
      <div className={cn("mt-1 font-heading text-[17px] font-bold leading-none tabular-nums", tone || "text-foreground")}>{value}</div>
    </div>
  );
}

function Line({ icon: Icon, children, tone }) {
  return (
    <div className={cn("flex items-start gap-1.5 text-[11px] leading-relaxed", tone || "text-muted-foreground")}>
      <Icon className="mt-[2px] h-3 w-3 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** One connected system, presented as a provider card. */
export default function SystemCard({ system }) {
  const Icon = ICONS[system.key] || Server;
  const status = INTEGRATION_STATUS[system.status] || INTEGRATION_STATUS.idle;

  return (
    <div className="vs-card vs-card-interactive flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <h3 className="min-w-0 truncate font-heading text-[15px] font-semibold tracking-tight text-foreground">
              {system.label}
            </h3>
            <span className={cn(CHIP, status.cls)} title={status.hint}>
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden="true" />
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{system.description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border py-3.5">
        <Metric label="Agents" value={system.agentsInvolved.length} />
        <Metric label="Actions" value={system.total} />
        <Metric label="Blocked" value={system.blocked} tone={system.blocked > 0 ? "text-blocked" : "text-muted-foreground"} />
      </div>

      <div className="mt-3.5 space-y-1.5">
        <Line icon={ShieldCheck}>
          {system.lastSuccessIso
            ? `Last successful action ${ageLabel(system.lastSuccessIso)}`
            : "No confirmed success on record"}
        </Line>
        <Line icon={Clock}>
          {system.lastActivityIso ? `Last activity ${ageLabel(system.lastActivityIso)}` : "No activity recorded yet"}
        </Line>
        <Line icon={Scale} tone={system.policies.length === 0 && system.total > 0 ? "text-review" : "text-muted-foreground"}>
          {system.policies.length > 0
            ? `${system.policies.length} governing polic${system.policies.length === 1 ? "y" : "ies"}`
            : system.total > 0
              ? "Carrying activity with no governing policy"
              : "No policy names this system"}
        </Line>
        {system.failed > 0 && (
          <Line icon={Ban} tone="text-blocked">
            {system.failed} failed execution{system.failed === 1 ? "" : "s"} recorded
          </Line>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          {system.category}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link to={`/integrations/${system.key}`}>
            <Settings2 className="mr-2 h-3.5 w-3.5" /> Configure
          </Link>
        </Button>
      </div>
    </div>
  );
}