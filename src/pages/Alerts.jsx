import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import StatTile from "@/components/StatTile";
import TabBar from "@/components/TabBar";
import AlertItem from "@/components/alerts/AlertItem";
import AlertTable from "@/components/alerts/AlertTable";
import ViolationTrends from "@/components/alerts/ViolationTrends";
import SkeletonRows from "@/components/SkeletonRows";
import { ALERT_KINDS, deriveAlerts } from "@/lib/alerts";
import { Ban, AlertTriangle, ShieldAlert, Bell, Search, RefreshCw, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEW_BTN = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-200";

export default function Alerts() {
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("table");

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

  const bySeverity = useMemo(() => {
    const s = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) if (s[a.severity] != null) s[a.severity]++;
    return s;
  }, [alerts]);

  const tabs = useMemo(() => ALERT_KINDS.map((k) => ({ ...k, count: counts[k.value] ?? 0 })), [counts]);

  const rows = useMemo(() => {
    const byKind = tab === "all" ? alerts : alerts.filter((a) => a.kind === tab);
    const term = q.trim().toLowerCase();
    if (!term) return byKind;
    return byKind.filter((a) =>
      [a.title, a.detail, a.agent, a.agent_id, a.system, a.policy].join(" ").toLowerCase().includes(term));
  }, [alerts, tab, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risks & Alerts"
        subtitle="Monitor policy violations, flagged activity, and operational risk."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Critical" value={bySeverity.critical} icon={Ban} tone="red" hint="blocked or past deadline" />
        <StatTile label="High" value={bySeverity.high} icon={AlertTriangle} tone="high" hint="refusals, ratchets, due within 24h" />
        <StatTile label="Medium" value={bySeverity.medium} icon={Bell} tone="amber" hint="held for a human decision" />
        <StatTile label="Low" value={bySeverity.low} icon={ShieldAlert} tone="blue" hint="passport housekeeping" />
      </div>

      <ViolationTrends actions={actions} loading={loading} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search alerts by agent, system, policy, or reason…"
          className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Panel
        title="Alert Queue"
        description={`${alerts.length} open alert${alerts.length === 1 ? "" : "s"}, derived live from recorded governance events — an alert clears itself once its underlying record changes.`}
        icon={Bell}
        contentClassName="p-0"
        action={
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label="Display style">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={cn(VIEW_BTN, view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setView("feed")}
              aria-pressed={view === "feed"}
              className={cn(VIEW_BTN, view === "feed" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Feed
            </button>
          </div>
        }
      >
        <TabBar tabs={tabs} value={tab} onChange={setTab} />
        {loading ? (
          <SkeletonRows rows={6} />
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            {alerts.length === 0
              ? "No alerts are open. Nothing needs attention right now."
              : "No alerts match the selected filters."}
          </div>
        ) : view === "table" ? (
          <AlertTable alerts={rows} />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((alert) => <AlertItem key={alert.id} alert={alert} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}