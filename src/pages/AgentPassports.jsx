import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AutonomyBadge from "@/components/AutonomyBadge";
import { RiskBadge } from "@/components/VerdictBadge";
import { riskForAgent } from "@/lib/governance";
import { ageLabel } from "@/lib/metrics";
import { Search, RefreshCw, UserPlus, Bot, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Presentational status derived from the passport's real review + active state. */
function agentStatus(ag) {
  if (ag.is_active === false) {
    return { label: "Revoked", cls: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  }
  const rs = ag.review_status || "pending_review";
  if (rs === "needs_attention" || rs === "expired") {
    return { label: "Restricted", cls: "border-blocked/30 bg-blocked/10 text-blocked", dot: "bg-blocked" };
  }
  if (rs === "pending_review") {
    return { label: "Under Review", cls: "border-review/30 bg-review/10 text-review", dot: "bg-review" };
  }
  return { label: "Active", cls: "border-allow/30 bg-allow/10 text-allow", dot: "bg-allow" };
}

export default function AgentPassports() {
  const [agents, setAgents] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const [q, setQ] = useState(urlQ);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [a, ar] = await Promise.all([
      base44.entities.ShieldAgent.list(),
      base44.entities.ActionRecord.list("-created_date", 500),
    ]);
    setAgents(a || []);
    setActions(ar || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Re-sync when the top-bar search hands over a new term while already here.
  useEffect(() => { setQ(urlQ); }, [urlQ]);

  const lastActivity = useMemo(() => {
    const m = new Map();
    for (const a of actions) {
      const t = new Date(a.created_date || 0).getTime();
      if (isNaN(t)) continue;
      if (!m.has(a.agent_id) || t > m.get(a.agent_id)) m.set(a.agent_id, t);
    }
    return m;
  }, [actions]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter((ag) =>
      [ag.name, ag.agent_id, ag.owner_name, ag.owner_email, ag.purpose, ...(ag.systems || [])]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [agents, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">AI Agents</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Manage and monitor AI agents operating across your organization.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button asChild size="sm">
            <Link to="/register"><UserPlus className="mr-2 h-4 w-4" />New Agent</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, owner, system…"
          className="h-9 w-full rounded-md border border-input bg-surface/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="vs-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md bg-muted/60" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium text-foreground">
              {agents.length === 0 ? "No agent passports provisioned yet." : "No agents match your search."}
            </div>
            {agents.length === 0 && (
              <Button asChild size="sm" variant="outline">
                <Link to="/register">Register the first agent</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Agent", "Purpose", "Status", "Risk", "Last activity", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className={cn(
                        "px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                        i === 5 && "text-right"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ag) => {
                  const st = agentStatus(ag);
                  const risk = riskForAgent(ag, actions);
                  const last = lastActivity.get(ag.agent_id);
                  return (
                    <tr
                      key={ag.id}
                      onClick={() => navigate(`/passports/${ag.id}`)}
                      className="cursor-pointer border-b border-border transition-colors duration-200 last:border-b-0 hover:bg-surface/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{ag.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{ag.agent_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[280px] truncate text-[13px] text-muted-foreground">{ag.purpose || "—"}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", st.cls)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                            {st.label}
                          </span>
                          <AutonomyBadge level={ag.autonomy_level} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><RiskBadge level={risk.level} /></td>
                      <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                        {last ? ageLabel(new Date(last).toISOString()) : <span className="text-muted-foreground/70">No activity</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/passports/${ag.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}