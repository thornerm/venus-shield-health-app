import Panel from "@/components/Panel";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { METRIC_DEFINITIONS } from "@/lib/metrics";
import { cn } from "@/lib/utils";

function Row({ label, value, tone, tooltip }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {tooltip ? (
        <DefinitionTooltip term={label}>{tooltip}</DefinitionTooltip>
      ) : (
        <span className="text-[13px] text-muted-foreground">{label}</span>
      )}
      <span className={cn("text-[13px] font-semibold tabular-nums", tone || "text-foreground")}>{value}</span>
    </div>
  );
}

/**
 * Keeps governance verdicts (what the engine decided) separate from workflow
 * status (where the action sits in its lifecycle) so the totals reconcile.
 */
export default function DecisionSummary({ verdicts, statuses, requests, firstPassRate }) {
  return (
    <Panel
      title="Decisions"
      description={`Verdicts and lifecycle status are counted separately. ${verdicts.total} evaluations on record.`}
      contentClassName="px-5 py-4"
    >
      <div className="space-y-4">
        <div>
          <div className="vs-eyebrow mb-1.5">Verdicts</div>
          <Row label="Allow" value={verdicts.allow} tone="text-allow" />
          <Row label="Approval Required" value={verdicts.approval_required} tone="text-review" />
          <Row label="Blocked" value={verdicts.blocked} tone="text-blocked" />
          <Row
            label="First-pass Allow Rate"
            value={firstPassRate == null ? "—" : `${firstPassRate}%`}
            tone="text-foreground"
            tooltip={METRIC_DEFINITIONS.firstPassAllowRate}
          />
        </div>

        <div className="border-t border-border pt-4">
          <div className="vs-eyebrow mb-1.5">Workflow Status</div>
          <Row label="Executed" value={statuses.executed} />
          <Row label="Pending Approval" value={statuses.pending_approval} tone="text-review" />
          <Row label="Approved" value={statuses.approved} tone="text-allow" />
          <Row label="Denied" value={statuses.denied} tone="text-blocked" />
          <Row label="Blocked" value={statuses.blocked} tone="text-blocked" />
        </div>

        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          Passport requests: {requests.pending} pending · {requests.approved} approved · {requests.denied} denied
        </div>
      </div>
    </Panel>
  );
}