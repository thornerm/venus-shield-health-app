import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AutonomyBadge from "@/components/AutonomyBadge";
import { ShieldCheck, DollarSign, Ban, Database, RefreshCw } from "lucide-react";

function Chip({ children, tone = "default" }) {
  const cls = tone === "ban" ? "bg-blocked/10 text-blocked" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function AgentPassports() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const a = await base44.entities.ShieldAgent.filter({ is_active: true });
    setAgents(a || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Agent Passports</h1>
          <p className="text-sm text-muted-foreground">Registered agents and their governance boundaries. Hover an autonomy badge for its definition.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading passports…</div>
      ) : agents.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No agent passports provisioned yet. Register and approve an agent to begin.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((ag) => (
            <Card key={ag.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{ag.name}</CardTitle>
                      <CardDescription className="text-xs">{ag.agent_id}</CardDescription>
                    </div>
                  </div>
                  <AutonomyBadge level={ag.autonomy_level} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <p className="text-muted-foreground">{ag.purpose}</p>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Database className="h-3 w-3" /> Authorized Systems</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(ag.systems || []).length ? ag.systems.map((s) => <Chip key={s}>{s}</Chip>) : <span className="text-xs text-muted-foreground">none</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Financial limit</span>
                  <span className="ml-auto font-medium">${Number(ag.financial_limit_usd || 0).toLocaleString()}</span>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Ban className="h-3 w-3" /> Prohibited Actions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(ag.prohibited_actions || []).length ? ag.prohibited_actions.map((p) => <Chip key={p} tone="ban">{p}</Chip>) : <span className="text-xs text-muted-foreground">none</span>}
                  </div>
                </div>

                {ag.data_permissions?.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Permissions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ag.data_permissions.map((p) => <Chip key={p}>{p}</Chip>)}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                  Owner: {ag.owner_name} · {ag.owner_email}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}