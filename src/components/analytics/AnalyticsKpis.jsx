import MetricCard from "@/components/dashboard/MetricCard";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { METRIC_DEFINITIONS } from "@/lib/metrics";
import { Activity, Ban, Gauge, CheckCircle2 } from "lucide-react";

export default function AnalyticsKpis({ verdicts, firstPass, execution }) {
  const blockedShare = verdicts.total ? Math.round((verdicts.blocked / verdicts.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Evaluated Actions"
        value={verdicts.total}
        icon={Activity}
        tone="blue"
        hint={`${verdicts.allow} allow · ${verdicts.blocked} blocked`}
      />
      <MetricCard
        label={<DefinitionTooltip term="First-pass Allow Rate">{METRIC_DEFINITIONS.firstPassAllowRate}</DefinitionTooltip>}
        value={firstPass == null ? "—" : `${firstPass}%`}
        icon={Gauge}
        tone="green"
        valueClassName={firstPass == null ? "text-muted-foreground" : "text-allow"}
        hint={verdicts.total ? `${verdicts.allow} of ${verdicts.total} allowed` : "no evaluations in range"}
      />
      <MetricCard
        label={<DefinitionTooltip term="Execution Success Rate">{METRIC_DEFINITIONS.executionSuccessRate}</DefinitionTooltip>}
        value={execution.hasConfirmed ? `${execution.rate}%` : "—"}
        icon={CheckCircle2}
        tone="gold"
        valueClassName={execution.hasConfirmed ? undefined : "text-muted-foreground"}
        hint={execution.hasConfirmed ? `${execution.succeeded}/${execution.total} confirmed` : "no confirmed outcomes"}
      />
      <MetricCard
        label="Blocked"
        value={verdicts.blocked}
        icon={Ban}
        tone="red"
        valueClassName="text-blocked"
        hint={`${blockedShare}% of all evaluations`}
      />
    </div>
  );
}