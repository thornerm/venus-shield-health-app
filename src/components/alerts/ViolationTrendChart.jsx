import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chartTheme";
import { VIOLATION_SERIES } from "@/lib/violationTrends";

export default function ViolationTrendChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke={CHART.axis} fontSize={11} tickLine={false} interval={4} />
          <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {VIOLATION_SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="v"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}