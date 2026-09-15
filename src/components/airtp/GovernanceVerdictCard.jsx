import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictBadge } from "@/components/VerdictBadge";
import { Activity, ShieldCheck, AlertTriangle, ScanSearch, Mail } from "lucide-react";

const REV_META = {
  reversible: { label: "Reversible", cls: "text-allow" },
  partially_reversible: { label: "Partially Reversible", cls: "text-review" },
  irreversible: { label: "Irreversible", cls: "text-blocked" },
};

function Metric({ icon: Icon, label, value, valueCls = "text-foreground" }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 font-heading text-lg font-semibold ${valueCls}`}>{value}</div>
    </div>
  );
}

export default function GovernanceVerdictCard({ result }) {
  if (!result) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Governance Verdict</CardTitle>
          <VerdictBadge decision={result.decision} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={Activity} label="Blast Radius" value={`${result.blast_radius_score}/5`} />
          <Metric
            icon={ShieldCheck}
            label="Reversibility"
            value={REV_META[result.reversibility]?.label || result.reversibility}
            valueCls={REV_META[result.reversibility]?.cls}
          />
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Matched Policy</div>
          <div className="mt-1 font-medium">{result.record.policy_matched_name || "No explicit policy — passport rules"}</div>
          {result.record.policy_matched_priority != null && (
            <div className="text-xs text-muted-foreground">Priority {result.record.policy_matched_priority}</div>
          )}
        </div>
        {result.record.autonomy_downgraded && (
          <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">
            <AlertTriangle className="h-4 w-4" />
            Autonomy ratcheted: <span className="font-medium capitalize">{result.record.previous_autonomy_level}</span> →{" "}
            <span className="font-medium capitalize">{result.record.new_autonomy_level}</span>
          </div>
        )}
        {result.record.alert_owner && (
          <div className="flex items-center gap-2 rounded-md bg-review/10 px-3 py-2 text-sm text-review">
            <AlertTriangle className="h-4 w-4" /> Agent owner alerted.
          </div>
        )}
        {result.notification?.sent && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            <Mail className="h-4 w-4" /> Security team notified by email.
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ScanSearch className="h-4 w-4 text-primary" /> Reasoning Trace
          </div>
          <ol className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
            {result.record.reasons.map((r, i) => (
              <li key={i} className="font-mono text-xs leading-relaxed text-muted-foreground">{r}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}