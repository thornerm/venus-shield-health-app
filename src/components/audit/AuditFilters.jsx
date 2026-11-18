import { ENVIRONMENTS, TIME_RANGES, VERDICT_META, STATUS_META } from "@/lib/metrics";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTROL = "h-9 rounded-md border border-input bg-surface/50 px-3 text-sm text-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Select({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="vs-eyebrow">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={CONTROL}>{children}</select>
    </label>
  );
}

export default function AuditFilters({ filters, setFilter, agents, freshness, onClear }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </div>
        <div role="group" aria-label="Time range" className="flex flex-wrap gap-1.5">
          {TIME_RANGES.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={filters.range === o.value}
              onClick={() => setFilter("range", o.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filters.range === o.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {freshness && <span className="ml-auto text-xs text-muted-foreground">{freshness}</span>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Agent" value={filters.agent} onChange={(v) => setFilter("agent", v)}>
          <option value="all">All agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select label="Decision" value={filters.decision} onChange={(v) => setFilter("decision", v)}>
          <option value="all">All decisions</option>
          {Object.entries(VERDICT_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
        <Select label="Status" value={filters.status} onChange={(v) => setFilter("status", v)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
        <Select label="Environment" value={filters.env} onChange={(v) => setFilter("env", v)}>
          {ENVIRONMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <label className="flex flex-col gap-1">
          <span className="vs-eyebrow">From date</span>
          <input type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className={CONTROL} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="vs-eyebrow">To date</span>
          <input type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className={CONTROL} />
        </label>
        <button type="button" onClick={onClear} className="h-9 px-2 text-xs text-muted-foreground underline hover:text-foreground">Clear filters</button>
      </div>
    </div>
  );
}