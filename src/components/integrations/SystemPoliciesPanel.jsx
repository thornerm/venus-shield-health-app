import { Link } from "react-router-dom";
import Panel from "@/components/Panel";
import { VerdictBadge } from "@/components/VerdictBadge";
import { Scale, Info } from "lucide-react";

export default function SystemPoliciesPanel({ label, policies }) {
  return (
    <Panel
      title="Governing Policies"
      description={`Active policies that name ${label} directly.`}
      icon={Scale}
    >
      {policies.length === 0 ? (
        <div className="flex items-start gap-2 rounded-md bg-surface/60 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No active policy names this system. Activity here is covered only by policies that match on other criteria.
          </span>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {policies.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <Link to={`/policy-details/${p.id}`} className="truncate text-[13px] font-medium text-foreground hover:text-primary">
                {p.name}
              </Link>
              <VerdictBadge decision={p.required_decision} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}