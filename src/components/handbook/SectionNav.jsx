import { cn } from "@/lib/utils";

/**
 * In-page section navigator for the DevOps handbook.
 * Mobile: horizontal scrollable pill bar (scrolls away with the page).
 * Desktop (lg+): sticky vertical list with active-section highlight.
 * `sections` = [{ id, label, icon }]. Clicking scrolls to the section.
 */
export default function SectionNav({ sections, activeId, onNavigate }) {
  return (
    <>
      {/* Mobile: horizontal scroll strip */}
      <nav className="vs-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-200",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop: sticky vertical list */}
      <nav className="vs-scroll sticky top-4 hidden max-h-[calc(100vh-2rem)] space-y-1 overflow-y-auto pr-2 lg:block">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Handbook
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}