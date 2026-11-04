import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/** Reason field + approve button for the currently selected requests. */
export default function BulkApprovalBar({ count, busy, onApprove }) {
  const [reason, setReason] = useState("");
  if (count === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">{count} selected</span>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required) — applied to every selected request"
        className="h-9 min-w-[240px] flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <Button
        size="sm"
        className="bg-allow text-allow-foreground hover:bg-allow/90"
        disabled={busy || !reason.trim()}
        onClick={async () => { await onApprove(reason.trim()); setReason(""); }}
      >
        <Check className="mr-1 h-4 w-4" /> {busy ? "Approving…" : `Approve ${count}`}
      </Button>
    </div>
  );
}