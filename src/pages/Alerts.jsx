import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import StatTile from "@/components/StatTile";
import TabBar from "@/components/TabBar";
import AlertItem from "@/components/alerts/AlertItem";
import { ALERT_KINDS, deriveAlerts } from "@/lib/alerts";
import { Search, RefreshCw, Ban, AlertTriangle, ShieldAlert, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Alerts() {
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [ar, rq, ag] = await Promise.all([
      base44.entities.ActionRecord.list("-created_date", 500),
      base44.entities.AgentApprovalRequest.list("-created_date", 200),
      base44.entities.ShieldAgent.list(),
    ]);
    setActions(ar || []);
    setRequests(rq || []);
    setAgents(ag || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const alerts = useMemo(() => deriveAlerts({ actions, requests, agents }), [actions, requests, agents]);

  const counts = useMemo(() => {
    const c = { all: alerts.length };
    for (const kind of ALERT_KINDS) {
      if (kind.value === "all") continue;
      c[kind.value] = alerts.filter((a) => a.kind === kind.value).length;
    }
    return c;
  }, [alerts]);

  const severity = useMemo(() => ({
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
  }), [alerts]);

  const tabs = useMemo(() => ALERT_KINDS.map((k) => ({ ...k, count: counts[k.value] ?? 0 })), [counts]);

  const rows = useMemo(() => {
    const byKind = tab === "all" ? alerts : alerts.filter((a) => a.kind === tab);
    const term = q.trim().toLowerCase();
    if (!term) return byKind;
    return byKind.filter((a) =>
      [a.title, a.detail, a.agent, a.agent_id, a.system].join(" ").toLowerCase().includes(term));
  }, [alerts, tab, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="Every governance event that needs a human decision or a second look — blocked actions, autonomy ratchets, decisions owed, and passport reviews."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Critical" value={severity.critical} icon={Ban} tone="red" hint="blocked or past deadline" />
        <StatTile label="High" value={severity.high} icon={AlertTriangle} tone="amber" hint="ratchets and denials" />
        <StatTile label="Passport Reviews" value={counts.passport ?? 0} icon={ShieldAlert} tone="blue" hint="passports needing a review" />
        <StatTile label="Open Alerts" value={alerts.length} icon={Bell} hint="across all categories" />
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search alerts by agent, system, or reason…"
          className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Panel
        title="Alert Queue"
        description="Derived live from recorded governance events, so an alert disappears on its own once the underlying record changes."
        icon={Bell}
        contentClassName="p-0"
      >
        <TabBar tabs={tabs} value={tab} onChange={setTab} />
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading alerts…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {alerts.length === 0 ? "Nothing needs attention right now." : "No alert matches this view."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((alert) => <AlertItem key={alert.id} alert={alert} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}