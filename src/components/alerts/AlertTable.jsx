import { useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SEVERITY_META, STATE_TONE } from "@/lib/alerts";
import { fmtDate } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { ArrowRight, Ban, ChevronDown, ClipboardCheck, ShieldAlert, TrendingDown, XCircle } from "lucide-react";

const CHIP = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold";

const KIND_ICON = {
  blocked: Ban,
  downgrade: TrendingDown,
  approval: ClipboardCheck,
  denied: XCircle,
  passport: ShieldAlert,
};

/**
 * The alert queue as a reviewable table. Each row expands to the reasoning
 * recorded behind the event, so the evidence stays on the same screen.
 */
export default function AlertTable({ alerts }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="vs-scroll overflow-x-auto">
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Event</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Policy</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.flatMap((alert) => {
            const severity = SEVERITY_META[alert.severity] || SEVERITY_META.medium;
            const state = alert.state || { label: "Open", tone: "muted" };
            const Icon = KIND_ICON[alert.kind] || ShieldAlert;
            const open = openId === alert.id;

            const rows = [
              <TableRow key={alert.id} className="transition-colors duration-200 hover:bg-surface/40">
                <TableCell className="pr-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : alert.id)}
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} details for ${alert.title}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
                  </button>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", severity.text)} />
                    <span className="text-[13px] font-medium text-foreground">{alert.title}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-[13px] text-foreground">{alert.agent || "—"}</div>
                  {alert.agent_id && <div className="font-mono text-[10px] text-muted-foreground">{alert.agent_id}</div>}
                </TableCell>

                <TableCell>
                  <span className={cn(CHIP, severity.cls)} title={severity.hint}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", severity.dot)} aria-hidden="true" />
                    {severity.label}
                  </span>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {alert.policy || <span className="text-muted-foreground/70">—</span>}
                </TableCell>

                <TableCell className="whitespace-nowrap text-xs text-muted-foreground" title={alert.when ? fmtDate(alert.when) : ""}>
                  {fmtDate(alert.when)}
                </TableCell>

                <TableCell>
                  <span className={cn(CHIP, STATE_TONE[state.tone] || STATE_TONE.muted)}>{state.label}</span>
                </TableCell>

                <TableCell className="text-right">
                  <Link to={alert.route} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Review <ArrowRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>,
            ];

            if (open) {
              rows.push(
                <TableRow key={`${alert.id}-reasoning`} className="bg-surface/30 hover:bg-surface/30">
                  <TableCell colSpan={8} className="p-0">
                    <div className="border-l-2 border-primary/60 px-5 py-4">
                      <div className="vs-eyebrow">Recorded reasoning</div>
                      <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">{alert.detail}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
                        <span>Event reference <span className="font-mono text-foreground">{alert.id}</span></span>
                        {alert.system && <span>System <span className="font-mono text-foreground">{alert.system}</span></span>}
                        <span>Recorded {fmtDate(alert.when)}</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            return rows;
          })}
        </TableBody>
      </Table>
    </div>
  );
}