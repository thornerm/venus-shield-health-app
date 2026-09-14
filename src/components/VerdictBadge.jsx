import { DECISION_META, STATUS_META, RISK_META } from "@/lib/governance";

export function VerdictBadge({ decision }) {
  const meta = DECISION_META[decision] || DECISION_META.allow;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.executed;
  const cls =
    meta.tone === "allow" ? "bg-allow/10 text-allow border-allow/30"
    : meta.tone === "review" ? "bg-review/10 text-review border-review/30"
    : "bg-blocked/10 text-blocked border-blocked/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {meta.label}
    </span>
  );
}

export function RiskBadge({ level }) {
  const meta = RISK_META[level] || RISK_META.low;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}