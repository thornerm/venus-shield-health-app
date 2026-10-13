import { Button } from "@/components/ui/button";
import Panel from "@/components/Panel";
import { ageLabel } from "@/lib/metrics";
import { AlertTriangle, UserPlus } from "lucide-react";

/**
 * Decisions recorded against an email that is not a registered team member.
 * Shown so the roster's decision counts reconcile with the full decision history.
 */
export default function UnlinkedIdentitiesPanel({ identities, onInvite }) {
  if (identities.length === 0) return null;

  return (
    <Panel
      title="Decisions Without a Roster Match"
      description="Recorded against an address that is not a registered team member, so the history is not attributed to anyone on the roster. Inviting that address links it."
      icon={AlertTriangle}
      contentClassName="p-0"
    >
      <div className="divide-y divide-border">
        {identities.map((identity) => (
          <div key={identity.email || identity.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">{identity.name || identity.email}</div>
              <div className="truncate text-[11px] text-muted-foreground">{identity.email || "no email on record"}</div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="text-right">
                <div className="text-[13px] tabular-nums text-foreground">{identity.decisions}</div>
                <div className="vs-eyebrow">decisions</div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-[13px] text-muted-foreground">{identity.lastDecision ? ageLabel(identity.lastDecision) : "—"}</div>
                <div className="vs-eyebrow">last</div>
              </div>
              {identity.email && (
                <Button size="sm" variant="outline" onClick={() => onInvite(identity.email)}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" /> Invite
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}