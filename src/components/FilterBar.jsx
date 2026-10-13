import { ENVIRONMENTS, TIME_RANGES } from "@/lib/metrics";
import { SlidersHorizontal } from "lucide-react";

const SELECT = "h-9 rounded-md border border-input bg-surface/50 px-3 text-sm text-foreground transition-colors duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function FilterBar({ env, setEnv, range, setRange, freshness }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </div>
      <select value={env} onChange={(e) => setEnv(e.target.value)} className={SELECT}>
        {ENVIRONMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={range} onChange={(e) => setRange(e.target.value)} className={SELECT}>
        {TIME_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {freshness && <span className="ml-auto text-xs text-muted-foreground">{freshness}</span>}
    </div>
  );
}