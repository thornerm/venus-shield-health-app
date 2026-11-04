import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import AutonomyBadge from "@/components/AutonomyBadge";
import { revokeAgent, renewAgent, FINANCIAL_LIMIT_MODES } from "@/lib/governance";
import ModificationRequestCard from "@/components/passport/ModificationRequestCard";
import RuntimeAccessCard from "@/components/passport/RuntimeAccessCard";
import { useAuth } from "@/lib/AuthContext";
import { fmtDate, ageLabel } from "@/lib/metrics";
import { ArrowLeft, ShieldCheck, History, KeyRound, Activity, Clock, Link2, Ban, RefreshCw, AlertTriangle } from "lucide-react";

export default function PassportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [agent, setAgent] = useState(null);
  const [actions, setActions] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showRenew, setShowRenew] = useState(false);
  const [renewDate, setRenewDate] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!agent || agent.id !== id) setLoading(true);
    try {
      const ag = await base44.entities.ShieldAgent.get(id);
      setAgent(ag);
      const [acts, aps] = await Promise.all([
        base44.entities.ActionRecord.filter({ agent_id: ag.agent_id }),
        base44.entities.AgentApprovalRequest.filter({ agent_id: ag.agent_id }),
      ]);
      setActions(acts || []);
      setApprovals(aps || []);
    } catch (e) { setError(e?.message || "Passport not found."); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const actor = user ? { id: user.id, name: user.full_name, email: user.email, display: `${user.full_name || ""} <${user.email || ""}>`.trim(), role: user.role } : null;
  const isAdmin = actor?.role === "admin";

  const onRevoke = async () => {
    setBusy("revoke"); setError("");
    const res = await revokeAgent(agent.agent_id, actor, reason);
    if (res?.ok === false) setError(res.error);
    setReason(""); setBusy(""); load();
  };
  const onRenew = async () => {
    if (!renewDate) return;
    setBusy("renew"); setError("");
    const iso = new Date(renewDate).toISOString();
    const res = await renewAgent(agent.agent_id, actor, iso, reason);
    if (res?.ok === false) setError(res.error);
    setReason(""); setRenewDate(""); setShowRenew(false); setBusy(""); load();
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading passport…</div>;
  if (error || !agent) return (
    <div className="space-y-4">
      <Link to="/passports"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Passports</Button></Link>
      <div className="py-16 text-center text-sm text-muted-foreground">{error || "Passport not found."}</div>
    </div>
  );

  const grants = agent.grants || [];
  const versions = agent.version_history || [];
  const recent = actions.slice(0, 10);

  return (
    <div className="space-y-6">
      <Link to="/passports"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Passports</Button></Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.agent_id} · v{agent.passport_version || 1} · Owner {agent.owner_name} · {agent.owner_email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AutonomyBadge level={agent.autonomy_level} />
          {!agent.is_active && <span className="inline-flex rounded-full bg-blocked/10 px-2.5 py-0.5 text-xs font-medium text-blocked">Revoked</span>}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Review Status</div>
          <div className="mt-2 text-sm font-medium capitalize">{(agent.review_status || "pending_review").replace("_", " ")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Activity className="h-3 w-3" /> Runtime Health</div>
          <div className="mt-2 text-sm font-medium capitalize">{(agent.runtime_health || "unknown").replace("_", " ")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Expiration</div>
          <div className="mt-2 text-sm font-medium">{agent.passport_expires_at ? fmtDate(agent.passport_expires_at) : "No expiration"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Version</div>
          <div className="mt-2 text-sm font-medium">v{agent.passport_version || 1}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Passport Boundary</CardTitle><CardDescription>The governance scope this agent operates within.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Purpose:</span> {agent.purpose}</div>
          <div><span className="text-muted-foreground">Authorized systems:</span> {(agent.systems || []).join(", ") || "none"}</div>
          <div><span className="text-muted-foreground">Financial limit:</span> ${Number(agent.financial_limit_usd || 0).toLocaleString()} ({FINANCIAL_LIMIT_MODES[agent.financial_limit_mode || "approval_threshold"]?.label})</div>
          <div><span className="text-muted-foreground">Prohibited actions:</span> {(agent.prohibited_actions || []).join(", ") || "none"}</div>
          <div><span className="text-muted-foreground">Data permissions:</span> {(agent.data_permissions || []).join(", ") || "none"}</div>
        </CardContent>
      </Card>

      <ModificationRequestCard agent={agent} user={user} onSubmitted={load} />

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Ban className="h-4 w-4 text-blocked" /> Revoke / Renew Passport</CardTitle><CardDescription className="text-xs">Authorized workflows. Each action creates an audit record attributed to you.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason (required)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Explain why this passport is being revoked or renewed" />
            </div>
            {showRenew && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New expiration date</label>
                <input type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={onRevoke} disabled={busy === "revoke" || !reason.trim() || !agent.is_active}>
                <Ban className="mr-1 h-4 w-4" /> Revoke Passport
              </Button>
              {!showRenew ? (
                <Button variant="outline" size="sm" onClick={() => setShowRenew(true)}><RefreshCw className="mr-1 h-4 w-4" /> Renew…</Button>
              ) : (
                <Button size="sm" onClick={onRenew} disabled={busy === "renew" || !reason.trim() || !renewDate}><RefreshCw className="mr-1 h-4 w-4" /> Confirm Renewal</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && <RuntimeAccessCard agent={agent} isAdmin={isAdmin} />}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Function Grants</CardTitle><CardDescription>Versioned function-level authorizations.</CardDescription></CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No function grants recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Function</TableHead><TableHead>Version</TableHead><TableHead>Env</TableHead><TableHead>Scope</TableHead><TableHead>Effective</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
                <TableBody>
                  {grants.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{g.function || "—"}</TableCell>
                      <TableCell className="text-xs">{g.version || "—"}</TableCell>
                      <TableCell className="text-xs uppercase">{g.environment || "—"}</TableCell>
                      <TableCell className="text-xs">{g.scope || "—"}</TableCell>
                      <TableCell className="text-xs">{g.effective_at ? fmtDate(g.effective_at) : "—"}</TableCell>
                      <TableCell className="text-xs">{g.expires_at ? fmtDate(g.expires_at) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" /> Version History</CardTitle></CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No version history recorded.</div>
          ) : (
            <ol className="space-y-2">
              {versions.slice().reverse().map((v, i) => (
                <li key={i} className="flex gap-3 rounded-md border border-border p-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">v{v.version}</span>
                  <div>
                    <div>{v.summary}</div>
                    <div className="text-xs text-muted-foreground">{v.changed_by} · {fmtDate(v.changed_at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-primary" /> Linked Approvals</CardTitle><CardDescription>Approval requests for this agent.</CardDescription></CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No linked approval requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Requested By</TableHead><TableHead>Decided By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {approvals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_date)}</TableCell>
                      <TableCell className="text-xs">{r.request_type}</TableCell>
                      <TableCell><span className="text-xs font-medium capitalize">{r.status}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.requested_by || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.decided_by || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle><CardDescription>{actions.length} governed action{actions.length === 1 ? "" : "s"} for this agent.</CardDescription></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Decision</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recent.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{ageLabel(a.created_date)}</TableCell>
                      <TableCell className="font-mono text-xs">{a.action_type}</TableCell>
                      <TableCell className="text-xs">{a.target_system}</TableCell>
                      <TableCell><VerdictBadge decision={a.decision} /></TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
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