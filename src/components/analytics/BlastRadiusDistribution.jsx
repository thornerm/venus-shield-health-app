import Panel from "@/components/Panel";
import DefinitionTooltip from "@/components/DefinitionTooltip";
import { METRIC_DEFINITIONS, blastRadiusExplanation } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const SCORES = [
  { score: 1, name: "Isolated", chip: "bg-allow/10 text-allow", bar: "bg-allow" },
  { score: 2, name: "Limited", chip: "bg-allow/10 text-allow", bar: "bg-allow" },
  { score: 3, name: "Material", chip: "bg-review/10 text-review", bar: "bg-review" },
  { score: 4, name: "Major", chip: "bg-blocked/10 text-blocked", bar: "bg-blocked" },
  { score: 5, name: "Enterprise", chip: "bg-blocked/10 text-blocked", bar: "bg-blocked" },
];

export default function BlastRadiusDistribution({ actions }) {
  const counts = SCORES.map((s) => actions.filter((a) => Number(a.blast_radius_score) === s.score).length);
  const scored = counts.reduce((sum, n) => sum + n, 0);
  const unscored = actions.length - scored;
  const max = Math.max(...counts, 1);

  return (
    <Panel
      title="Blast Radius Distribution"
      description={<DefinitionTooltip term="Blast radius">{METRIC_DEFINITIONS.blastRadius}</DefinitionTooltip>}
    >
      {actions.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No evaluated actions in this range.</div>
      ) : (
        <>
          <div className="space-y-3">
            {SCORES.map(({ score, name, chip, bar }, i) => {
              const count = counts[i];
              const pct = actions.length ? Math.round((count / actions.length) * 100) : 0;
              return (
                <div key={score} className="flex items-center gap-3">
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", chip)}>{score}</span>
                  <span className="w-20 shrink-0 truncate text-[13px] font-medium text-foreground sm:w-24">{name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all duration-300", bar)} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">{count}</span>
                  <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">{pct}%</span>
                </div>
              );
            })}
          </div>

          {unscored > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {unscored} action{unscored === 1 ? "" : "s"} recorded no blast radius score.
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCORES.map(({ score }) => (
              <p key={score} className="text-[11px] leading-relaxed text-muted-foreground">{blastRadiusExplanation(score)}</p>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}