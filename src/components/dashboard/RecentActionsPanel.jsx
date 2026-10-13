import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Panel from "@/components/Panel";
import { StatusBadge } from "@/components/VerdictBadge";
import { ageLabel } from "@/lib/metrics";

const MAX_ROWS = 8;

export default function RecentActionsPanel({ actions }) {
  const rows = actions.slice(0, MAX_ROWS);

  return (
    <Panel
      title="Recent Actions"
      description="The latest evaluated agent actions and how governance resolved them."
      action={
        <Link to="/audit" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      }
      contentClassName="p-0"
    >
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">No evaluated actions yet.</div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-surface/40">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground">
                  {a.agent_name || a.agent_id}
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-normal text-muted-foreground">{a.action_type}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{a.target_system}</div>
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{ageLabel(a.created_date)}</span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}