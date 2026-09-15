import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatTile from "@/components/StatTile";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Activity, Ban, Gauge, RefreshCw } from "lucide-react";

const DECISION_COLORS = { allow: "hsl(var(--allow))", approval_required: "hsl(var(--review))", blocked: "hsl(var(--blocked))" };

function computeStats(actions) {
  const byDate = {};
  const byAgent = {};
  let blocked = 0, allowed = 0, approval = 0, blastSum = 0;
  for (const a of actions) {
    const d = (a.created_date || "").slice(0, 10) || "unknown";
    if (!byDate[d]) byDate[d] = { date: d, total: 0, blocked: 0, blastSum: 0, allow: 0, approval: 0 };
    byDate[d].total++;
    byDate[d].blastSum += a.blast_radius_score || 0;
    if (a.decision === "blocked") { byDate[d].blocked++; blocked++; }
    else if (a.decision === "approval_required") { byDate[d].approval++; approval++; }
    else { byDate[d].allow++; allowed++; }
    blastSum += a.blast_radius_score || 0;

    const id = a.agent_id;
    if (!byAgent[id]) byAgent[id] = { name: a.agent_name || id, total: 0, blocked: 0, allowed: 0, blastSum: 0 };
    byAgent[id].total++;
    byAgent[id].blastSum += a.blast_radius_score || 0;
    if (a.decision === "blocked") byAgent[id].blocked++;
    else if (a.decision === "allow") byAgent[id].allowed++;
  }
  const timeSeries = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ date: d.date.slice(5), total: d.total, blocked: d.blocked, avgBlast: d.total ? +(d.blastSum / d.total).toFixed(2) : 0 }));
  const decisionBreakdown = [
    { name: "Allow", value: allowed, key: "allow" },
    { name: "Approval Required", value: approval, key: "approval_required" },
    { name: "Blocked", value: blocked, key: "blocked" },
  ].filter((x) => x.value > 0);
  const perAgent = Object.values(byAgent).map((a) => ({ ...a, avgBlast: a.total ? +(a.blastSum / a.total).toFixed(2) : 0, successRate: a.total ? Math.round((a.allowed / a.total) * 100) : 0 }));
  return {
    timeSeries,
    decisionBreakdown,
    perAgent,
    total: actions.length,
    blocked,
    allowed,
    approval,
    avgBlast: actions.length ? +(blastSum / actions.length).toFixed(2) : 0,
    successRate: actions.length ? Math.round((allowed / actions.length) * 100) : 0,
  };
}

export default function AgentPerformance() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const a = await base44.entities.ActionRecord.list("-created_date", 500);
    setActions(a || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const data = useMemo(() => computeStats(actions), [actions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Agent Performance</h1>
          <p className="text-sm text-muted-foreground">Trends in agent actions, block rates, and blast radius over time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Actions" value={data.total} icon={Activity} tone="blue" />
        <StatTile label="Success Rate" value={`${data.successRate}%`} icon={TrendingUp} tone="green" hint="allowed on first pass" />
        <StatTile label="Blocked" value={data.blocked} icon={Ban} tone="red" hint="passport violations" />
        <StatTile label="Avg Blast Radius" value={data.avgBlast} icon={Gauge} tone="amber" hint="across all actions" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Actions Over Time</CardTitle><CardDescription>Daily volume of evaluated actions.</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blocked" name="Blocked" stroke="hsl(var(--blocked))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Average Blast Radius Over Time</CardTitle><CardDescription>Risk severity trend per day.</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="avgBlast" name="Avg Blast" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Decision Breakdown</CardTitle><CardDescription>Distribution of verdicts.</CardDescription></CardHeader>
          <CardContent>
            {data.decisionBreakdown.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.decisionBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
                    {data.decisionBreakdown.map((entry) => <Cell key={entry.key} fill={DECISION_COLORS[entry.key]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verdict Volume</CardTitle><CardDescription>Allowed vs blocked actions.</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.decisionBreakdown} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.decisionBreakdown.map((entry) => <Cell key={entry.key} fill={DECISION_COLORS[entry.key]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-Agent Performance</CardTitle></CardHeader>
        <CardContent>
          {data.perAgent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No agent activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-center">Total Actions</TableHead>
                    <TableHead className="text-center">Blocked</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead className="text-center">Avg Blast Radius</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.perAgent.map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-center">{a.total}</TableCell>
                      <TableCell className="text-center">{a.blocked}</TableCell>
                      <TableCell className="text-center">
                        <span className={a.successRate >= 80 ? "font-medium text-allow" : a.successRate >= 50 ? "font-medium text-review" : "font-medium text-blocked"}>{a.successRate}%</span>
                      </TableCell>
                      <TableCell className="text-center">{a.avgBlast}/5</TableCell>
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