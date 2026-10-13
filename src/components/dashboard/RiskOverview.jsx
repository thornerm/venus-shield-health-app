import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import Panel from "@/components/Panel";
import { riskForAgent } from "@/lib/governance";

const LEVELS = [
  { key: "high", label: "High", color: "#EF4444" },
  { key: "medium", label: "Medium", color: "#F59E0B" },
  { key: "low", label: "Low", color: "#10B981" },
];

export default function RiskOverview({ agents, actions }) {
  const dist = useMemo(() => {
    const d = { high: 0, medium: 0, low: 0 };
    for (const ag of agents) {
      const r = riskForAgent(ag, actions);
      if (d[r.level] != null) d[r.level]++;
    }
    return d;
  }, [agents, actions]);

  const total = agents.length;
  const data = LEVELS.map((l) => ({ ...l, value: dist[l.key] })).filter((l) => l.value > 0);

  return (
    <Panel
      title="Risk Overview"
      description="Agents grouped by assessed risk, from observed behaviour and protective controls."
    >
      {total === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No agents registered yet.</div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-[168px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={74}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-[26px] font-bold leading-none text-foreground">{total}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Agents</span>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {LEVELS.map((l) => (
              <li key={l.key} className="flex items-center gap-2.5 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="flex-1 text-muted-foreground">{l.label} risk</span>
                <span className="font-semibold text-foreground">{dist[l.key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}