import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlastRiskBadge, StatusBadge, VerdictBadge } from "@/components/VerdictBadge";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import TabBar from "@/components/TabBar";
import ReviewPanel from "@/components/ReviewPanel";
import { approveAgentRequest, denyAgentRequest, approveAction, denyAction } from "@/lib/governance";
import { useAuth } from "@/lib/AuthContext";
import { displayUid, ageLabel, fmtDate, deadlineStatus, approvalExpirationStatus } from "@/lib/metrics";
import { ClipboardCheck, ShieldCheck, RefreshCw, AlertTriangle, Check, X, Eye } from "lucide-react";

const TABS = [
  { value: "pending", label: "Pending", status: "pending_approval" },
  { value: "approved", label: "Approved", status: "approved" },
  { value: "blocked", label: "Blocked", status: "blocked" },
  { value: "all", label: "All Actions" },
];

function Pill({ tone, children }) {
  const cls = tone === "blocked" ? "bg-blocked/10 text-blocked" : tone === "review" ? "bg-review/10 text-review" : tone === "allow" ? "bg-allow/10 text-allow" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function Approvals() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [counts, setCounts] = useState({});
  const [actions, setActions] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);

  const loadQueue = async () => {
    setQueueLoading(true);
    const [r, ag, agg] = await Promise.all([
      base44.entities.AgentApprovalRequest.filter({ status: "pending" }),
      base44.entities.ShieldAgent.list(),
      base44.entities.ActionRecord.aggregate({ groupBy: "status" }),
    ]);
    setRequests(r || []);
    setAgents(ag || []);
    const by = {};
    (agg?.rows || []).forEach((row) => { by[row.status] = row.count; });
    setCounts(by);
    setQueueLoading(false);
  };

  const loadActions = async () => {
    setTabLoading(true);
    const status = TABS.find((t) => t.value === tab)?.status;
    const page = await base44.entities.ActionRecord.filter(status ? { status } : {}, { sort: "-created_date", limit: 50 });
    setActions(page?.items || []);
    setTabLoading(false);
  };

  useEffect(() => { loadQueue(); }, []);
  useEffect(() => { loadActions(); }, [tab]);

  const refresh = () => { loadQueue(); loadActions(); };

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
    refresh();
  };

  const handleApprove = (reason) => {
    if (!review) return;
    if (!canDecide()) { setError("Only a governance admin can approve or deny."); return; }
    const { kind, item } = review;
    if (kind === "agent") run(() => approveAgentRequest(item.id, actor, reason), item.id);
    else run(() => approveAction(item.id, actor, reason), item.id);
  };
  const handleDeny = (reason) => {
    if (!review) return;
    if (!canDecide()) { setError("Only a governance admin can approve or deny."); return; }
    const { kind, item } = review;
    if (kind === "agent") run(() => denyAgentRequest(item.id, actor, reason), item.id);
    else run(() => denyAction(item.id, actor, reason), item.id);
  };

  const openAgent = (item, intent) => setReview({ kind: "agent", item, intent });
  const openAction = (item, intent) => setReview({ kind: "action", item, intent });

  const tabs = TABS.map((t) => ({
    value: t.value,
    label: t.label,
    count: t.status ? (counts[t.status] ?? 0) : Object.values(counts).reduce((sum, n) => sum + n, 0),
  }));

  const pendingTotal = counts.pending_approval ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Review"
        subtitle="Review AI agent actions requiring human authorization."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={queueLoading || tabLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${queueLoading || tabLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-blocked/30 bg-blocked/10 px-4 py-2.5 text-sm text-blocked">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {pendingTotal > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-review/30 bg-review/10 px-4 py-2.5 text-sm text-review">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{pendingTotal}</span>
          <span>action{pendingTotal === 1 ? "" : "s"} awaiting a human decision. Approval releases a single execution.</span>
        </div>
      )}

      <Panel
        title="Actions Awaiting Governance"
        description="Requested actions, the agent behind them, and the system they target. A reason is required for every decision and is preserved in the audit trail."
        contentClassName="p-0"
      >
        <TabBar tabs={tabs} value={tab} onChange={setTab} className="px-5" />

        {tabLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading actions…</div>
        ) : actions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {tab === "pending" ? "No actions are waiting on a decision." : "No actions in this view."}
          </div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Requested Action</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Connected System</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Request Time</TableHead>
                  <TableHead>Decision Status</TableHead>
                  <TableHead className="sticky right-0 z-20 bg-card text-right">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a) => {
                  const dl = deadlineStatus(a.deadline);
                  const pending = a.status === "pending_approval";
                  return (
                    <TableRow key={a.id} className="transition-colors duration-200 hover:bg-surface/40">
                      <TableCell>
                        <div className="font-mono text-[13px] text-foreground">{a.action_type}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{displayUid(a, "ACT")}</span>
                          {Number(a.amount_usd || 0) > 0 && (
                            <span className="text-[11px] text-muted-foreground">${Number(a.amount_usd).toLocaleString()}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[13px] font-medium text-foreground">{a.agent_name || a.agent_id}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground">{a.agent_id}</span>
                          {a.source && a.source !== "ui" && (
                            <span
                              title={`Runtime record · source: ${a.source}${a.requested_via_key ? ` · key ${a.requested_via_key}` : ""}`}
                              className="inline-flex rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-info"
                            >
                              {a.source === "mcp-proxy" || a.source === "sdk" || a.source === "runtime" ? "Runtime" : a.source}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{a.target_system || "—"}</TableCell>
                      <TableCell>
                        <BlastRiskBadge score={a.blast_radius_score} />
                        <div className="mt-1 text-[10px] text-muted-foreground">blast {a.blast_radius_score ?? "—"}/5</div>
                      </TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap text-[13px] text-foreground">{ageLabel(a.created_date)}</div>
                        <div className="whitespace-nowrap text-[10px] text-muted-foreground">{fmtDate(a.created_date)}</div>
                        {pending && <div className="mt-1"><Pill tone={dl.tone}>{dl.label}</Pill></div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <VerdictBadge decision={a.decision} />
                          <StatusBadge status={a.status} />
                        </div>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 bg-card text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {pending && canApproveAction(a) && (
                            <>
                              <Button size="sm" className="h-8 bg-allow px-2.5 text-allow-foreground hover:bg-allow/90" onClick={() => openAction(a, "approve")}>
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 border-blocked/40 px-2.5 text-blocked hover:bg-blocked/10 hover:text-blocked" onClick={() => openAction(a, "deny")}>
                                <X className="h-3.5 w-3.5" /> Deny
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 px-2.5" onClick={() => openAction(a, null)}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel
        title="Agent Passport Requests"
        description="Approving provisions a live passport — this changes ongoing access for the agent, not a single execution."
        icon={ShieldCheck}
        contentClassName="p-5"
      >
        {queueLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No pending agent requests.</div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((r) => {
              const dl = deadlineStatus(r.deadline);
              return (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{displayUid(r, "REQ")}</span>
                      <span className="text-[15px] font-medium text-foreground">{r.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{r.agent_id}</span>
                      <Pill tone={dl.tone}>{dl.label}</Pill>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created {fmtDate(r.created_date)} · {ageLabel(r.created_date)}</span>
                      <span>Requester: {r.requested_by || "—"}</span>
                      <span>Owner: {r.owner_name} · {r.owner_email}</span>
                      <span>Env: <span className="font-mono uppercase">{r.environment || "prod"}</span></span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openAgent(r, null)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Review Details
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <ReviewPanel
        open={!!review}
        onOpenChange={(o) => !o && setReview(null)}
        item={review?.item}
        kind={review?.kind}
        intent={review?.intent}
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