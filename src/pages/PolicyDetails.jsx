import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ArrowLeft, Scale } from "lucide-react";

const MATCH_LABELS = {
  action_types: "Action Types",
  target_systems: "Target Systems",
  min_amount: "Minimum Amount (USD)",
  exfiltration: "Exfiltration Pattern",
};

function fmtValue(k, v) {
  if (k === "exfiltration") return v ? "Yes — match any bulk data exfiltration" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (k === "min_amount") return "$" + Number(v).toLocaleString();
  return String(v);
}

export default function PolicyDetails() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    base44.entities.ShieldPolicy.get(id)
      .then((p) => setPolicy(p))
      .catch((e) => setError(e?.message || "Policy not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading policy…</div>;
  if (error || !policy) return (
    <div className="space-y-4">
      <Link to="/policy-manager"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies</Button></Link>
      <div className="py-16 text-center text-sm text-muted-foreground">{error || "Policy not found."}</div>
    </div>
  );

  const match = policy.match || {};

  return (
    <div className="space-y-6">
      <Link to="/policy-manager"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies</Button></Link>

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{policy.name}</h1>
        <p className="text-sm text-muted-foreground">{policy.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Required Decision</div>
          <div className="mt-2"><VerdictBadge decision={policy.required_decision} /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Priority</div>
          <div className="mt-2 font-heading text-2xl font-bold">{policy.priority}</div>
          <div className="text-xs text-muted-foreground">higher = evaluated first</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="mt-2">
            {policy.is_active
              ? <span className="inline-flex rounded-full bg-allow/10 px-2.5 py-0.5 text-xs font-medium text-allow">Active</span>
              : <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Inactive</span>}
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-primary" /> Match Criteria</CardTitle>
          <CardDescription>When a proposed action meets all of these conditions, this policy applies.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(match).length === 0 ? (
            <div className="text-sm text-muted-foreground">No structured match criteria configured for this policy.</div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(match).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-3">
                  <div className="text-sm font-medium">{MATCH_LABELS[k] || k}</div>
                  <div className="text-right text-sm text-muted-foreground">{fmtValue(k, v)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Decision Logic</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>When an evaluated action matches the criteria above, the governance engine assigns a required decision of <VerdictBadge decision={policy.required_decision} />.</p>
          <p>Policies are evaluated in priority order (highest first). The first matching policy's required decision wins — unless a passport-level violation (prohibited action, unauthorized system, or exfiltration) escalates the verdict to <span className="font-medium text-blocked">Blocked</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}