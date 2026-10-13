import { cn } from "@/lib/utils";

/**
 * Horizontal tab navigation with a thin gold underline on the selected tab.
 * `tabs` = [{ value, label, count? }]
 */
export default function TabBar({ tabs, value, onChange, className }) {
  return (
    <div className={cn("vs-scroll overflow-x-auto border-b border-border", className)}>
      <nav className="flex min-w-max items-stretch gap-0.5">
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {t.label}
                {t.count != null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </span>
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}