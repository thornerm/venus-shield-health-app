import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/VerdictBadge";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import { MATCH_LABELS, categoryMeta, policyCategory } from "@/lib/policies";
import { fmtDate } from "@/lib/metrics";
import { ArrowLeft, Scale, ShieldCheck, FileSearch } from "lucide-react";

function fmtValue(k, v) {
  if (k === "exfiltration") return v ? "Yes — match any bulk data exfiltration" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (k === "min_amount") return "$" + Number(v).toLocaleString();
  return String(v);
}

function Fact({ label, children, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="vs-eyebrow">{label}</div>
      <div className="mt-2">{children}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function PolicyDetails() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [decisions, setDecisions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    base44.entities.ShieldPolicy.get(id)
      .then(async (p) => {
        setPolicy(p);
        const n = await base44.entities.ActionRecord.count({ policy_matched_name: p.name });
        setDecisions(n ?? 0);
      })
      .catch((e) => setError(e?.message || "Policy not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading policy…</div>;
  if (error || !policy) {
    return (
      <div className="space-y-4">
        <Link to="/policy-manager"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies</Button></Link>
        <div className="py-16 text-center text-sm text-muted-foreground">{error || "Policy not found."}</div>
      </div>
    );
  }

  const match = policy.match || {};
  const meta = categoryMeta(policyCategory(policy));

  return (
    <div className="space-y-6">
      <PageHeader
        title={policy.name}
        subtitle={policy.description || "No description recorded for this policy."}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/policy-manager"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Category" hint={meta.description}>
          <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
            {meta.label}
          </span>
        </Fact>
        <Fact label="Enforcement" hint="What the engine does on a match">
          <VerdictBadge decision={policy.required_decision} />
        </Fact>
        <Fact label="Priority" hint="Higher is evaluated first">
          <div className="font-heading text-2xl font-bold tabular-nums text-foreground">{policy.priority}</div>
        </Fact>
        <Fact label="Decisive Verdicts" hint="Actions this policy decided">
          <div className="font-heading text-2xl font-bold tabular-nums text-foreground">{decisions ?? "—"}</div>
        </Fact>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Match Criteria"
          description="When a proposed action meets all of these conditions, this policy applies."
          icon={Scale}
          className="lg:col-span-2"
        >
          {Object.keys(match).length === 0 ? (
            <div className="text-sm text-muted-foreground">No structured match criteria configured for this policy.</div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(match).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="text-sm font-medium text-foreground">{MATCH_LABELS[k] || k}</div>
                  <div className="text-right text-sm text-muted-foreground">{fmtValue(k, v)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Policy Record" icon={FileSearch}>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 pb-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
              {policy.is_active
                ? <span className="inline-flex items-center rounded-full border border-allow/30 bg-allow/10 px-2.5 py-0.5 text-xs font-medium text-allow">Active</span>
                : <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Inactive</span>}
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Created</span>
              <span className="text-xs text-muted-foreground">{fmtDate(policy.created_date)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Last Modified</span>
              <span className="text-xs text-muted-foreground">{fmtDate(policy.updated_date || policy.created_date)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Decision Logic" icon={ShieldCheck}>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>When an evaluated action matches the criteria above, the governance engine assigns a required decision of <VerdictBadge decision={policy.required_decision} />.</p>
          <p>Policies are evaluated in priority order (highest first). The first matching policy's required decision wins — unless a passport-level violation (prohibited action, unauthorized system, or exfiltration) escalates the verdict to <span className="font-medium text-blocked">Blocked</span>.</p>
        </div>
      </Panel>
    </div>
  );
}