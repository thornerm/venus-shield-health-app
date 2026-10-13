import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import AgentActivityChart from "@/components/dashboard/AgentActivityChart";
import AnalyticsKpis from "@/components/analytics/AnalyticsKpis";
import DecisionBreakdown from "@/components/analytics/DecisionBreakdown";
import BlastRadiusDistribution from "@/components/analytics/BlastRadiusDistribution";
import AgentPerformanceTable from "@/components/analytics/AgentPerformanceTable";
import { riskForAgent } from "@/lib/governance";
import { verdictCounts, applyFilters, firstPassAllowRate, executionSuccessRate, freshnessLabel } from "@/lib/metrics";
import { RefreshCw, FileDown } from "lucide-react";

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
  const freshness = freshnessLabel(fActions);

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
      <PageHeader
        title="Analytics"
        subtitle="Trends in agent actions, verdict rates, and blast radius. Every figure uses the same definitions as the Dashboard and Audit Trail."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/report-export"><FileDown className="mr-2 h-4 w-4" /> Build a Report</Link>
            </Button>
          </>
        }
      />

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <AnalyticsKpis verdicts={v} firstPass={fpr} execution={exr} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentActivityChart actions={fActions} />
        </div>
        <DecisionBreakdown verdicts={v} />
      </div>

      <BlastRadiusDistribution actions={fActions} />

      <AgentPerformanceTable rows={perAgent} loading={loading} />
    </div>
  );
}