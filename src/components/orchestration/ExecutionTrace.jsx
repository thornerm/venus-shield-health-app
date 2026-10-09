import { CheckCircle, Loader, XCircle, MinusCircle } from "lucide-react";
import { TRACE_STATUS_META, formatStepLabel } from "@/lib/orchestration";

const ICONS = { CheckCircle, Loader, XCircle, MinusCircle };

export default function ExecutionTrace({ trace = [] }) {
  if (!trace.length) return null;
  return (
    <div className="space-y-0">
      {trace.map((step, idx) => {
        const meta = TRACE_STATUS_META[step.status] || TRACE_STATUS_META.completed;
        const Icon = ICONS[meta.icon] || CheckCircle;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon
                className={`h-5 w-5 shrink-0 ${meta.className} ${
                  step.status === "running" ? "animate-spin" : ""
                }`}
              />
              {idx < trace.length - 1 && <div className="my-0.5 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium leading-tight">{formatStepLabel(step.step)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              {step.timestamp && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}