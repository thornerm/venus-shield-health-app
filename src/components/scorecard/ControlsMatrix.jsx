import { DOMAINS, STATUS, AUDIENCES, domainScore } from "@/lib/riskScorecard";
import Panel from "@/components/Panel";

function StatusChip({ status }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

export default function ControlsMatrix({ audience }) {
  return (
    <div className="space-y-4">
      {DOMAINS.map((domain) => {
        const controls = domain.controls.filter((c) => audience === "all" || c.audience.includes(audience));
        if (controls.length === 0) return null;
        return (
          <Panel
            key={domain.id}
            title={domain.name}
            description={`Weight ${domain.weight}% of controls score`}
            action={<span className="font-heading text-lg font-semibold text-primary">{domainScore(domain)}</span>}
          >
            <ul className="divide-y divide-border">
              {controls.map((c) => (
                <li key={c.name} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                      Evidence for: {c.frameworks.join(" · ")} · Owner lens: {c.audience.map((a) => AUDIENCES[a]).join(", ")}
                    </p>
                  </div>
                  <StatusChip status={c.status} />
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}