import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatTile from "@/components/StatTile";
import AutonomyBadge from "@/components/AutonomyBadge";
import FilterBar from "@/components/FilterBar";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { RiskBadge } from "@/components/VerdictBadge";
import { riskForAgent } from "@/lib/governance";
import { verdictCounts, statusCounts, requestStatusCounts, applyFilters, freshnessLabel, firstPassAllowRate, METRIC_DEFINITIONS } from "@/lib/metrics";
import { Users, ClipboardCheck, Ban, AlertTriangle, RefreshCw, ShieldCheck, Activity } from "lucide-react";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState("all");
  const [range, setRange] = useState("all");

  const load = async () => {
    setLoading(true);
    const [a, r, ar] = await Promise.all([
      base44.entities.ShieldAgent.list(),
      base44.entities.AgentApprovalRequest.list("-created_date", 200),
      base44.entities.ActionRecord.list("-created_date", 500),
    ]);
    setAgents(a || []);
    setRequests(r || []);
    setActions(ar || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fActions = useMemo(() => applyFilters(actions, { env, range }), [actions, env, range]);
  const fRequests = useMemo(() => applyFilters(requests, { env, range }), [requests, env, range]);

  const v = useMemo(() => verdictCounts(fActions), [fActions]);
  const s = useMemo(() => statusCounts(fActions), [fActions]);
  const rs = useMemo(() => requestStatusCounts(fRequests), [fRequests]);
  const fpr = firstPassAllowRate(fActions);

  const monitoredIds = useMemo(() => new Set(fActions.map((a) => a.agent_id)), [fActions]);
  const highRisk = agents.filter((ag) => riskForAgent(ag, fActions).level === "high").length;
  const pendingReviewAgentIds = new Set(fRequests.filter((r) => r.status === "pending").map((r) => r.agent_id));
  const freshness = freshnessLabel(fActions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Governance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time posture across all governed AI agents. Verdicts and workflow status are shown separately so totals reconcile.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verdicts <span className="text-xs font-normal text-muted-foreground">(governance decision · {v.total} evaluations)</span></CardTitle>
          <CardDescription>What the engine decided on each evaluated action. These sum to {v.total}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Allow" value={v.allow} icon={ShieldCheck} tone="green" hint="permitted on first pass" />
            <StatTile label="Approval Required" value={v.approval_required} icon={ClipboardCheck} tone="amber" hint="held for review" />
            <StatTile label="Blocked" value={v.blocked} icon={Ban} tone="red" hint="hard prohibition" />
            <div className="rounded-lg border border-border bg-card p-4">
              <DefinitionTooltip term="First-pass Allow Rate">{METRIC_DEFINITIONS.firstPassAllowRate}</DefinitionTooltip>
              <div className="mt-2 font-heading text-3xl font-bold text-allow">{fpr == null ? "Unknown" : `${fpr}%`}</div>
              <div className="mt-1 text-xs text-muted-foreground">of {v.total} evaluations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Status <span className="text-xs font-normal text-muted-foreground">(lifecycle state)</span></CardTitle>
          <CardDescription>Where each action sits in its lifecycle. Pending and denied are represented here, separate from verdicts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Executed" value={s.executed} icon={Activity} tone="green" />
            <StatTile label="Pending Approval" value={s.pending_approval} icon={ClipboardCheck} tone="amber" />
            <StatTile label="Approved" value={s.approved} icon={ShieldCheck} tone="green" />
            <StatTile label="Denied" value={s.denied} icon={Ban} tone="red" />
            <StatTile label="Blocked" value={s.blocked} icon={Ban} tone="red" />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Approval requests: {rs.pending} pending · {rs.approved} approved · {rs.denied} denied
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Registered Passports" value={agents.length} icon={Users} tone="blue" hint="provisioned in registry" />
        <StatTile label="Monitored Agents" value={monitoredIds.size} icon={Activity} tone="blue" hint="with ≥1 evaluated action" />
        <StatTile label="Pending Reviews" value={rs.pending + s.pending_approval} icon={ClipboardCheck} tone="amber" hint={`${rs.pending} agent · ${s.pending_approval} action`} />
        <StatTile label="High-Risk Agents" value={highRisk} icon={AlertTriangle} tone="red" hint="blocked actions on record" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Risk Posture</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <DefinitionTooltip term="Risk">{METRIC_DEFINITIONS.observedBehavior} {METRIC_DEFINITIONS.protectiveControls}</DefinitionTooltip>
          </CardDescription>
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
                    const risk = riskForAgent(ag, fActions);
                    const monitored = monitoredIds.has(ag.agent_id);
                    return (
                      <TableRow key={ag.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Link to={`/passports/${ag.id}`} className="font-medium hover:underline">{ag.name}</Link>
                            {!monitored && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">no activity</span>}
                          </div>
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
                          {risk.factors.length ? <span className="text-xs text-muted-foreground">{risk.factors.join(" · ")}</span> : <span className="text-xs text-muted-foreground">No active risk factors</span>}
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