import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Panel from "@/components/Panel";
import AutonomyBadge from "@/components/AutonomyBadge";
import { ageLabel } from "@/lib/metrics";
import { Users } from "lucide-react";

const ACCESS = {
  yes: "border-allow/30 bg-allow/10 text-allow",
  no: "border-review/30 bg-review/10 text-review",
};

export default function SystemAgentsPanel({ label, access }) {
  return (
    <Panel
      title="Agent Access"
      description={`Passports wired to ${label}, and which of them have actually acted there.`}
      icon={Users}
      contentClassName="p-0"
    >
      {access.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">No agent is wired to this system yet.</div>
      ) : (
        <div className="vs-scroll overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Autonomy</TableHead>
                <TableHead>Passport Access</TableHead>
                <TableHead className="text-center">Actions Here</TableHead>
                <TableHead className="text-center">Blocked</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {access.map((a) => (
                <TableRow key={a.agent_id} className="transition-colors duration-200 hover:bg-surface/40">
                  <TableCell>
                    <Link to={`/passports?q=${encodeURIComponent(a.name)}`} className="text-[13px] font-medium text-foreground hover:text-primary">
                      {a.name}
                    </Link>
                    <div className="font-mono text-[10px] text-muted-foreground">{a.agent_id}</div>
                  </TableCell>
                  <TableCell>{a.autonomy ? <AutonomyBadge level={a.autonomy} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${a.authorized ? ACCESS.yes : ACCESS.no}`}>
                      {a.authorized ? "Authorized" : "Not in passport"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums text-foreground">{a.total}</TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums text-blocked">{a.blocked}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.lastActivity ? ageLabel(a.lastActivity) : <span className="text-muted-foreground/70">No activity</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}