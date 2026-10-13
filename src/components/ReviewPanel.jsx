import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AutonomyBadge from "@/components/AutonomyBadge";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { FINANCIAL_LIMIT_MODES } from "@/lib/governance";
import { ageLabel, fmtDate, deadlineStatus, approvalExpirationStatus, displayUid } from "@/lib/metrics";
import { AlertTriangle, Clock, Link2, ShieldCheck, FileJson, History, Check, X, Info } from "lucide-react";

function Section({ icon: Icon, title, children, tone }) {
  return (
    <section className={tone === "warn" ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : "rounded-xl border border-border bg-surface/30 p-4"}>
      <div className="mb-2.5 flex items-center gap-1.5 vs-eyebrow">
        {Icon && <Icon className={tone === "warn" ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5"} />}
        {title}
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

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

const APPROVE_BTN = "bg-allow text-allow-foreground shadow-soft hover:bg-allow/90";

/**
 * Detailed review drawer. Every decision still requires an explicit reason and
 * passes the same authorization checks it did before — an intent carried in
 * from a row control only highlights which decision is being confirmed.
 */
export default function ReviewPanel({ open, onOpenChange, item, kind, passport, onApprove, onDeny, canApprove, cannotApproveReason, busy, intent }) {
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
  const flagReasons = item.reasons || [];
  const alreadyDecided = isAgent ? item.status !== "pending" : item.status !== "pending_approval";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg">
            {isAgent ? <ShieldCheck className="h-5 w-5 text-primary" /> : <FileJson className="h-5 w-5 text-primary" />}
            {isAgent ? item.name : item.action_type}
          </SheetTitle>
          <SheetDescription>
            {isAgent ? "Agent passport request" : "Escalated action"} · {uid}
          </SheetDescription>
        </SheetHeader>

        <div className="vs-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Audit / event reference */}
          <Section icon={History} title="Request Reference">
            <div className="divide-y divide-border">
              <Row label="Request ID"><span className="font-mono text-xs">{uid}</span></Row>
              <Row label="Requested">{fmtDate(item.created_date)} <span className="text-muted-foreground">({ageLabel(item.created_date)})</span></Row>
              <Row label="Requested by">{item.requested_by || "—"}</Row>
              <Row label="Environment"><span className="font-mono text-xs uppercase">{item.environment || "prod"}</span></Row>
              <Row label="Deadline"><TonePill tone={dl.tone}>{dl.label}</TonePill> {item.deadline && <span className="text-xs text-muted-foreground">· {fmtDate(item.deadline)}</span>}</Row>
            </div>
          </Section>

          {/* Agent identity */}
          {isAgent ? (
            <Section icon={ShieldCheck} title="Agent Identity">
              <div><span className="text-muted-foreground">Agent ID:</span> <span className="font-mono text-xs">{item.agent_id}</span></div>
              <div><span className="text-muted-foreground">Owner:</span> {item.owner_name || "—"} · {item.owner_email || "—"}</div>
              <div className="flex items-center gap-2"><AutonomyBadge level={item.autonomy_level} /><span className="text-xs text-muted-foreground">requested autonomy</span></div>
            </Section>
          ) : (
            <Section icon={ShieldCheck} title="Agent Identity">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.agent_name || item.agent_id}</span>
                <span className="font-mono text-xs text-muted-foreground">{item.agent_id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <VerdictBadge decision={item.decision} />
                <StatusBadge status={item.status} />
              </div>
            </Section>
          )}

          {/* Requested operation + target system */}
          {isAgent ? (
            <Section icon={FileJson} title="Requested Operation">
              <div><span className="text-muted-foreground">Purpose:</span> {item.purpose}</div>
              <div><span className="text-muted-foreground">Systems requested:</span> {(item.systems || []).join(", ") || "none"}</div>
              <div><span className="text-muted-foreground">Financial limit:</span> ${Number(item.financial_limit_usd || 0).toLocaleString()} ({FINANCIAL_LIMIT_MODES[item.financial_limit_mode || "approval_threshold"]?.label})</div>
              <div><span className="text-muted-foreground">Prohibited actions:</span> {(item.prohibited_actions || []).join(", ") || "none"}</div>
              {item.notes && <div className="text-xs italic text-muted-foreground">Notes: {item.notes}</div>}
            </Section>
          ) : (
            <>
              <Section icon={FileJson} title="Requested Operation">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><span className="text-muted-foreground">Action:</span> <span className="font-mono text-xs">{item.action_type}</span></span>
                  <span><span className="text-muted-foreground">Target:</span> {item.target_system || "—"}</span>
                  <span><span className="text-muted-foreground">Amount:</span> ${Number(item.amount_usd || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-xs text-muted-foreground">Blast radius {item.blast_radius_score}/5 · {item.reversibility}</span>
                </div>
              </Section>

              <Section icon={FileJson} title="Data Involved">
                <pre className="vs-scroll overflow-x-auto rounded-lg bg-background/60 p-3 text-xs font-mono text-foreground">{JSON.stringify(item.params || {}, null, 2)}</pre>
              </Section>

              {item.policy_matched_name && (
                <Section icon={ShieldCheck} title="Applicable Policy">
                  <div><span className="text-muted-foreground">Decisive:</span> <span className="font-medium text-foreground">{item.policy_matched_name}</span></div>
                  {(item.policy_matches || []).length > 0 && (
                    <ul className="space-y-1 pt-0.5">
                      {item.policy_matches.map((m, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-foreground">{m.name}</span>
                          <span className="text-muted-foreground">priority {m.priority}</span>
                          <VerdictBadge decision={m.required_decision} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}
            </>
          )}

          {/* Reason for the flag */}
          {flagReasons.length > 0 && (
            <Section icon={AlertTriangle} title="Reason for the Flag">
              <ul className="vs-scroll max-h-56 space-y-1.5 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
                {flagReasons.map((r, i) => <li key={i} className="font-mono">{r}</li>)}
              </ul>
            </Section>
          )}

          {(item.linked_evidence || []).length > 0 && (
            <Section icon={Link2} title="Linked Evidence">
              <ul className="space-y-1">
                {item.linked_evidence.map((e, i) => <li key={i} className="font-mono text-xs break-all">{e}</li>)}
              </ul>
            </Section>
          )}

          {!isAgent && passport && (
            <Section icon={ShieldCheck} title="Passport Boundary" tone="warn">
              <div className="flex items-center gap-2"><AutonomyBadge level={passport.autonomy_level} /><span className="text-muted-foreground">{passport.name}</span></div>
              <div><span className="text-muted-foreground">Authorized systems:</span> {(passport.systems || []).join(", ") || "none"}</div>
              <div><span className="text-muted-foreground">Financial limit:</span> ${Number(passport.financial_limit_usd || 0).toLocaleString()} ({FINANCIAL_LIMIT_MODES[passport.financial_limit_mode || "approval_threshold"]?.label})</div>
              <div><span className="text-muted-foreground">Prohibited actions:</span> {(passport.prohibited_actions || []).join(", ") || "none"}</div>
              <div className="text-xs text-muted-foreground">This boundary is what the requested action is measured against.</div>
            </Section>
          )}

          <Section icon={AlertTriangle} title="Approval Scope">
            <p className="text-sm">{scopeText}</p>
            <div className="flex items-center gap-2 pt-1 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Approval expiration:</span>
              <TonePill tone={exp.tone}>{exp.label}</TonePill>
              {item.approval_expires_at && <span className="text-xs text-muted-foreground">· {fmtDate(item.approval_expires_at)}</span>}
            </div>
          </Section>

          {history.length > 0 && (
            <Section icon={History} title="Decision History">
              <ul className="space-y-1 text-xs">
                {history.map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-2">
                    <span className={`font-medium ${h.action === "approved" ? "text-allow" : "text-blocked"}`}>{h.action}</span>
                    <span className="text-muted-foreground">by {h.actor} · {fmtDate(h.timestamp)}</span>
                    {h.reason && <span className="text-muted-foreground">— {h.reason}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Decision controls */}
          <Section icon={Check} title="Decision">
            {alreadyDecided ? (
              <div className="flex items-start gap-2 rounded-md bg-surface/60 px-3 py-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This {isAgent ? "request" : "action"} is no longer awaiting a decision
                  {item.decided_by ? ` — recorded by ${item.decided_by}` : ""}
                  {item.decided_date ? ` on ${fmtDate(item.decided_date)}` : ""}. The outcome is preserved in the audit trail.
                </span>
              </div>
            ) : (
              <>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason for decision (required)</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the rationale for this decision — preserved in the audit trail." rows={3} />
                {canApprove ? (
                  <p className="text-xs text-muted-foreground">
                    {intent === "approve" ? "You chose Approve — confirm below to release this decision."
                      : intent === "deny" ? "You chose Deny — confirm below to reject this request."
                      : "A reason is required before either decision can be recorded."}
                  </p>
                ) : (
                  <div className="flex items-start gap-2 rounded-md bg-review/10 px-3 py-2 text-sm text-review">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{cannotApproveReason}
                  </div>
                )}
              </>
            )}
          </Section>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4 sm:justify-end">
          <Button
            variant="outline"
            className="border-blocked/40 text-blocked hover:bg-blocked/10 hover:text-blocked"
            onClick={() => onDeny(reason.trim())}
            disabled={busy || alreadyDecided || !canApprove || !reason.trim()}
          >
            <X className="mr-1.5 h-4 w-4" /> Deny
          </Button>
          <Button className={APPROVE_BTN} onClick={() => onApprove(reason.trim())} disabled={busy || alreadyDecided || !canApprove || !reason.trim()}>
            <Check className="mr-1.5 h-4 w-4" /> Approve
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}