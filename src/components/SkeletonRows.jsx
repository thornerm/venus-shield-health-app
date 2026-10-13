import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Placeholder list rows used while a screen's records are still loading. */
export default function SkeletonRows({ rows = 6, className }) {
  return (
    <div className={cn("space-y-3 p-5", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}