import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, VerdictBadge } from "@/components/VerdictBadge";
import ReviewPanel from "@/components/ReviewPanel";
import { approveAgentRequest, denyAgentRequest, approveAction, denyAction } from "@/lib/governance";
import { useAuth } from "@/lib/AuthContext";
import { displayUid, ageLabel, fmtDate, deadlineStatus, approvalExpirationStatus } from "@/lib/metrics";
import { ClipboardCheck, ShieldCheck, RefreshCw, AlertTriangle, FileSearch } from "lucide-react";

function Pill({ tone, children }) {
  const cls = tone === "blocked" ? "bg-blocked/10 text-blocked" : tone === "review" ? "bg-review/10 text-review" : tone === "allow" ? "bg-allow/10 text-allow" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [actions, setActions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);

  const load = async () => {
    setLoading(true);
    const [r, a, ag] = await Promise.all([
      base44.entities.AgentApprovalRequest.filter({ status: "pending" }),
      base44.entities.ActionRecord.filter({ status: "pending_approval" }),
      base44.entities.ShieldAgent.list(),
    ]);
    setRequests(r || []);
    setActions(a || []);
    setAgents(ag || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const actor = user ? { id: user.id, name: user.full_name, email: user.email, display: `${user.full_name || ""} <${user.email || ""}>`.trim(), role: user.role } : null;
  const actorDisplay = actor?.display || "";
  const canDecide = () => actor?.role === "admin";
  const canApproveAgent = (r) => canDecide() && r.requested_by !== actorDisplay && (!r.owner_email || !actor?.email || actor.email.toLowerCase() !== r.owner_email.toLowerCase());
  const canApproveAction = (a) => canDecide() && a.requested_by !== actorDisplay;
  const agentBy = (id) => agents.find((x) => x.agent_id === id);

  const cannotReason = (kind, item) => {
    if (!canDecide()) return "Only a governance admin can approve or deny.";
    if (kind === "agent" ? !canApproveAgent(item) : !canApproveAction(item)) return "You cannot approve your own request — another admin must review it.";
    return "";
  };

  const run = async (fn, id) => {
    setBusy(id); setError("");
    try {
      const res = await fn();
      if (res?.ok === false) setError(res.error || "Action failed.");
    } catch (e) { setError(e?.message || "Action failed."); }
    setBusy("");
    setReview(null);
    load();
  };

  const handleApprove = (reason) => {
    if (!review) return;
    const { kind, item } = review;
    if (kind === "agent") run(() => approveAgentRequest(item.id, actor, reason), item.id);
    else run(() => approveAction(item.id, actor, reason), item.id);
  };
  const handleDeny = (reason) => {
    if (!review) return;
    const { kind, item } = review;
    if (kind === "agent") run(() => denyAgentRequest(item.id, actor, reason), item.id);
    else run(() => denyAction(item.id, actor, reason), item.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">Human-in-the-loop review. Each item opens a review panel with the full scope and consequence before you decide. Decisions are attributed to you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Agent Passport Requests</CardTitle>
          <CardDescription>Approving provisions a live passport — this changes ongoing access for the agent.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No pending agent requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const dl = deadlineStatus(r.deadline);
                return (
                  <div key={r.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{displayUid(r, "REQ")}</span>
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">({r.agent_id})</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Created {fmtDate(r.created_date)} · {ageLabel(r.created_date)}</span>
                          <span>Requester: {r.requested_by || "—"}</span>
                          <span>Owner: {r.owner_name} · {r.owner_email}</span>
                          <span>Env: <span className="font-mono uppercase">{r.environment || "prod"}</span></span>
                          <span>Deadline: <Pill tone={dl.tone}>{dl.label}</Pill></span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setReview({ kind: "agent", item: r })}>
                        <FileSearch className="mr-1 h-4 w-4" /> Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" /> Escalated Actions</CardTitle>
          <CardDescription>Actions held for human decision. Each approval authorizes a single execution and cannot be reused.</CardDescription>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No actions pending approval.</div>
          ) : (
            <div className="space-y-3">
              {actions.map((a) => {
                const dl = deadlineStatus(a.deadline);
                const exp = approvalExpirationStatus(a.approval_expires_at);
                return (
                  <div key={a.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{displayUid(a, "ACT")}</span>
                          <span className="font-medium">{a.action_type}</span>
                          <span className="text-xs text-muted-foreground">on {a.target_system}</span>
                          <VerdictBadge decision={a.decision} />
                          <StatusBadge status={a.status} />
                          {a.execution_consumed && <Pill tone="blocked">Already executed</Pill>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Created {fmtDate(a.created_date)} · {ageLabel(a.created_date)}</span>
                          <span>Requester: {a.requested_by || "—"}</span>
                          <span>Agent: {a.agent_name} ({a.agent_id})</span>
                          <span>Amount: ${Number(a.amount_usd || 0).toLocaleString()}</span>
                          <span>Env: <span className="font-mono uppercase">{a.environment || "prod"}</span></span>
                          <span>Deadline: <Pill tone={dl.tone}>{dl.label}</Pill></span>
                          <span>Approval: <Pill tone={exp.tone}>{exp.label}</Pill></span>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">Params: {JSON.stringify(a.params || {})}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setReview({ kind: "action", item: a })}>
                        <FileSearch className="mr-1 h-4 w-4" /> Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewPanel
        open={!!review}
        onOpenChange={(o) => !o && setReview(null)}
        item={review?.item}
        kind={review?.kind}
        passport={review?.kind === "action" ? agentBy(review?.item?.agent_id) : null}
        onApprove={handleApprove}
        onDeny={handleDeny}
        canApprove={review ? (review.kind === "agent" ? canApproveAgent(review.item) : canApproveAction(review.item)) : false}
        cannotApproveReason={review ? cannotReason(review.kind, review.item) : ""}
        busy={!!busy}
      />
    </div>
  );
}