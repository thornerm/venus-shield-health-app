import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, VerdictBadge } from "@/components/VerdictBadge";
import AutonomyBadge from "@/components/AutonomyBadge";
import { approveAgentRequest, denyAgentRequest, approveAction, denyAction } from "@/lib/governance";
import { ClipboardCheck, ShieldCheck, Check, X, RefreshCw } from "lucide-react";

export default function Approvals() {
  const [requests, setRequests] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      base44.entities.AgentApprovalRequest.filter({ status: "pending" }),
      base44.entities.ActionRecord.filter({ status: "pending_approval" }),
    ]);
    setRequests(r || []);
    setActions(a || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onApproveAgent = async (id) => { setBusy(id); try { await approveAgentRequest(id); } finally { setBusy(""); load(); } };
  const onDenyAgent = async (id) => { setBusy(id); try { await denyAgentRequest(id); } finally { setBusy(""); load(); } };
  const onApproveAction = async (id) => { setBusy(id); try { await approveAction(id); } finally { setBusy(""); load(); } };
  const onDenyAction = async (id) => { setBusy(id); try { await denyAction(id); } finally { setBusy(""); load(); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">Human-in-the-loop review for new agent passports and escalated actions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Agent Passport Requests</CardTitle>
          <CardDescription>Approving provisions a live passport into ShieldAgent; denying leaves it unprovisioned.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No pending agent requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">({r.agent_id})</span>
                        <AutonomyBadge level={r.autonomy_level} />
                      </div>
                      <div className="text-sm text-muted-foreground">{r.purpose}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Owner: {r.owner_name} · {r.owner_email}</span>
                        <span>Systems: {(r.systems || []).join(", ") || "none"}</span>
                        <span>Limit: ${Number(r.financial_limit_usd || 0).toLocaleString()}</span>
                        <span>Prohibited: {(r.prohibited_actions || []).join(", ") || "none"}</span>
                      </div>
                      {r.notes && <div className="text-xs italic text-muted-foreground">Notes: {r.notes}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onApproveAgent(r.id)} disabled={busy === r.id}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDenyAgent(r.id)} disabled={busy === r.id}>
                        <X className="mr-1 h-4 w-4" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" /> Escalated Actions</CardTitle>
          <CardDescription>Actions held for human decision — typically over-limit or high blast radius.</CardDescription>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No actions pending approval.</div>
          ) : (
            <div className="space-y-3">
              {actions.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.action_type}</span>
                        <span className="text-xs text-muted-foreground">on {a.target_system}</span>
                        <VerdictBadge decision={a.decision} />
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Agent: {a.agent_name} ({a.agent_id})</span>
                        <span>Amount: ${Number(a.amount_usd || 0).toLocaleString()}</span>
                        <span>Blast: {a.blast_radius_score}/5</span>
                        <span>Reversibility: {a.reversibility?.replace("_", " ")}</span>
                        {a.policy_matched_name && <span>Policy: {a.policy_matched_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onApproveAction(a.id)} disabled={busy === a.id}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDenyAction(a.id)} disabled={busy === a.id}>
                        <X className="mr-1 h-4 w-4" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}