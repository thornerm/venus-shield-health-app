import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatTile from "@/components/StatTile";
import FilterBar from "@/components/FilterBar";
import Panel from "@/components/Panel";
import PageHeader from "@/components/PageHeader";
import ReportCard from "@/components/reporting/ReportCard";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { verdictCounts, statusCounts, requestStatusCounts, applyFilters, freshnessLabel, fmtDate, displayUid } from "@/lib/metrics";
import { downloadCsv, downloadReport } from "@/lib/csv";
import { FileDown, Download, RefreshCw, ClipboardCheck, ScrollText } from "lucide-react";

export default function ReportExport() {
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState("all");
  const [range, setRange] = useState("all");

  const load = async () => {
    setLoading(true);
    const [a, r] = await Promise.all([
      base44.entities.ActionRecord.list("-created_date", 500),
      base44.entities.AgentApprovalRequest.list("-created_date", 500),
    ]);
    setActions(a || []);
    setRequests(r || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fActions = useMemo(() => applyFilters(actions, { env, range }), [actions, env, range]);
  const fRequests = useMemo(() => applyFilters(requests, { env, range }), [requests, env, range]);
  const v = useMemo(() => verdictCounts(fActions), [fActions]);
  const s = useMemo(() => statusCounts(fActions), [fActions]);
  const rs = useMemo(() => requestStatusCounts(fRequests), [fRequests]);
  const freshness = freshnessLabel(fActions);

  const exportActions = () => {
    const headers = ["Request UID", "Timestamp", "Agent", "Agent ID", "Action Type", "Target System", "Amount USD", "Blast Radius", "Reversibility", "Decision", "Status", "Environment", "Policy Matched", "All Matched Policies", "Financial Limit Mode", "Requested By", "Decided By", "Owner Alerted", "Autonomy Downgraded", "Execution Consumed"];
    const rows = fActions.map((r) => [displayUid(r, "ACT"), r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status, r.environment || "prod", r.policy_matched_name || "", (r.policy_matches || []).map((m) => `${m.name}(${m.required_decision})`).join(" | "), r.financial_limit_mode || "", r.requested_by || "", r.decided_by || "", r.alert_owner, r.autonomy_downgraded, r.execution_consumed]);
    downloadCsv("venus-shield-actions-log.csv", headers, rows);
  };

  const exportApprovals = () => {
    const headers = ["Request UID", "Timestamp", "Request Type", "Agent ID", "Name", "Owner", "Owner Email", "Purpose", "Systems", "Financial Limit", "Limit Mode", "Autonomy", "Environment", "Deadline", "Scope", "Status", "Requested By", "Decided By", "Decided Date"];
    const rows = fRequests.map((r) => [displayUid(r, "REQ"), r.created_date, r.request_type, r.agent_id, r.name, r.owner_name, r.owner_email, r.purpose, (r.systems || []).join("; "), r.financial_limit_usd, r.financial_limit_mode, r.autonomy_level, r.environment || "prod", r.deadline || "", r.scope_type || "", r.status, r.requested_by, r.decided_by || "", r.decided_date || ""]);
    downloadCsv("venus-shield-approvals-log.csv", headers, rows);
  };

  const exportCombined = () => {
    const aHeaders = ["[ACTIONS] Request UID,Timestamp,Agent,Agent ID,Action,Target,Amount,Decision,Status,Env,Policy,Decided By"];
    const aRows = fActions.map((r) => [displayUid(r, "ACT"), r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.decision, r.status, r.environment || "prod", r.policy_matched_name || "", r.decided_by || ""].join(","));
    const bHeaders = ["[APPROVALS] Request UID,Timestamp,Type,Agent ID,Name,Owner,Status,Decided By,Decided Date"];
    const bRows = fRequests.map((r) => [displayUid(r, "REQ"), r.created_date, r.request_type, r.agent_id, r.name, r.owner_name, r.status, r.decided_by || "", r.decided_date || ""].join(","));
    const text = ["Venus Shield — Compliance Report", `Generated: ${new Date().toISOString()}`, `Filters: env=${env} range=${range}`, "", ...aHeaders, ...aRows, "", ...bHeaders, ...bRows].join("\n");
    downloadReport("venus-shield-compliance-report.csv", text);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        subtitle="Generate compliance logs of every governed action and approval. Exports reflect the filters below and use the same definitions as the Dashboard and Audit Trail."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <FilterBar env={env} setEnv={setEnv} range={range} setRange={setRange} freshness={freshness} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Action Records" value={fActions.length} icon={ScrollText} tone="blue" hint={`${v.allow} allow · ${v.blocked} blocked`} />
        <StatTile label="Blocked" value={v.blocked} icon={FileDown} tone="red" />
        <StatTile label="Pending / Denied" value={s.pending_approval + s.denied} icon={FileDown} tone="amber" hint={`${s.pending_approval} pending · ${s.denied} denied`} />
        <StatTile label="Approval Requests" value={fRequests.length} icon={ClipboardCheck} tone="blue" hint={`${rs.pending} pending · ${rs.denied} denied`} />
      </div>

      <Panel
        title="Available Reports"
        description="CSV files suitable for compliance audits and SOC 2 evidence. Each download covers the records matching the filters above."
        icon={Download}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ReportCard
            title="Actions Log"
            description="Every evaluated action with its verdict, blast radius, matched policy, decision trail, and execution outcome."
            count={fActions.length}
            icon={ScrollText}
            onDownload={exportActions}
          />
          <ReportCard
            title="Approvals Log"
            description="Every agent passport request with its scope, deadline, financial limits, and the decision that was recorded."
            count={fRequests.length}
            icon={ClipboardCheck}
            onDownload={exportApprovals}
          />
          <ReportCard
            title="Combined Compliance Report"
            description="Actions and approvals in a single file, stamped with the generation time and the filters in force."
            count={fActions.length + fRequests.length}
            icon={Download}
            onDownload={exportCombined}
            accent
          />
        </div>
      </Panel>

      <Panel
        title="Recent Actions"
        description="Preview of the most recent evaluated actions under the current filters."
        icon={ScrollText}
        contentClassName="p-0"
      >
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : fActions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No actions recorded for these filters.</div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request UID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fActions.slice(0, 8).map((r) => (
                  <TableRow key={r.id} className="transition-colors duration-200 hover:bg-surface/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{displayUid(r, "ACT")}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.created_date)}</TableCell>
                    <TableCell className="text-[13px] font-medium text-foreground">{r.agent_name}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{r.action_type}</TableCell>
                    <TableCell><VerdictBadge decision={r.decision} /></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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