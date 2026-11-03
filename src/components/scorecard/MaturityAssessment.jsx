import { MATURITY_DIMENSIONS, MATURITY_LEVELS } from "@/lib/riskScorecard";
import Panel from "@/components/Panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MaturityAssessment({ values, onChange }) {
  return (
    <Panel
      title="Dev team maturity self-assessment"
      description="Rate each dimension honestly. Scores update the overall readiness instantly and are not stored."
    >
      <ul className="divide-y divide-border">
        {MATURITY_DIMENSIONS.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{d.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{d.question}</p>
            </div>
            <Select value={String(values[d.id])} onValueChange={(v) => onChange(d.id, Number(v))}>
              <SelectTrigger className="w-full shrink-0 sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATURITY_LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </Panel>
  );
}