import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import StatTile from "@/components/StatTile";
import TabBar from "@/components/TabBar";
import SystemTable from "@/components/integrations/SystemTable";
import { deriveSystems } from "@/lib/integrations";
import { Search, RefreshCw, Plug, Link2, Scale, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Integrations() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const load = async () => {
    setLoading(true);
    const [ag, ar, po] = await Promise.all([
      base44.entities.ShieldAgent.list(),
      base44.entities.ActionRecord.list("-created_date", 500),
      base44.entities.ShieldPolicy.list(),
    ]);
    setAgents(ag || []);
    setActions(ar || []);
    setPolicies(po || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const systems = useMemo(() => deriveSystems({ agents, actions, policies }), [agents, actions, policies]);

  const totals = useMemo(() => ({
    systems: systems.length,
    authorizations: systems.reduce((n, s) => n + s.authorizedAgents.length, 0),
    withActivity: systems.filter((s) => s.hasActivity).length,
    systemPolicies: new Set(systems.flatMap((s) => s.policies.map((p) => p.id))).size,
    blocked: systems.reduce((n, s) => n + s.blocked, 0),
    evaluations: systems.reduce((n, s) => n + s.total, 0),
  }), [systems]);

  const tabs = useMemo(() => ([
    { value: "all", label: "All Systems", count: totals.systems },
    { value: "active", label: "With Activity", count: totals.withActivity },
    { value: "idle", label: "No Activity", count: totals.systems - totals.withActivity },
    { value: "uncovered", label: "No Policy", count: systems.filter((s) => s.policies.length === 0).length },
  ]), [systems, totals]);

  const rows = useMemo(() => {
    const byTab = systems.filter((s) =>
      tab === "active" ? s.hasActivity
        : tab === "idle" ? !s.hasActivity
        : tab === "uncovered" ? s.policies.length === 0
        : true);
    const term = q.trim().toLowerCase();
    if (!term) return byTab;
    return byTab.filter((s) =>
      [s.key, s.label, s.description, ...s.authorizedAgentNames, ...s.policies.map((p) => p.name)]
        .join(" ").toLowerCase().includes(term));
  }, [systems, tab, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Every system your agents are authorized to act on, what they actually did there, and how that activity is governed."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Connected Systems" value={totals.systems} icon={Plug} tone="blue" hint={`${totals.withActivity} with activity`} />
        <StatTile label="Agent Authorizations" value={totals.authorizations} icon={Link2} tone="green" hint="granted across passports" />
        <StatTile label="System-scoped Policies" value={totals.systemPolicies} icon={Scale} tone="amber" hint="policies naming a system" />
        <StatTile label="Blocked on Systems" value={totals.blocked} icon={Ban} tone="red" hint={`of ${totals.evaluations} evaluations`} />
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search systems, policies, or agents…"
          className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Panel
        title="Connected Systems"
        description="Assembled from agent passports, policy scopes, and recorded governance activity."
        icon={Plug}
        contentClassName="p-0"
      >
        <TabBar tabs={tabs} value={tab} onChange={setTab} />
        <SystemTable rows={rows} loading={loading} />
      </Panel>
    </div>
  );
}