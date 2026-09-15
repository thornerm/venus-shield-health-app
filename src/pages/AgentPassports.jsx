import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AutonomyBadge from "@/components/AutonomyBadge";
import { Search, ShieldCheck, DollarSign, Database, RefreshCw, ArrowRight, Activity } from "lucide-react";
import { fmtDate, approvalExpirationStatus } from "@/lib/metrics";

const REVIEW_LABELS = {
  pending_review: { label: "Pending review", cls: "bg-review/10 text-review" },
  reviewed: { label: "Reviewed", cls: "bg-allow/10 text-allow" },
  needs_attention: { label: "Needs attention", cls: "bg-blocked/10 text-blocked" },
  expired: { label: "Expired", cls: "bg-blocked/10 text-blocked" },
};
const HEALTH_LABELS = {
  healthy: { label: "Healthy", cls: "bg-allow/10 text-allow" },
  degraded: { label: "Degraded", cls: "bg-review/10 text-review" },
  offline: { label: "Offline", cls: "bg-blocked/10 text-blocked" },
  unknown: { label: "Unknown", cls: "bg-muted text-muted-foreground" },
};

function Chip({ children, tone = "default" }) {
  const cls = tone === "ban" ? "bg-blocked/10 text-blocked" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function AgentPassports() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const a = await base44.entities.ShieldAgent.list();
    setAgents(a || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter((ag) => [ag.name, ag.agent_id, ag.owner_name, ag.owner_email, ag.purpose, ...(ag.systems || [])].join(" ").toLowerCase().includes(term));
  }, [agents, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Agent Passports</h1>
          <p className="text-sm text-muted-foreground">Registered agents and their governance boundaries. Open a passport for version history, grants, and runtime health.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, owner, system…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading passports…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">{agents.length === 0 ? "No agent passports provisioned yet." : "No passports match your search."}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ag) => {
            const rs = REVIEW_LABELS[ag.review_status || "pending_review"] || REVIEW_LABELS.pending_review;
            const hs = HEALTH_LABELS[ag.runtime_health || "unknown"] || HEALTH_LABELS.unknown;
            const exp = approvalExpirationStatus(ag.passport_expires_at);
            const expCls = exp.tone === "blocked" ? "bg-blocked/10 text-blocked" : exp.tone === "review" ? "bg-review/10 text-review" : "bg-muted text-muted-foreground";
            return (
              <Link key={ag.id} to={`/passports/${ag.id}`} className="block">
                <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
                        <div>
                          <CardTitle className="text-base">{ag.name}</CardTitle>
                          <CardDescription className="text-xs">{ag.agent_id}</CardDescription>
                        </div>
                      </div>
                      <AutonomyBadge level={ag.autonomy_level} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 text-sm">
                    <p className="line-clamp-2 text-muted-foreground">{ag.purpose}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rs.cls}`}>{rs.label}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${hs.cls}`}><Activity className="h-3 w-3" />{hs.label}</span>
                      {ag.passport_expires_at && <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${expCls}`}>Exp {fmtDate(ag.passport_expires_at).split(",")[0]}</span>}
                      {!ag.is_active && <span className="inline-flex rounded-full bg-blocked/10 px-2 py-0.5 text-xs font-medium text-blocked">Revoked</span>}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Database className="h-3 w-3" /> Systems</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(ag.systems || []).length ? ag.systems.map((s) => <Chip key={s}>{s}</Chip>) : <span className="text-xs text-muted-foreground">none</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Limit</span>
                      <span className="ml-auto font-medium">${Number(ag.financial_limit_usd || 0).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-2 text-xs text-muted-foreground">Owner: {ag.owner_name} · {ag.owner_email}</div>
                    <div className="flex items-center justify-end gap-1 text-xs font-medium text-primary">View details <ArrowRight className="h-3 w-3" /></div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}