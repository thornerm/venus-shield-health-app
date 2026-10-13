import Panel from "@/components/Panel";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { displayUid, fmtDate } from "@/lib/metrics";
import { Activity } from "lucide-react";

export default function SystemActivityPanel({ label, operations, records }) {
  return (
    <Panel
      title="Observed Activity"
      description={`What agents have done against ${label}, newest first.`}
      icon={Activity}
    >
      {records.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No governed action has targeted this system yet.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {operations.map((o) => (
              <span key={o.name} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs">
                <span className="font-mono text-foreground">{o.name}</span>
                <span className="tabular-nums text-muted-foreground">{o.count}</span>
              </span>
            ))}
          </div>

          <div className="mt-4 divide-y divide-border border-t border-border">
            {records.slice(0, 10).map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-foreground">{a.action_type}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {a.agent_name} · {displayUid(a, "ACT")} · {fmtDate(a.created_date)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <VerdictBadge decision={a.decision} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>

          {records.length > 10 && (
            <p className="mt-3 text-xs text-muted-foreground">Showing the 10 most recent of {records.length} actions.</p>
          )}
        </>
      )}
    </Panel>
  );
}