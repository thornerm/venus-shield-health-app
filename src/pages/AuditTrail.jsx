import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlastRiskBadge, StatusBadge, VerdictBadge } from "@/components/VerdictBadge";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import AuditFilters from "@/components/audit/AuditFilters";
import { toast } from "@/components/ui/use-toast";
import SkeletonRows from "@/components/SkeletonRows";
import AuditDetailRow from "@/components/audit/AuditDetailRow";
import { verdictCounts, statusCounts, applyFilters, freshnessLabel, fmtDate, displayUid } from "@/lib/metrics";
import { downloadCsv } from "@/lib/csv";
import { ChevronDown, Download, RefreshCw, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = 16;
const INITIAL_FILTERS = { env: "all", range: "all", agent: "all", decision: "all", status: "all", from: "", to: "" };

function exportCsv(records) {
  const headers = ["Request UID", "Timestamp", "Agent", "Agent ID", "Action Type", "Target System", "Amount USD", "Blast Radius", "Reversibility", "Decision", "Status", "Source", "Environment", "Requested By", "Decisive Policy", "All Matched Policies", "Financial Limit Mode", "Decided By", "Decided Date", "Reasoning Trace"];
  const rows = records.map((r) => [
    displayUid(r, "ACT"), r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status, r.source || "ui", r.environment || "prod",
    r.requested_by || "", r.policy_matched_name || "", (r.policy_matches || []).map((m) => `${m.name}(${m.required_decision})`).join(" | "), r.financial_limit_mode || "", r.decided_by || "",
    r.decided_date || "", (r.reasons || []).join(" | "),
  ]);
  downloadCsv("venus-shield-audit-trail.csv", headers, rows);
  toast({ title: "Export started", description: `${records.length} record${records.length === 1 ? "" : "s"} saved to venus-shield-audit-trail.csv` });
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
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value }));
  const { env, range } = filters;
  const [source, setSource] = useState("all");
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    setLoading(true);
    const page = await base44.entities.ActionRecord.filter({}, { sort: "-created_date", limit: 500 });
    setRecords(page?.items || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const f = useMemo(() => {
    let base = applyFilters(records, { env, range });
    if (filters.agent !== "all") base = base.filter((r) => r.agent_id === filters.agent);
    if (filters.decision !== "all") base = base.filter((r) => r.decision === filters.decision);
    if (filters.status !== "all") base = base.filter((r) => r.status === filters.status);
    if (filters.from) base = base.filter((r) => new Date(r.created_date) >= new Date(`${filters.from}T00:00:00`));
    if (filters.to) base = base.filter((r) => new Date(r.created_date) <= new Date(`${filters.to}T23:59:59.999`));
    if (source === "all") return base;
    if (source === "runtime") return base.filter((r) => r.source && r.source !== "ui");
    return base.filter((r) => !r.source || r.source === "ui");
  }, [records, filters, env, range, source]);
  const agents = useMemo(() => {
    const m = new Map();
    records.forEach((r) => { if (r.agent_id && !m.has(r.agent_id)) m.set(r.agent_id, { id: r.agent_id, name: r.agent_name || r.agent_id }); });
    return [...m.values()];
  }, [records]);
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

      <AuditFilters filters={filters} setFilter={setFilter} agents={agents} freshness={freshness} onClear={() => { setFilters(INITIAL_FILTERS); setSource("all"); }} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tally label="Allow" value={v.allow} tone="allow" />
        <Tally label="Approval Req." value={v.approval_required} tone="review" />
        <Tally label="Blocked" value={v.blocked} tone="blocked" />
        <Tally label="Pending" value={s.pending_approval} tone="review" />
        <Tally label="Denied" value={s.denied} tone="blocked" />
      </div>

      <Panel
        title="Event Log"
        description={`${f.length} recorded evaluation${f.length === 1 ? "" : "s"} · verdicts sum to ${v.total}. Newest first. Expand any row for its reasoning trace and matched policies.`}
        icon={ScrollText}
        contentClassName="p-0"
        action={
          <div className="flex items-center gap-2">
            <label htmlFor="source-filter" className="vs-eyebrow">Source</label>
            <select
              id="source-filter"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All sources</option>
              <option value="runtime">Runtime only</option>
              <option value="ui">Human console (UI)</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <SkeletonRows rows={8} />
        ) : f.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            {records.length === 0 ? "No actions have been evaluated yet." : "No records match the current filters."}
          </div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table className="min-w-[1320px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Request UID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Env</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Decided By</TableHead>
                  <TableHead>Decided Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.flatMap((r) => {
                  const open = openId === r.id;
                  const rows = [
                    <TableRow key={r.id} className="transition-colors duration-200 hover:bg-surface/40">
                        <TableCell className="pr-0">
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : r.id)}
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} evidence for ${displayUid(r, "ACT")}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                          >
                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
                          </button>
                        </TableCell>
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
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={r.policy_matched_name || ""}>
                          {r.policy_matched_name || <span className="text-muted-foreground/70">No policy</span>}
                        </TableCell>
                        <TableCell><VerdictBadge decision={r.decision} /></TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          {r.source && r.source !== "ui" ? (
                            <span className="inline-flex rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-info" title={`source: ${r.source}`}>
                              {r.source === "mcp-proxy" || r.source === "sdk" || r.source === "runtime" ? "Runtime" : r.source}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">UI</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={r.requested_by || ""}>{r.requested_by || "—"}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={r.decided_by || ""}>{r.decided_by || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.decided_date ? fmtDate(r.decided_date) : "—"}</TableCell>
                    </TableRow>,
                  ];

                  if (open) rows.push(<AuditDetailRow key={`${r.id}-evidence`} record={r} colSpan={COLUMNS} />);
                  return rows;
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}