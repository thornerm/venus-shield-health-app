import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ageLabel } from "@/lib/metrics";
import { roleLabel } from "@/lib/identity";
import { initials } from "@/lib/team";
import { cn } from "@/lib/utils";

const CHIP = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold";

const STATUS = {
  active: { cls: "border-allow/30 bg-allow/10 text-allow", dot: "bg-allow" },
  idle: { cls: "border-border bg-surface/60 text-muted-foreground", dot: "bg-muted-foreground" },
};

export default function MemberTable({ members, savingId, onRoleChange }) {
  if (members.length === 0) {
    return (
      <div className="px-5 py-14 text-center text-sm text-muted-foreground">
        No team member is on the roster yet. Invite someone to give them access.
      </div>
    );
  }

  return (
    <div className="vs-scroll overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-center">Decisions</TableHead>
            <TableHead className="text-center">Denials</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const status = STATUS[m.status] || STATUS.idle;
            return (
              <TableRow key={m.user_id} className="transition-colors duration-200 hover:bg-surface/40">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface/60 text-[11px] font-semibold text-primary">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-foreground">{m.name}</span>
                        {m.isCurrent && (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">You</span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{m.email || "no email on record"}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {m.isCurrent ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {roleLabel(m.role)}
                    </span>
                  ) : (
                    <Select value={m.role} onValueChange={(value) => onRoleChange(m, value)} disabled={savingId === m.user_id}>
                      <SelectTrigger className="h-8 w-[176px]" aria-label={`Role for ${m.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{roleLabel("admin")}</SelectItem>
                        <SelectItem value="user">{roleLabel("user")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell>
                  <span className={cn(CHIP, status.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden="true" />
                    {m.statusLabel}
                  </span>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {m.lastActive ? ageLabel(m.lastActive) : <span className="text-muted-foreground/70">No activity yet</span>}
                </TableCell>

                <TableCell className="text-center">
                  <div className="text-[13px] tabular-nums text-foreground">{m.decisions}</div>
                  <div className={cn("text-[10px]", m.actionDecisions || m.passportDecisions ? "text-muted-foreground" : "text-muted-foreground/60")}>
                    {m.actionDecisions} actions · {m.passportDecisions} passports
                  </div>
                </TableCell>

                <TableCell className="text-center text-[13px] tabular-nums text-blocked">{m.denials}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}