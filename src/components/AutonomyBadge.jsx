import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AUTONOMY_DEFINITIONS, AUTONOMY_BADGE_CLASS } from "@/lib/governance";
import { Info } from "lucide-react";

export default function AutonomyBadge({ level, withTooltip = true, size = "sm" }) {
  const cls = AUTONOMY_BADGE_CLASS[level] || AUTONOMY_BADGE_CLASS.standard;
  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium capitalize ${cls} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
    >
      {level}
      {withTooltip && <Info className="h-3 w-3 opacity-60" />}
    </span>
  );
  if (!withTooltip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        <span className="block font-semibold capitalize">{level} autonomy</span>
        <span className="block text-muted-foreground">{AUTONOMY_DEFINITIONS[level]}</span>
      </TooltipContent>
    </Tooltip>
  );
}