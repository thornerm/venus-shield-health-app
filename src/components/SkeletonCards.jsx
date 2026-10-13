import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder provider cards used while the systems are still loading. */
export default function SkeletonCards({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading systems</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vs-card p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-md" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}