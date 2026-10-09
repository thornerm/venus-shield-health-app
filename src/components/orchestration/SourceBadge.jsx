import { SOURCE_META } from "@/lib/orchestration";

export default function SourceBadge({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.venus_official;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}