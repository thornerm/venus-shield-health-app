import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Panel from "@/components/Panel";
import { Skeleton } from "@/components/ui/skeleton";
import ViolationTrendChart from "@/components/alerts/ViolationTrendChart";
import TopOffenders from "@/components/alerts/TopOffenders";
import { buildViolationTrends } from "@/lib/violationTrends";

function Delta({ total, prior }) {
  if (!prior && !total) return <span className="text-muted-foreground">No change vs prior 30 days</span>;
  const diff = total - prior;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const cls = diff > 0 ? "text-blocked" : diff < 0 ? "text-allow" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {diff > 0 ? "+" : ""}{diff} vs prior 30 days
    </span>
  );
}

export default function ViolationTrends({ actions, loading }) {
  const t = useMemo(() => buildViolationTrends(actions), [actions]);

  return (
    <Panel
      title="Policy Violation Trends"
      description="Blocked actions, denials, and autonomy downgrades per day over the last 30 days."
      icon={TrendingUp}
    >
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <span><span className="text-2xl font-semibold text-foreground">{t.total}</span> violations</span>
            <Delta total={t.total} prior={t.prior} />
            {t.peak.count > 0 && (
              <span className="text-muted-foreground">Peak: {t.peak.count} on {t.peak.date}</span>
            )}
          </div>
          <ViolationTrendChart data={t.daily} />
          <div className="grid gap-6 md:grid-cols-2">
            <TopOffenders title="Top agents" rows={t.topAgents} />
            <TopOffenders title="Top policies" rows={t.topPolicies} />
          </div>
        </div>
      )}
    </Panel>
  );
}