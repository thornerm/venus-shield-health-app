import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import StatTile from "@/components/StatTile";
import SystemAgentsPanel from "@/components/integrations/SystemAgentsPanel";
import SystemPoliciesPanel from "@/components/integrations/SystemPoliciesPanel";
import SystemActivityPanel from "@/components/integrations/SystemActivityPanel";
import { deriveSystems, systemKey } from "@/lib/integrations";
import { ageLabel } from "@/lib/metrics";
import { ArrowLeft, Plug, Users, Activity, Ban, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntegrationDetail() {
  const { system: param } = useParams();
  const key = systemKey(param);
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const system = useMemo(
    () => deriveSystems({ agents, actions, policies }).find((s) => s.key === key) || null,
    [agents, actions, policies, key]
  );

  // Agents with passport access here, plus anyone whose activity actually landed
  // on this system — a gap worth surfacing rather than hiding.
  const access = useMemo(() => {
    if (!system) return [];
    const authorized = new Set(system.authorizedAgents);
    return system.agentsInvolved.map((id) => {
      const ag = agents.find((x) => x.agent_id === id);
      const mine = system.records.filter((a) => a.agent_id === id);
      const times = mine.map((a) => new Date(a.created_date || 0).getTime()).filter((t) => !isNaN(t));
      return {
        agent_id: id,
        name: ag?.name || id,
        autonomy: ag?.autonomy_level || null,
        authorized: authorized.has(id),
        total: mine.length,
        blocked: mine.filter((a) => a.decision === "blocked").length,
        lastActivity: times.length ? new Date(Math.max(...times)).toISOString() : null,
      };
    }).sort((a, b) => Number(b.authorized) - Number(a.authorized) || b.total - a.total);
  }, [system, agents]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading system…</div>;
  }

  if (!system) {
    return (
      <div className="space-y-4">
        <Link to="/integrations">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Integrations</Button>
        </Link>
        <div className="py-16 text-center text-sm text-muted-foreground">
          No system on record matches “{param}”. It may have no agents, policies, or activity behind it.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={system.label}
        subtitle={`${system.description}${system.lastActivityIso ? ` Last governed action ${ageLabel(system.lastActivityIso)}.` : " No governed activity recorded yet."}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/integrations"><ArrowLeft className="mr-2 h-4 w-4" /> All Systems</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Wired Agents" value={system.agentsInvolved.length} icon={Users} tone="blue" hint={`${system.authorizedAgents.length} in passports`} />
        <StatTile label="Evaluations" value={system.total} icon={Activity} tone="green" hint={`${system.allow} allow · ${system.review} review`} />
        <StatTile label="Blocked" value={system.blocked} icon={Ban} tone="red" hint="denied at this system" />
        <StatTile label="Highest Blast Radius" value={system.maxBlast || "—"} icon={Plug} tone="amber" hint="of 5" />
      </div>

      <SystemAgentsPanel label={system.label} access={access} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SystemActivityPanel label={system.label} operations={system.operations} records={system.records} />
        </div>
        <SystemPoliciesPanel label={system.label} policies={system.policies} />
      </div>
    </div>
  );
}