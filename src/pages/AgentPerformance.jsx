import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FilterBar from "@/components/FilterBar";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { riskForAgent, RISK_META } from "@/lib/governance";
import { verdictCounts, applyFilters, firstPassAllowRate, executionSuccessRate, blastRadiusExplanation, freshnessLabel, METRIC_DEFINITIONS } from "@/lib/metrics";
import { Activity, Ban, Gauge, RefreshCw } from "lucide-react";

const DECISION_COLORS = { allow: "hsl(var(--allow))", approval_required: "hsl(var(--review))", blocked: "hsl(var(--blocked))" };

function computeTimeSeries(actions) {
  const byDate = {};
  for (const a of actions) {
    const d = (a.created_date || "").slice(0, 10) || "unknown";
    if (!byDate[d]) byDate[d] = { date: d, total: 0, blocked: 0 };
    byDate[d].total++;
    if (a.decision === "blocked") byDate[d].blocked++;
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ date: d.date.slice(5), total: d.total, blocked: d.blocked }));
}

export default function AgentPerformance() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState("all");
  const [range, setRange] = useState("all");

  const load = async () => {
    setLoading(true);
    const [a, ag] = await Promise.all([
      base44.entities.ActionRecord.list("-created_date", 500),
      base44.entities.ShieldAgent.list(),
    ]);
    setActions(a || []);
    setAgents(ag || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fActions = useMemo(() => applyFilters(actions, { env, range }), [actions, env, range]);
  const v = useMemo(() => verdictCounts(fActions), [fActions]);
  const fpr = firstPassAllowRate(fActions);
  const exr = useMemo(() => executionSuccessRate(fActions), [fActions]);
  const timeSeries = useMemo(() => computeTimeSeries(fActions), [fActions]);
  const freshness = freshnessLabel(fActions);

  const decisionBreakdown = [
    { name: "Allow", value: v.allow, key: "allow" },
    { name: "Approval Required", value: v.approval_required, key: "approval_required" },
    { name: "Blocked", value: v.blocked, key: "blocked" },
  ].filter((x) => x.value > 0);

  const perAgent = useMemo(() => {
    const map = {};
    for (const a of fActions) {
      if (!map[a.agent_id]) map[a.agent_id] = { name: a.agent_name || a.agent_id, id: a.agent_id, total: 0, blocked: 0, allowed: 0 };
      map[a.agent_id].total++;
      if (a.decision === "blocked") map[a.agent_id].blocked++;
      if (a.decision === "allow") map[a.agent_id].allowed++;
    }
    return Object.values(map).map((a) => {
      const agent = agents.find((x) => x.agent_id === a.id);
      const risk = agent ? riskForAgent(agent, fActions) : null;
      return { ...a, firstPass: a.total ? Math.round((a.allowed / a.total) * 100) : null, risk };
    });
  }, [fActions, agents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Agent Performance</h1>
          <p className="text-sm text-muted-foreground">Trends in agent actions, verdict rates, and blast radius. Risk separates inherent exposure, observed behavior, and protective controls.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Actions</span>
          <div className="mt-2 flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><span className="font-heading text-3xl font-bold">{v.total}</span></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <DefinitionTooltip term="First-pass Allow Rate">{METRIC_DEFINITIONS.firstPassAllowRate}</DefinitionTooltip>
          <div className="mt-2 font-heading text-3xl font-bold text-allow">{fpr == null ? "Unknown" : `${fpr}%`}</div>
          <div className="mt-1 text-xs text-muted-foreground">{v.allow} of {v.total} allowed</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <DefinitionTooltip term="Execution Success Rate">{METRIC_DEFINITIONS.executionSuccessRate}</DefinitionTooltip>
          <div className="mt-2 font-heading text-3xl font-bold text-foreground">{exr.hasConfirmed ? `${exr.rate}%` : "Unknown"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{exr.hasConfirmed ? `${exr.succeeded}/${exr.total} confirmed` : "no confirmed outcomes"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Blocked</span>
          <div className="mt-2 flex items-center gap-2"><Ban className="h-5 w-5 text-blocked" /><span className="font-heading text-3xl font-bold text-blocked">{v.blocked}</span></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4 text-primary" /> Blast Radius Scoring</CardTitle>
          <CardDescription className="text-xs">{METRIC_DEFINITIONS.blastRadius}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="rounded-md border border-border p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s >= 4 ? "bg-blocked/10 text-blocked" : s === 3 ? "bg-review/10 text-review" : "bg-allow/10 text-allow"}`}>{s}</span>
                  <span className="text-xs font-medium">{["Isolated", "Limited", "Material", "Major", "Enterprise"][s - 1]}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{blastRadiusExplanation(s).split(": ")[1]}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Actions Over Time</CardTitle><CardDescription>Daily volume of evaluated actions.</CardDescription></CardHeader>
          <CardContent>
            {timeSeries.length === 0 ? <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No data</div> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="blocked" name="Blocked" stroke="hsl(var(--blocked))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Decision Breakdown</CardTitle><CardDescription>Distribution of verdicts (sum = {v.total}).</CardDescription></CardHeader>
          <CardContent>
            {decisionBreakdown.length === 0 ? <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No data</div> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={decisionBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
                    {decisionBreakdown.map((entry) => <Cell key={entry.key} fill={DECISION_COLORS[entry.key]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Agent Performance</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <DefinitionTooltip term="Inherent exposure">{METRIC_DEFINITIONS.inherentExposure}</DefinitionTooltip>
            <DefinitionTooltip term="Observed behavior">{METRIC_DEFINITIONS.observedBehavior}</DefinitionTooltip>
            <DefinitionTooltip term="Protective controls">{METRIC_DEFINITIONS.protectiveControls}</DefinitionTooltip>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perAgent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No agent activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Blocked</TableHead>
                    <TableHead className="text-center">First-pass Allow</TableHead>
                    <TableHead>Observed Behavior</TableHead>
                    <TableHead>Inherent Exposure</TableHead>
                    <TableHead>Protective Controls</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perAgent.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-center">{a.total}</TableCell>
                      <TableCell className="text-center">{a.blocked}</TableCell>
                      <TableCell className="text-center">
                        <span className={a.firstPass == null ? "text-muted-foreground" : a.firstPass >= 80 ? "font-medium text-allow" : a.firstPass >= 50 ? "font-medium text-review" : "font-medium text-blocked"}>{a.firstPass == null ? "Unknown" : `${a.firstPass}%`}</span>
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.observed.join(", ") || "none"}</TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.exposure.join(", ") || "none"}</TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">{a.risk?.controls.join(", ") || "none"}</TableCell>
                      <TableCell className="text-center">{a.risk ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_META[a.risk.level].className}`}>{RISK_META[a.risk.level].label}</span> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}