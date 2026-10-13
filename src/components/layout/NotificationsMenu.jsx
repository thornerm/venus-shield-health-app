import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ClipboardCheck, ShieldAlert, Ban } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";

/**
 * Notification bell. Shows live governance counts only — nothing is fabricated
 * and no metric appears until it has been read from the database.
 */
export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCounts(null);
    Promise.all([
      base44.entities.AgentApprovalRequest.count({ status: "pending" }),
      base44.entities.ActionRecord.count({ status: "pending_approval" }),
      base44.entities.ActionRecord.count({ status: "blocked" }),
    ])
      .then(([passports, actions, blocked]) => {
        if (alive) setCounts({ passports, actions, blocked });
      })
      .catch(() => { if (alive) setCounts(null); });
    return () => { alive = false; };
  }, [open]);

  const awaiting = counts ? counts.passports + counts.actions : 0;

  const rows = counts
    ? [
        { icon: ClipboardCheck, label: "Action reviews pending", value: counts.actions, to: "/approvals", tone: "text-review" },
        { icon: ShieldAlert, label: "Agent passport requests", value: counts.passports, to: "/approvals", tone: "text-review" },
        { icon: Ban, label: "Blocked actions on record", value: counts.blocked, to: "/audit", tone: "text-blocked" },
      ]
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {awaiting > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {awaiting > 99 ? "99+" : awaiting}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] border-border bg-popover p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Notifications</div>
          <div className="text-xs text-muted-foreground">Governance items awaiting attention</div>
        </div>
        <div className="p-2">
          {counts === null ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</div>
          ) : (
            rows.map((r) => (
              <Link
                key={r.label}
                to={r.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-200 hover:bg-accent"
              >
                <r.icon className={`h-4 w-4 shrink-0 ${r.tone}`} />
                <span className="flex-1 text-[13px] text-foreground">{r.label}</span>
                <span className="text-sm font-semibold text-foreground">{r.value}</span>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2.5">
          <Link to="/audit" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
            Open audit trail →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}