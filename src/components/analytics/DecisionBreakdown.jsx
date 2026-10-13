import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import Panel from "@/components/Panel";
import { VERDICT_COLORS } from "@/lib/chartTheme";
import { VERDICT_META } from "@/lib/metrics";

const KEYS = ["allow", "approval_required", "blocked"];

export default function DecisionBreakdown({ verdicts }) {
  const total = verdicts.total;
  const data = KEYS.map((k) => ({ key: k, label: VERDICT_META[k].label, value: verdicts[k] })).filter((d) => d.value > 0);

  return (
    <Panel
      title="Decision Breakdown"
      description="How the engine ruled on each evaluation. Verdicts are counted independently of workflow status."
    >
      {total === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No evaluated actions in this range.</div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-[168px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={74} paddingAngle={3} stroke="none">
                  {data.map((d) => <Cell key={d.key} fill={VERDICT_COLORS[d.key]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-[26px] font-bold leading-none text-foreground">{total}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Evaluations</span>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {KEYS.map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: VERDICT_COLORS[k] }} />
                <span className="flex-1 truncate text-muted-foreground">{VERDICT_META[k].label}</span>
                <span className="font-semibold tabular-nums text-foreground">{verdicts[k]}</span>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round((verdicts[k] / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}