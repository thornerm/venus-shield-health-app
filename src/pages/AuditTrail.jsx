import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlastRiskBadge, StatusBadge, VerdictBadge } from "@/components/VerdictBadge";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import FilterBar from "@/components/FilterBar";
import { verdictCounts, statusCounts, applyFilters, freshnessLabel, fmtDate, displayUid } from "@/lib/metrics";
import { downloadCsv } from "@/lib/csv";
import { Download, RefreshCw, ScrollText } from "lucide-react";

function exportCsv(records) {
  const headers = ["Request UID", "Timestamp", "Agent", "Agent ID", "Action Type", "Target System", "Amount USD", "Blast Radius", "Reversibility", "Decision", "Status", "Environment", "Requested By", "Decisive Policy", "All Matched Policies", "Financial Limit Mode", "Decided By"];
  const rows = records.map((r) => [
    displayUid(r, "ACT"), r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status, r.environment || "prod",
    r.requested_by || "", r.policy_matched_name || "", (r.policy_matches || []).map((m) => `${m.name}(${m.required_decision})`).join(" | "), r.financial_limit_mode || "", r.decided_by || "",
  ]);
  downloadCsv("venus-shield-audit-trail.csv", headers, rows);
}

function Tally({ label, value, tone }) {
  const color =
    tone === "allow" ? "text-allow" : tone === "review" ? "text-review" : tone === "blocked" ? "text-blocked" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="vs-eyebrow">{label}</div>
      <div className={`mt-2 font-heading text-[26px] font-bold leading-none tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export default function AuditTrail() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState("all");
  const [range, setRange] = useState("all");

  const load = async () => {
    setLoading(true);
    const page = await base44.entities.ActionRecord.filter({}, { sort: "-created_date", limit: 500 });
    setRecords(page?.items || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const f = useMemo(() => applyFilters(records, { env, range }), [records, env, range]);
  const v = useMemo(() => verdictCounts(f), [f]);
  const s = useMemo(() => statusCounts(f), [f]);
  const freshness = freshnessLabel(f);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Every evaluated agent action, in chronological order. Verdicts and workflow status are recorded separately so totals always reconcile."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => exportCsv(f)} disabled={!f.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tally label="Allow" value={v.allow} tone="allow" />
        <Tally label="Approval Req." value={v.approval_required} tone="review" />
        <Tally label="Blocked" value={v.blocked} tone="blocked" />
        <Tally label="Pending" value={s.pending_approval} tone="review" />
        <Tally label="Denied" value={s.denied} tone="blocked" />
      </div>

      <Panel
        title="Event Log"
        description={`${f.length} recorded evaluation${f.length === 1 ? "" : "s"} · verdicts sum to ${v.total}. Newest first.`}
        icon={ScrollText}
        contentClassName="p-0"
      >
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading audit trail…</div>
        ) : f.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {records.length === 0 ? "No actions evaluated yet." : "No records match the current filters."}
          </div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request UID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Env</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Decided By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.map((r) => (
                  <TableRow key={r.id} className="transition-colors duration-200 hover:bg-surface/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{displayUid(r, "ACT")}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.created_date)}</TableCell>
                    <TableCell>
                      <div className="text-[13px] font-medium text-foreground">{r.agent_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.agent_id}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{r.action_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.target_system}</TableCell>
                    <TableCell className="font-mono text-xs uppercase text-muted-foreground">{r.environment || "prod"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">${Number(r.amount_usd || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <BlastRiskBadge score={r.blast_radius_score} />
                      <div className="mt-1 text-[10px] text-muted-foreground">{r.blast_radius_score ?? "—"}/5 · {r.reversibility}</div>
                    </TableCell>
                    <TableCell><VerdictBadge decision={r.decision} /></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={r.requested_by || ""}>{r.requested_by || "—"}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={r.decided_by || ""}>{r.decided_by || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}