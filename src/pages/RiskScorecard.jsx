import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import ScoreRing from "@/components/scorecard/ScoreRing";
import ControlsMatrix from "@/components/scorecard/ControlsMatrix";
import MaturityAssessment from "@/components/scorecard/MaturityAssessment";
import MethodologyPanel from "@/components/scorecard/MethodologyPanel";
import {
  AUDIENCES, DEFAULT_MATURITY, controlsScore, maturityScore, overallScore,
} from "@/lib/riskScorecard";
import { cn } from "@/lib/utils";

const LENSES = [{ id: "all", label: "All" }, ...Object.entries(AUDIENCES).map(([id, label]) => ({ id, label }))];

export default function RiskScorecard() {
  const [maturity, setMaturity] = useState(DEFAULT_MATURITY);
  const [lens, setLens] = useState("all");

  const controls = controlsScore();
  const team = maturityScore(maturity);
  const overall = overallScore(controls, team);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Risk Scorecard"
        subtitle="A reproducible view of agent architecture controls and dev team maturity, built for CISOs, General Counsel and Chief Compliance Officers."
      />

      <Panel>
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-3">
          <ScoreRing score={overall} label="Overall AI risk readiness" />
          <ScoreRing score={controls} label="Architecture controls (60%)" />
          <ScoreRing score={team} label="Dev team maturity (40%)" />
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {LENSES.map((l) => (
          <button
            key={l.id}
            onClick={() => setLens(l.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              lens === l.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <ControlsMatrix audience={lens} />
      <MaturityAssessment values={maturity} onChange={(id, v) => setMaturity((m) => ({ ...m, [id]: v }))} />
      <MethodologyPanel />
    </div>
  );
}