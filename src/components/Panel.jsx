import { cn } from "@/lib/utils";

/**
 * Shared surface panel — the card shell used across every redesigned screen.
 */
export default function Panel({ title, description, action, icon: Icon, className, contentClassName, children }) {
  return (
    <section className={cn("vs-card flex flex-col", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
              <h2 className="truncate font-heading text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("flex-1 p-5", contentClassName)}>{children}</div>
    </section>
  );
}