import { ENVIRONMENTS, TIME_RANGES } from "@/lib/metrics";
import { Filter } from "lucide-react";

export default function FilterBar({ env, setEnv, range, setRange, freshness }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters</span>
      </div>
      <select
        value={env}
        onChange={(e) => setEnv(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {ENVIRONMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {TIME_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {freshness && <span className="ml-auto text-xs text-muted-foreground">{freshness}</span>}
    </div>
  );
}