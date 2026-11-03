import Panel from "@/components/Panel";
import { WEIGHTS, STATUS } from "@/lib/riskScorecard";

export default function MethodologyPanel() {
  return (
    <Panel title="Methodology" description="How the scorecard is calculated, so any executive can reproduce it.">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="text-foreground">Architecture controls</span> are grouped into five weighted domains. Each control is
          scored {Object.values(STATUS).map((s) => `${s.label} = ${s.score}`).join(", ")}. A domain score is the average of its controls.
        </li>
        <li>
          <span className="text-foreground">Dev team maturity</span> is a six-dimension self-assessment on a 1 to 5 scale,
          normalized to 0 to 100.
        </li>
        <li>
          <span className="text-foreground">Overall readiness</span> = {WEIGHTS.controls}% controls + {WEIGHTS.maturity}% maturity.
          Bands: Strong 85+, Managed 65+, Developing 40+, Exposed below 40.
        </li>
        <li>
          <span className="text-foreground">Framework references</span> show which controls produce evidence relevant to a framework.
          They are not a certification or legal opinion; confirm applicability with counsel and auditors.
        </li>
        <li>
          <span className="text-foreground">Gaps are shown deliberately.</span> Control status reflects the current prototype, and
          open gaps are the remediation roadmap.
        </li>
      </ol>
    </Panel>
  );
}