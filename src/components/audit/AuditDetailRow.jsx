import { TableCell, TableRow } from "@/components/ui/table";
import { blastRadiusExplanation, deadlineStatus, approvalExpirationStatus, displayUid, fmtDate } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { FileText, Link2, Scale } from "lucide-react";

function Field({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <div className="vs-eyebrow">{label}</div>
      <div className={cn("mt-1 truncate text-xs text-foreground", mono && "font-mono")} title={String(value)}>{value}</div>
    </div>
  );
}

function Evidence({ item }) {
  const isLink = /^https?:\/\//i.test(String(item));
  if (!isLink) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Link2 className="h-3 w-3 shrink-0" />{String(item)}</span>;
  }
  return (
    <a href={item} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
      <Link2 className="h-3 w-3 shrink-0" /> <span className="truncate">{String(item)}</span>
    </a>
  );
}

/**
 * The expanded evidence behind one audited action: the reasoning trace the
 * governor recorded, the policies that matched, and the passport limits the
 * decision was made against. Everything shown is read from the record.
 */
export default function AuditDetailRow({ record, colSpan }) {
  const policies = record.policy_matches || [];
  const reasons = record.reasons || [];
  const evidence = record.linked_evidence || [];
  const deadline = deadlineStatus(record.deadline);
  const expiration = approvalExpirationStatus(record.approval_expires_at);

  return (
    <TableRow className="bg-surface/30 hover:bg-surface/30">
      <TableCell colSpan={colSpan} className="p-0">
        <div className="border-l-2 border-primary/60 px-5 py-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="vs-eyebrow">Decision Reasoning</span>
              </div>
              {reasons.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No reasoning trace was recorded for this evaluation.</p>
              ) : (
                <ol className="mt-2 space-y-1.5">
                  {reasons.map((reason, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="shrink-0 font-mono text-[10px] leading-4 text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">{String(reason).replace(/^\s*\d+\.\s*/, "")}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-primary" />
                <span className="vs-eyebrow">Policy Decision</span>
              </div>
              {policies.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {record.policy_matched_name || "No policy matched — decided on passport limits alone."}
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {policies.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-foreground">{p.name || "Unnamed policy"}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.required_decision || "—"}{p.priority != null ? ` · P${p.priority}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5 sm:grid-cols-3">
                <Field label="Event Reference" value={displayUid(record, "ACT")} mono />
                <Field label="Environment" value={record.environment || "prod"} />
                <Field label="Financial Limit" value={record.financial_limit_mode === "hard_cap" ? "Hard cap" : "Approval threshold"} />
                <Field label="Approval Scope" value={String(record.scope_type || "single_execution").replace(/_/g, " ")} />
                <Field label="Execution" value={record.executed_at ? `${record.execution_outcome || "unknown"} · ${fmtDate(record.executed_at)}` : String(record.execution_outcome || "unknown")} />
                <Field label="Decision Deadline" value={record.deadline ? `${deadline.label} · ${fmtDate(record.deadline)}` : "None set"} />
                <Field label="Approval Expires" value={record.approval_expires_at ? `${expiration.label} · ${fmtDate(record.approval_expires_at)}` : "No expiration"} />
                <Field label="Reversibility" value={String(record.reversibility || "reversible").replace(/_/g, " ")} />
                <Field label="Decisive Policy" value={record.policy_matched_name || "None"} />
                <Field label="Decided By" value={record.decided_by || "Not yet decided"} />
                <Field label="Decided Date" value={record.decided_date ? fmtDate(record.decided_date) : "Not yet decided"} />
                <Field label="Record ID" value={record.id} mono />
              </div>

              <p className="mt-3.5 rounded-md border border-border bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {blastRadiusExplanation(record.blast_radius_score)}
              </p>

              {evidence.length > 0 && (
                <div className="mt-3.5 min-w-0">
                  <div className="vs-eyebrow">Linked Evidence</div>
                  <ul className="mt-1.5 space-y-1">
                    {evidence.map((item, i) => <li key={i} className="min-w-0"><Evidence item={item} /></li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}