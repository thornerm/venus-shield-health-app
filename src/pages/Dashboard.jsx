import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AutonomyBadge from "@/components/AutonomyBadge";
import FilterBar from "@/components/FilterBar";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { RiskBadge } from "@/components/VerdictBadge";
import DashboardHero from "@/components/dashboard/DashboardHero";
import MetricCard, { TrendPill } from "@/components/dashboard/MetricCard";
import AgentActivityChart from "@/components/dashboard/AgentActivityChart";
import RecentActionsPanel from "@/components/dashboard/RecentActionsPanel";
import SkeletonRows from "@/components/SkeletonRows";
import { Skeleton } from "@/components/ui/skeleton";
import RiskOverview from "@/components/dashboard/RiskOverview";
import DecisionSummary from "@/components/dashboard/DecisionSummary";
import { riskForAgent } from "@/lib/governance";
import {
  verdictCounts, statusCounts, requestStatusCounts, applyFilters,
  freshnessLabel, firstPassAllowRate, METRIC_DEFINITIONS,
} from "@/lib/metrics";
import { Bot, Activity, Ban, ClipboardCheck } from "lucide-react";

const TREND_DAYS = 7;

function windowTrend(records) {
  const now = Date.now();
  let cur = 0;
  let prev = 0;
  for (const r of records) {
    const t = new Date(r.created_date || 0).getTime();
    if (isNaN(t)) continue;
    const ageDays = (now - t) / 86400000;
    if (ageDays < TREND_DAYS) cur++;
    else if (ageDays < TREND_DAYS * 2) prev++;
  }
  return { cur, prev };
}

/** Renders a real 7-day comparison, or a plain count when no prior window exists. */
function WindowTrend({ records, upTone = "muted", downTone = "muted" }) {
  const { cur, prev } = windowTrend(records);
  if (!cur && !prev) return null;
  if (!prev) return <TrendPill tone="muted" icon="flat">{cur} in last 7d</TrendPill>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = cur >= prev;
  return (
    <TrendPill tone={up ? upTone : downTone} icon={up ? "up" : "down"}>
      {pct > 0 ? "+" : ""}{pct}% vs prior 7d
    </TrendPill>
  );
}

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
  const blockedActions = useMemo(() => fActions.filter((a) => a.decision === "blocked"), [fActions]);
  const highRisk = agents.filter((ag) => riskForAgent(ag, fActions).level === "high").length;
  const activeAgents = agents.filter((ag) => ag.is_active !== false).length;
  const pendingReviewAgentIds = new Set(fRequests.filter((r) => r.status === "pending").map((r) => r.agent_id));
  const freshness = freshnessLabel(fActions);

  return (
    <div className="space-y-6">
      <DashboardHero onRefresh={load} loading={loading} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Agents"
          value={loading ? <Skeleton className="h-8 w-14" /> : activeAgents}
          icon={Bot}
          tone="blue"
          hint={loading ? undefined : `${monitoredIds.size} with recorded activity`}
        />
        <MetricCard
          label="Actions Monitored"
          value={loading ? <Skeleton className="h-8 w-16" /> : v.total}
          icon={Activity}
          tone="gold"
          trend={loading ? null : <WindowTrend records={fActions} upTone="muted" downTone="muted" />}
        />
        <MetricCard
          label="Blocked Actions"
          value={loading ? <Skeleton className="h-8 w-14" /> : v.blocked}
          icon={Ban}
          tone="red"
          trend={loading ? null : <WindowTrend records={blockedActions} upTone="blocked" downTone="allow" />}
        />
        <MetricCard
          label="Pending Reviews"
          value={loading ? <Skeleton className="h-8 w-12" /> : rs.pending + s.pending_approval}
          icon={ClipboardCheck}
          tone="amber"
          to="/approvals"
          hint={loading ? undefined : `${rs.pending} agent · ${s.pending_approval} action`}
        />
      </div>

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentActivityChart actions={fActions} />
        </div>
        <RiskOverview agents={agents} actions={fActions} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentActionsPanel actions={fActions} />
        </div>
        <DecisionSummary verdicts={v} statuses={s} requests={rs} firstPassRate={fpr} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Agent Risk Posture</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <DefinitionTooltip term="Risk">{METRIC_DEFINITIONS.observedBehavior} {METRIC_DEFINITIONS.protectiveControls}</DefinitionTooltip>
          </CardDescription>
          <p className="text-xs text-muted-foreground">{highRisk} agent{highRisk === 1 ? "" : "s"} currently assessed as high risk.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonRows rows={4} />
          ) : agents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No agents registered yet.</div>
          ) : (
            <div className="vs-scroll -mx-6 overflow-x-auto px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
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
                      <TableRow key={ag.id} className="border-border">
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <Link to={`/passports/${ag.id}`} className="min-w-0 truncate font-medium text-foreground hover:text-primary hover:underline">{ag.name}</Link>
                            {!monitored && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">no activity</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{ag.agent_id}</div>
                        </TableCell>
                        <TableCell>
                          {pendingReviewAgentIds.has(ag.agent_id) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-review/30 bg-review/10 px-2 py-0.5 text-xs font-medium text-review">Pending review</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-allow/30 bg-allow/10 px-2 py-0.5 text-xs font-medium text-allow">Cleared</span>
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