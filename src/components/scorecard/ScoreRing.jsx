import { bandFor } from "@/lib/riskScorecard";

export default function ScoreRing({ score, label }) {
  const band = bandFor(score);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-border" />
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-primary" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold text-foreground">{score}</span>
          <span className={`text-[11px] font-medium ${band.className}`}>{band.label}</span>
        </div>
      </div>
      <span className="text-center text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}