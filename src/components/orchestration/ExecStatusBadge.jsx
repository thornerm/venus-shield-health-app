import { EXEC_STATUS_META } from "@/lib/orchestration";

export default function ExecStatusBadge({ status }) {
  const meta = EXEC_STATUS_META[status] || EXEC_STATUS_META.queued;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}