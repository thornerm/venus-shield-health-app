import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AutonomyBadge from "@/components/AutonomyBadge";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { FINANCIAL_LIMIT_MODES } from "@/lib/governance";
import { ageLabel, fmtDate, deadlineStatus, approvalExpirationStatus, displayUid } from "@/lib/metrics";
import { AlertTriangle, Clock, Link2, ShieldCheck, FileJson, History, Check, X } from "lucide-react";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

function TonePill({ tone, children }) {
  const cls = tone === "blocked" ? "bg-blocked/10 text-blocked" : tone === "review" ? "bg-review/10 text-review" : tone === "allow" ? "bg-allow/10 text-allow" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function ReviewPanel({ open, onOpenChange, item, kind, passport, onApprove, onDeny, canApprove, cannotApproveReason, busy }) {
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [item?.id]);

  if (!item) return null;
  const isAgent = kind === "agent";
  const uid = displayUid(item, isAgent ? "REQ" : "ACT");
  const dl = deadlineStatus(item.deadline);
  const exp = approvalExpirationStatus(item.approval_expires_at);
  const scope = isAgent ? "ongoing_access" : (item.scope_type || "single_execution");
  const scopeText = scope === "ongoing_access"
    ? "Approving this request changes ongoing access — it provisions or modifies a passport that authorizes the agent to act repeatedly within these boundaries."
    : "Approving this request authorizes ONE execution of this action. The approval is consumed on use and cannot execute the action twice.";
  const history = item.decision_history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAgent ? <ShieldCheck className="h-5 w-5 text-primary" /> : <FileJson className="h-5 w-5 text-primary" />}
            Review: {isAgent ? item.name : item.action_type}
          </DialogTitle>
          <DialogDescription>{isAgent ? "Agent passport request" : "Escalated action"} · {uid}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3">
            <div className="divide-y divide-border">
              <Row label="Request ID">{uid}</Row>
              <Row label="Created">{fmtDate(item.created_date)} <span className="text-muted-foreground">({ageLabel(item.created_date)})</span></Row>
              <Row label="Requester">{item.requested_by || "—"}</Row>
              <Row label="Owner">{isAgent ? `${item.owner_name || ""} · ${item.owner_email || ""}` : (passport ? `${passport.name} (${passport.agent_id})` : "—")}</Row>
              <Row label="Environment"><span className="font-mono text-xs uppercase">{item.environment || "prod"}</span></Row>
              <Row label="Deadline"><TonePill tone={dl.tone}>{dl.label}</TonePill> {item.deadline && <span className="text-xs text-muted-foreground">· {fmtDate(item.deadline)}</span>}</Row>
            </div>
          </div>

          {isAgent ? (
            <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
              <div><span className="text-muted-foreground">Purpose:</span> {item.purpose}</div>
              <div><span className="text-muted-foreground">Systems:</span> {(item.systems || []).join(", ") || "none"}</div>
              <div><span className="text-muted-foreground">Limit:</span> ${Number(item.financial_limit_usd || 0).toLocaleString()} ({FINANCIAL_LIMIT_MODES[item.financial_limit_mode || "approval_threshold"]?.label})</div>
              <div><span className="text-muted-foreground">Prohibited:</span> {(item.prohibited_actions || []).join(", ") || "none"}</div>
              {item.notes && <div className="text-xs italic text-muted-foreground">Notes: {item.notes}</div>}
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <VerdictBadge decision={item.decision} />
                <StatusBadge status={item.status} />
                <span className="text-xs text-muted-foreground">on {item.target_system} · ${Number(item.amount_usd || 0).toLocaleString()} · blast {item.blast_radius_score}/5</span>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><FileJson className="h-3 w-3" /> Exact Parameters</div>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 text-xs font-mono">{JSON.stringify(item.params || {}, null, 2)}</pre>
              </div>
              {item.policy_matched_name && <div className="text-xs text-muted-foreground">Decisive policy: <span className="font-medium text-foreground">{item.policy_matched_name}</span></div>}
            </div>
          )}

          {(item.linked_evidence || []).length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Link2 className="h-3 w-3" /> Linked Evidence</div>
              <ul className="space-y-1 text-sm">
                {item.linked_evidence.map((e, i) => <li key={i} className="font-mono text-xs break-all">{e}</li>)}
              </ul>
            </div>
          )}

          {!isAgent && passport && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary"><ShieldCheck className="h-3 w-3" /> Passport Boundary</div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2"><AutonomyBadge level={passport.autonomy_level} /><span className="text-muted-foreground">{passport.name}</span></div>
                <div><span className="text-muted-foreground">Authorized systems:</span> {(passport.systems || []).join(", ") || "none"}</div>
                <div><span className="text-muted-foreground">Financial limit:</span> ${Number(passport.financial_limit_usd || 0).toLocaleString()} ({FINANCIAL_LIMIT_MODES[passport.financial_limit_mode || "approval_threshold"]?.label})</div>
                <div><span className="text-muted-foreground">Prohibited actions:</span> {(passport.prohibited_actions || []).join(", ") || "none"}</div>
                <div className="text-xs text-muted-foreground">This boundary is what the requested action is measured against.</div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-3 w-3" /> Approval Scope</div>
            <p>{scopeText}</p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Approval expiration:</span>
            <TonePill tone={exp.tone}>{exp.label}</TonePill>
            {item.approval_expires_at && <span className="text-xs text-muted-foreground">· {fmtDate(item.approval_expires_at)}</span>}
          </div>

          {history.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><History className="h-3 w-3" /> Decision History</div>
              <ul className="space-y-1 text-xs">
                {history.map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    <span className={`font-medium ${h.action === "approved" ? "text-allow" : "text-blocked"}`}>{h.action}</span>
                    <span className="text-muted-foreground">by {h.actor} · {fmtDate(h.timestamp)}</span>
                    {h.reason && <span className="text-muted-foreground">— {h.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason for decision (required)</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the rationale for this decision — preserved in the audit trail." rows={3} />
          </div>

          {canApprove ? null : (
            <div className="flex items-center gap-2 rounded-md bg-review/10 px-3 py-2 text-sm text-review"><AlertTriangle className="h-4 w-4" />{cannotApproveReason}</div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onDeny(reason.trim())} disabled={busy || !canApprove || !reason.trim()}>
            <X className="mr-1 h-4 w-4" /> Deny
          </Button>
          <Button onClick={() => onApprove(reason.trim())} disabled={busy || !canApprove || !reason.trim()}>
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}