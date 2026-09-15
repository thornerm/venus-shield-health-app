import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge, StatusBadge } from "@/components/VerdictBadge";
import { Download, RefreshCw, ScrollText } from "lucide-react";

function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function exportCsv(records) {
  const headers = ["Timestamp", "Agent", "Agent ID", "Action Type", "Target System", "Amount USD", "Blast Radius", "Reversibility", "Decision", "Status", "Requested By", "Decisive Policy", "All Matched Policies", "Financial Limit Mode", "Decided By"];
  const rows = records.map((r) => [
    r.created_date, r.agent_name, r.agent_id, r.action_type, r.target_system, r.amount_usd, r.blast_radius_score, r.reversibility, r.decision, r.status,
    r.requested_by || "", r.policy_matched_name || "",
    (r.policy_matches || []).map((m) => `${m.name}(${m.required_decision})`).join(" | "),
    r.financial_limit_mode || "", r.decided_by || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "venus-shield-audit-trail.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function AuditTrail() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const a = await base44.entities.ActionRecord.list("-created_date", 200);
    setRecords(a || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground">Chronological, SOC 2-style decision log for every governed action. Historical attribution is preserved.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => exportCsv(records)} disabled={!records.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4 text-primary" /> Decision Log</CardTitle>
          <CardDescription>{records.length} recorded evaluation{records.length === 1 ? "" : "s"}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading audit trail…</div>
          ) : records.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No actions evaluated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="center">Blast</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Decided By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.created_date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.agent_name}</div>
                        <div className="text-xs text-muted-foreground">{r.agent_id}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.action_type}</TableCell>
                      <TableCell className="text-xs">{r.target_system}</TableCell>
                      <TableCell className="text-right text-xs">${Number(r.amount_usd || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs">{r.blast_radius_score}/5</TableCell>
                      <TableCell><VerdictBadge decision={r.decision} /></TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={r.requested_by || ""}>{r.requested_by || "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={r.decided_by || ""}>{r.decided_by || "—"}</TableCell>
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