import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

/**
 * Renders a horizontal (desktop) / vertical (mobile) chain of labeled steps
 * to summarize a request or decision flow at a glance.
 *
 * `steps` = [{ label, sub, tone }] where tone ∈ allow | review | blocked | muted | gold.
 */
const TONES = {
  allow: "border-allow/40 bg-allow/10 text-allow",
  review: "border-review/40 bg-review/10 text-review",
  blocked: "border-blocked/40 bg-blocked/10 text-blocked",
  gold: "border-primary/40 bg-primary/10 text-primary",
  muted: "border-border bg-surface text-muted-foreground",
};

export default function FlowDiagram({ steps }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2 lg:flex-col">
          <div className={cn("flex-1 rounded-lg border px-3 py-2.5", TONES[s.tone] || TONES.muted)}>
            <div className="text-[13px] font-semibold leading-tight">{s.label}</div>
            {s.sub && <div className="mt-0.5 text-[11px] opacity-80 leading-tight">{s.sub}</div>}
          </div>
          {i < steps.length - 1 && (
            <>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 lg:block" />
              <ChevronDown className="mx-auto h-4 w-4 shrink-0 text-muted-foreground/50 lg:hidden" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}