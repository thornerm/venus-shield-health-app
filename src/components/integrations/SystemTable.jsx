import { Link, useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ageLabel } from "@/lib/metrics";
import { ArrowRight, Plug } from "lucide-react";

const CHIP = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums";

export default function SystemTable({ rows, loading }) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading connected systems…</div>;
  }
  if (rows.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-muted-foreground">No systems match this view.</div>;
  }

  return (
    <div className="vs-scroll overflow-x-auto">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead>System</TableHead>
            <TableHead className="text-center">Agents</TableHead>
            <TableHead className="text-center">Actions</TableHead>
            <TableHead>Verdicts</TableHead>
            <TableHead>Policy Coverage</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow
              key={s.key}
              onClick={() => navigate(`/integrations/${s.key}`)}
              className="cursor-pointer transition-colors duration-200 hover:bg-surface/40"
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60">
                    <Plug className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{s.label}</div>
                    <div className="max-w-[280px] truncate text-[11px] text-muted-foreground">{s.description}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center text-[13px] tabular-nums text-foreground">{s.agentsInvolved.length}</TableCell>
              <TableCell className="text-center text-[13px] tabular-nums text-foreground">{s.total}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className={`${CHIP} border-allow/30 bg-allow/10 text-allow`}>{s.allow}</span>
                  <span className={`${CHIP} border-review/30 bg-review/10 text-review`}>{s.review}</span>
                  <span className={`${CHIP} border-blocked/30 bg-blocked/10 text-blocked`}>{s.blocked}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.policies.length > 0
                  ? `${s.policies.length} polic${s.policies.length === 1 ? "y" : "ies"}`
                  : <span className="text-muted-foreground/70">None</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.lastActivityIso ? ageLabel(s.lastActivityIso) : <span className="text-muted-foreground/70">No activity</span>}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  to={`/integrations/${s.key}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}