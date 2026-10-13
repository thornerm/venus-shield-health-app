import { cn } from "@/lib/utils";

/**
 * Shared page header — 26–30px semibold title with a muted subtitle and an
 * optional actions cluster. Keeps every screen's top edge identical.
 */
export default function PageHeader({ title, subtitle, actions, className, children }) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}