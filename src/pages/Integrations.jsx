import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import StatTile from "@/components/StatTile";
import TabBar from "@/components/TabBar";
import SystemTable from "@/components/integrations/SystemTable";
import SystemCard from "@/components/integrations/SystemCard";
import SkeletonCards from "@/components/SkeletonCards";
import SkeletonRows from "@/components/SkeletonRows";
import { deriveSystems } from "@/lib/integrations";
import { Search, RefreshCw, Plug, Link2, Scale, Ban, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEW_BTN = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-200";

const catChip = (active) =>
  cn(
    "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-surface/40 text-muted-foreground hover:text-foreground"
  );

export default function Integrations() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("cards");

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
    attention: systems.filter((s) => s.status === "attention" || s.status === "error").length,
  }), [systems]);

  const categories = useMemo(
    () => [...new Set(systems.map((s) => s.category))].sort((a, b) => a.localeCompare(b)),
    [systems]
  );

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
    const byCategory = category === "all" ? byTab : byTab.filter((s) => s.category === category);
    const term = q.trim().toLowerCase();
    if (!term) return byCategory;
    return byCategory.filter((s) =>
      [s.key, s.label, s.description, s.category, ...s.authorizedAgentNames, ...s.policies.map((p) => p.name)]
        .join(" ").toLowerCase().includes(term));
  }, [systems, tab, category, q]);

  const filtered = rows.length !== systems.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Manage the systems and services connected to your AI environment."
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
        <StatTile label="Attention or Failed" value={totals.attention} icon={Ban} tone={totals.attention > 0 ? "red" : "default"} hint={`${totals.blocked} blocked actions`} />
      </div>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search systems, policies, or agents…"
            className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {categories.length > 1 && (
          <div className="vs-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <button type="button" onClick={() => setCategory("all")} className={catChip(category === "all")}>
              All Categories
            </button>
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={catChip(category === c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <Panel
        title="Connected Systems"
        description="Assembled from agent passports, policy scopes, and recorded governance activity. Status reflects recorded evidence, never a simulated connection."
        icon={Plug}
        contentClassName="p-0"
        action={
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label="Display style">
            <button
              type="button"
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
              className={cn(VIEW_BTN, view === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={cn(VIEW_BTN, view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        }
      >
        <TabBar tabs={tabs} value={tab} onChange={setTab} />

        {loading ? (
          view === "cards" ? <SkeletonCards /> : <SkeletonRows rows={7} />
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {systems.length === 0
                ? "No system is connected yet. Wire a system into an agent passport and it appears here."
                : "No system matches the selected filters."}
            </p>
            {filtered && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => { setTab("all"); setCategory("all"); setQ(""); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => <SystemCard key={s.key} system={s} />)}
          </div>
        ) : (
          <SystemTable rows={rows} loading={false} />
        )}
      </Panel>
    </div>
  );
}