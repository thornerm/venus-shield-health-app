import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatTile from "@/components/StatTile";
import AutonomyBadge from "@/components/AutonomyBadge";
import { RiskBadge } from "@/components/VerdictBadge";
import { riskForAgent } from "@/lib/governance";
import { Users, ClipboardCheck, Ban, AlertTriangle, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, r, ar] = await Promise.all([
      base44.entities.ShieldAgent.filter({ is_active: true }),
      base44.entities.AgentApprovalRequest.filter({ status: "pending" }),
      base44.entities.ActionRecord.list("-created_date", 200),
    ]);
    setAgents(a || []);
    setRequests(r || []);
    setActions(ar || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pendingActionApprovals = actions.filter((a) => a.status === "pending_approval").length;
  const blockedCount = actions.filter((a) => a.decision === "blocked").length;
  const highRisk = agents.filter((ag) => riskForAgent(ag, actions).level === "high").length;
  const pendingReviewAgentIds = new Set(requests.map((r) => r.agent_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Governance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time posture across all governed AI agents.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Under Governance" value={agents.length} icon={Users} tone="blue" hint="active agent passports" />
        <StatTile label="Pending Reviews" value={requests.length + pendingActionApprovals} icon={ClipboardCheck} tone="amber" hint={`${requests.length} agent · ${pendingActionApprovals} action`} />
        <StatTile label="Blocked Actions" value={blockedCount} icon={Ban} tone="red" hint="passport violations" />
        <StatTile label="High-Risk Agents" value={highRisk} icon={AlertTriangle} tone="red" hint="require attention" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Risk Posture</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading agents…</div>
          ) : agents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No agents registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Autonomy</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Risk Factors</TableHead>
                    <TableHead className="text-right">Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((ag) => {
                    const risk = riskForAgent(ag, actions);
                    return (
                      <TableRow key={ag.id}>
                        <TableCell>
                          <div className="font-medium">{ag.name}</div>
                          <div className="text-xs text-muted-foreground">{ag.agent_id}</div>
                        </TableCell>
                        <TableCell>
                          {pendingReviewAgentIds.has(ag.agent_id) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-review/10 px-2 py-0.5 text-xs font-medium text-review">Pending review</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-allow/10 px-2 py-0.5 text-xs font-medium text-allow">Cleared</span>
                          )}
                        </TableCell>
                        <TableCell><AutonomyBadge level={ag.autonomy_level} /></TableCell>
                        <TableCell><RiskBadge level={risk.level} /></TableCell>
                        <TableCell className="max-w-xs">
                          {risk.factors.length ? (
                            <span className="text-xs text-muted-foreground">{risk.factors.join(" · ")}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No active risk factors</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {risk.total} action{risk.total === 1 ? "" : "s"}
                          {risk.blocked > 0 && <span className="ml-1 text-blocked">({risk.blocked} blocked)</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}