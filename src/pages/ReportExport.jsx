import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatTile from "@/components/StatTile";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { FileDown, Download, RefreshCw, ClipboardCheck, ScrollText } from "lucide-react";

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(s) { if (!s) return ""; try { return new Date(s).toLocaleString(); } catch { return s; } }

export default function ReportExport() {
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const exportActions = () => {
    const headers = ["Timestamp", "Agent", "Agent ID", "Action Type", "Target System", "Amount USD", "Blast Radius", "Reversibility", "Decision", "Status", "Policy Matched", "Decided By", "Owner Alerted", "Autonomy Downgraded"];
    const rows = actions.map((r) => [r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status, r.policy_matched_name || "", r.decided_by || "", r.alert_owner, r.autonomy_downgraded]);
    downloadCsv("venus-shield-actions-log.csv", headers, rows);
  };

  const exportApprovals = () => {
    const headers = ["Timestamp", "Request Type", "Agent ID", "Name", "Owner", "Owner Email", "Purpose", "Systems", "Financial Limit", "Autonomy", "Status", "Requested By", "Decided By", "Decided Date"];
    const rows = requests.map((r) => [r.created_date, r.request_type, r.agent_id, r.name, r.owner_name, r.owner_email, r.purpose, (r.systems || []).join("; "), r.financial_limit_usd, r.autonomy_level, r.status, r.requested_by, r.decided_by || "", r.decided_date || ""]);
    downloadCsv("venus-shield-approvals-log.csv", headers, rows);
  };

  const exportCombined = () => {
    const sep = ["Venus Shield — Compliance Report", `Generated: ${new Date().toISOString()}`, ""];
    const aHeaders = ["[ACTIONS] Timestamp,Agent,Agent ID,Action Type,Target,Amount,Blast,Reversibility,Decision,Status,Policy,Decided By"];
    const aRows = actions.map((r) => [r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status, r.policy_matched_name || "", r.decided_by || ""].join(","));
    const bHeaders = ["[APPROVALS] Timestamp,Request Type,Agent ID,Name,Owner,Status,Decided By,Decided Date"];
    const bRows = requests.map((r) => [r.created_date, r.request_type, r.agent_id, r.name, r.owner_name, r.status, r.decided_by || "", r.decided_date || ""].join(","));
    const text = [...sep, ...aHeaders, ...aRows, "", ...bHeaders, ...bRows].join("\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "venus-shield-compliance-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const pendingActions = actions.filter((a) => a.status === "pending_approval").length;
  const blocked = actions.filter((a) => a.decision === "blocked").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Report Export</h1>
          <p className="text-sm text-muted-foreground">Generate and download compliance logs of all agent actions and approvals.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Action Records" value={actions.length} icon={ScrollText} tone="blue" />
        <StatTile label="Blocked Actions" value={blocked} icon={FileDown} tone="red" />
        <StatTile label="Pending Actions" value={pendingActions} icon={FileDown} tone="amber" />
        <StatTile label="Approval Requests" value={requests.length} icon={ClipboardCheck} tone="blue" hint={`${pendingRequests} pending`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-primary" /> Generate Reports</CardTitle>
          <CardDescription>Download CSV files suitable for compliance audits and SOC 2 evidence.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button variant="outline" onClick={exportActions} disabled={!actions.length}><FileDown className="mr-2 h-4 w-4" /> Actions Log ({actions.length})</Button>
            <Button variant="outline" onClick={exportApprovals} disabled={!requests.length}><FileDown className="mr-2 h-4 w-4" /> Approvals Log ({requests.length})</Button>
            <Button variant="outline" onClick={exportCombined} disabled={!actions.length && !requests.length}><Download className="mr-2 h-4 w-4" /> Combined Compliance Report</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4 text-primary" /> Recent Actions</CardTitle>
          <CardDescription>Preview of the most recent evaluated actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div> : actions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No actions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.slice(0, 8).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.created_date)}</TableCell>
                      <TableCell className="font-medium">{r.agent_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.action_type}</TableCell>
                      <TableCell><VerdictBadge decision={r.decision} /></TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
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