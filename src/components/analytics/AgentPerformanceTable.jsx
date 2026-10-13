import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Panel from "@/components/Panel";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { METRIC_DEFINITIONS } from "@/lib/metrics";
import { RISK_META } from "@/lib/governance";
import { Bot } from "lucide-react";

const RISK_CHIP = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

const DEFINITIONS = (
  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <DefinitionTooltip term="Inherent exposure">{METRIC_DEFINITIONS.inherentExposure}</DefinitionTooltip>
    <DefinitionTooltip term="Observed behaviour">{METRIC_DEFINITIONS.observedBehavior}</DefinitionTooltip>
    <DefinitionTooltip term="Protective controls">{METRIC_DEFINITIONS.protectiveControls}</DefinitionTooltip>
  </span>
);

export default function AgentPerformanceTable({ rows, loading }) {
  return (
    <Panel
      title="Per-Agent Performance"
      description={DEFINITIONS}
      icon={Bot}
      contentClassName="p-0"
    >
      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading agent performance…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">No agent activity in this range.</div>
      ) : (
        <div className="vs-scroll overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Blocked</TableHead>
                <TableHead className="text-center">First-pass Allow</TableHead>
                <TableHead>Observed Behaviour</TableHead>
                <TableHead>Inherent Exposure</TableHead>
                <TableHead>Protective Controls</TableHead>
                <TableHead className="text-center">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id} className="transition-colors duration-200 hover:bg-surface/40">
                  <TableCell>
                    <div className="text-[13px] font-medium text-foreground">{a.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{a.id}</div>
                  </TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums text-foreground">{a.total}</TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums text-blocked">{a.blocked}</TableCell>
                  <TableCell className="text-center text-[13px] font-medium tabular-nums">
                    <span className={a.firstPass == null ? "text-muted-foreground" : a.firstPass >= 80 ? "text-allow" : a.firstPass >= 50 ? "text-review" : "text-blocked"}>
                      {a.firstPass == null ? "Unknown" : `${a.firstPass}%`}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.observed.join(", ") || "none"}</TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.exposure.join(", ") || "none"}</TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.controls.join(", ") || "none"}</TableCell>
                  <TableCell className="text-center">
                    {a.risk ? <span className={`${RISK_CHIP} ${RISK_META[a.risk.level].className}`}>{RISK_META[a.risk.level].label}</span> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}