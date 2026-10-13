import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "@/components/Panel";
import { CHART, VERDICT_COLORS } from "@/lib/chartTheme";

// Verdict series reuse the shared chart palette so every chart in the app matches.
const SERIES = [
  { key: "allow", label: "Allowed", color: VERDICT_COLORS.allow },
  { key: "review", label: "Review", color: VERDICT_COLORS.approval_required },
  { key: "blocked", label: "Blocked", color: VERDICT_COLORS.blocked },
];

function buildSeries(actions, days) {
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    buckets.push({
      ts: d.getTime(),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      allow: 0,
      review: 0,
      blocked: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.ts, i]));
  for (const a of actions) {
    const d = new Date(a.created_date || 0);
    if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const i = index.get(d.getTime());
    if (i == null) continue;
    if (a.decision === "allow") buckets[i].allow++;
    else if (a.decision === "approval_required") buckets[i].review++;
    else if (a.decision === "blocked") buckets[i].blocked++;
  }
  return buckets;
}

export default function AgentActivityChart({ actions }) {
  const series = useMemo(() => {
    const times = actions.map((a) => new Date(a.created_date || 0).getTime()).filter((t) => !isNaN(t));
    if (!times.length) return [];
    const spanDays = Math.ceil((Date.now() - Math.min(...times)) / 86400000) + 1;
    const days = Math.min(Math.max(spanDays, 7), 30);
    return buildSeries(actions, days);
  }, [actions]);

  const hasData = series.some((p) => p.allow + p.review + p.blocked > 0);

  return (
    <Panel
      title="Agent Activity"
      description="Governance decisions per day across evaluated agent actions."
      action={
        <div className="flex items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      }
      contentClassName="p-3 sm:p-4"
    >
      {!hasData ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          No evaluated actions in this range yet.
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}