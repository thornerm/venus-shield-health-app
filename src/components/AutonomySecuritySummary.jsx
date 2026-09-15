import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Ban, Clock } from "lucide-react";

const LEVELS = [
  { key: "full", label: "Full", bar: "bg-blue-500" },
  { key: "standard", label: "Standard", bar: "bg-slate-400" },
  { key: "restricted", label: "Restricted", bar: "bg-amber-500" },
];

function fmt(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
}

function StatusStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5 text-center">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <div className="mt-1 font-heading text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AutonomySecuritySummary({ agents, actions }) {
  const total = agents.length || 1;
  const counts = { full: 0, standard: 0, restricted: 0 };
  for (const a of agents) counts[a.autonomy_level] = (counts[a.autonomy_level] || 0) + 1;

  const blocked = actions.filter((a) => a.decision === "blocked");
  const pending = actions.filter((a) => a.status === "pending_approval");
  const allowed = actions.filter((a) => a.decision === "allow");
  const recent = actions.filter((a) => a.decision === "blocked" || a.status === "pending_approval").slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Autonomy & Security Summary</CardTitle>
        <CardDescription>Agent distribution by autonomy level and recent security posture.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agents by Autonomy</div>
            <div className="space-y-3">
              {LEVELS.map((lvl) => {
                const c = counts[lvl.key] || 0;
                const pct = Math.round((c / total) * 100);
                return (
                  <div key={lvl.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{lvl.label}</span>
                      <span className="text-muted-foreground">{c} · {pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${lvl.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Security Status</div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <StatusStat icon={ShieldCheck} label="Allowed" value={allowed.length} tone="text-allow" />
              <StatusStat icon={Clock} label="Pending" value={pending.length} tone="text-review" />
              <StatusStat icon={Ban} label="Blocked" value={blocked.length} tone="text-blocked" />
            </div>
            <div className="space-y-1.5">
              {recent.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">No security incidents.</div>
              ) : recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {r.decision === "blocked" ? <Ban className="h-3 w-3 text-blocked" /> : <Clock className="h-3 w-3 text-review" />}
                    <span className="font-mono">{r.action_type}</span>
                    <span className="text-muted-foreground">{r.agent_name}</span>
                  </div>
                  <span className="text-muted-foreground">{fmt(r.created_date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}