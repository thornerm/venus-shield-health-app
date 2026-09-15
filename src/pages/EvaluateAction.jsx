import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VerdictBadge } from "@/components/VerdictBadge";
import { DEMO_SCENARIOS, AUTONOMY_DEFINITIONS } from "@/lib/governance";
import { evaluateAction } from "@/lib/governance";
import { Zap, AlertTriangle, ShieldCheck, ScanSearch, Activity, Mail } from "lucide-react";

const REV_META = { reversible: { label: "Reversible", cls: "text-allow" }, partially_reversible: { label: "Partially Reversible", cls: "text-review" }, irreversible: { label: "Irreversible", cls: "text-blocked" } };

export default function EvaluateAction() {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [actionType, setActionType] = useState("");
  const [targetSystem, setTargetSystem] = useState("");
  const [amount, setAmount] = useState(0);
  const [paramsText, setParamsText] = useState("{}");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.ShieldAgent.filter({ is_active: true }).then((a) => {
      setAgents(a || []);
      if (a?.[0]) setAgentId(a[0].agent_id);
    });
  }, []);

  const applyPreset = (s) => {
    setAgentId(s.agent_id);
    setActionType(s.action_type);
    setTargetSystem(s.target_system);
    setAmount(s.amount_usd);
    setParamsText(JSON.stringify(s.params, null, 2));
    setResult(null);
    setError("");
  };

  const onEvaluate = async () => {
    setError("");
    setResult(null);
    let params = {};
    try { params = JSON.parse(paramsText || "{}"); }
    catch { setError("Params JSON is invalid."); return; }
    if (!agentId || !actionType || !targetSystem) { setError("Agent, action type, and target system are required."); return; }
    setLoading(true);
    try {
      const res = await evaluateAction({ agent_id: agentId, action_type: actionType, target_system: targetSystem, amount_usd: Number(amount) || 0, params });
      if (res.error) { setError(res.error); }
      else { setResult(res); }
    } catch (e) { setError(e?.message || "Evaluation failed."); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Evaluate Action</h1>
        <p className="text-sm text-muted-foreground">Run a proposed agent action through the governance engine. Every verdict is recorded with a full reasoning trace.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" /> Demo Scenarios</CardTitle>
              <CardDescription>One-click presets that exercise each verdict path.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {DEMO_SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => applyPreset(s)} className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ScanSearch className="h-4 w-4 text-primary" /> Action Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent">Agent</Label>
                <select id="agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {agents.map((a) => <option key={a.id} value={a.agent_id}>{a.name} ({a.agent_id})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="action">Action Type</Label>
                  <Input id="action" value={actionType} onChange={(e) => setActionType(e.target.value)} placeholder="issue_refund" />
                </div>
                <div>
                  <Label htmlFor="target">Target System</Label>
                  <Input id="target" value={targetSystem} onChange={(e) => setTargetSystem(e.target.value)} placeholder="billing" />
                </div>
              </div>
              <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="params">Parameters (JSON)</Label>
                <Textarea id="params" value={paramsText} onChange={(e) => setParamsText(e.target.value)} rows={5} className="font-mono text-xs" />
              </div>
              {error && <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked"><AlertTriangle className="h-4 w-4" />{error}</div>}
              <Button onClick={onEvaluate} disabled={loading} className="w-full">
                {loading ? "Evaluating…" : "Evaluate Action"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          {result ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Verdict</CardTitle>
                  <VerdictBadge decision={result.decision} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Metric icon={Activity} label="Blast Radius" value={`${result.blast_radius_score}/5`} />
                  <Metric icon={ShieldCheck} label="Reversibility" value={REV_META[result.reversibility]?.label || result.reversibility} valueCls={REV_META[result.reversibility]?.cls} />
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Matched Policy</div>
                  <div className="mt-1 font-medium">{result.record.policy_matched_name || "No explicit policy — passport rules"}</div>
                  {result.record.policy_matched_priority != null && <div className="text-xs text-muted-foreground">Priority {result.record.policy_matched_priority}</div>}
                </div>
                {result.record.autonomy_downgraded && (
                  <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">
                    <AlertTriangle className="h-4 w-4" />
                    Autonomy ratcheted: <span className="font-medium capitalize">{result.record.previous_autonomy_level}</span> → <span className="font-medium capitalize">{result.record.new_autonomy_level}</span>
                  </div>
                )}
                {result.record.alert_owner && (
                  <div className="flex items-center gap-2 rounded-md bg-review/10 px-3 py-2 text-sm text-review">
                    <AlertTriangle className="h-4 w-4" /> Agent owner alerted.
                  </div>
                )}
                {result.notification?.sent && (
                  <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                    <Mail className="h-4 w-4" /> Security team notified by email.
                  </div>
                )}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ScanSearch className="h-4 w-4 text-primary" /> Reasoning Trace</div>
                  <ol className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
                    {result.record.reasons.map((r, i) => (
                      <li key={i} className="font-mono text-xs leading-relaxed text-muted-foreground">{r}</li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <ScanSearch className="mb-2 h-8 w-8 opacity-40" />
              Run an evaluation to see the verdict, blast radius, and full reasoning trace here.
            </CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, valueCls = "text-foreground" }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className={`mt-1 font-heading text-lg font-semibold ${valueCls}`}>{value}</div>
    </div>
  );
}