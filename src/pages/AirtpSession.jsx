import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evaluateAction, APPROVER_DISPLAY } from "@/lib/governance";
import {
  AIRTPRuntime,
  InvokeLLMAdapter,
  CallbackWriter,
  ChunkManager,
  EnvelopeFactory,
  RuntimeState,
} from "@/lib/airtp";
import ProtocolState from "@/components/airtp/ProtocolState";
import ArtifactStream from "@/components/airtp/ArtifactStream";
import GovernanceVerdictCard from "@/components/airtp/GovernanceVerdictCard";
import { Radio, Play, AlertTriangle, ShieldCheck, Lock } from "lucide-react";

export default function AirtpSession() {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [actionType, setActionType] = useState("generate_report");
  const [targetSystem, setTargetSystem] = useState("internal_kb");
  const [amount, setAmount] = useState(0);
  const [paramsText, setParamsText] = useState('{"scope":"quarterly_summary"}');
  const [prompt, setPrompt] = useState(
    "Write a concise quarterly governance summary: list the three most important risk signals for governed AI agents and one mitigation each."
  );

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const [runtimeState, setRuntimeState] = useState(null);
  const [continuations, setContinuations] = useState(0);
  const [eventLog, setEventLog] = useState([]);
  const [artifact, setArtifact] = useState("");
  const [chunks, setChunks] = useState([]);
  const [envelope, setEnvelope] = useState(null);

  useEffect(() => {
    base44.entities.ShieldAgent.filter({ is_active: true }).then((a) => {
      setAgents(a || []);
      if (a?.[0]) setAgentId(a[0].agent_id);
    });
  }, []);

  const resetProtocol = () => {
    setRuntimeState(null);
    setContinuations(0);
    setEventLog([]);
    setArtifact("");
    setChunks([]);
    setEnvelope(null);
  };

  const onExecute = async () => {
    setError("");
    setResult(null);
    resetProtocol();

    let params = {};
    try {
      params = JSON.parse(paramsText || "{}");
    } catch {
      setError("Parameters JSON is invalid.");
      return;
    }
    if (!agentId || !actionType || !targetSystem) {
      setError("Agent, action type, and target system are required.");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt (artifact request) is required.");
      return;
    }

    setRunning(true);
    try {
      // 1) Governance: evaluate the proposed agent action against its passport.
      const res = await evaluateAction({
        agent_id: agentId,
        action_type: actionType,
        target_system: targetSystem,
        amount_usd: Number(amount) || 0,
        params,
        requested_by: APPROVER_DISPLAY,
      });
      setResult(res);
      if (res.error) {
        setError(res.error);
        setRunning(false);
        return;
      }

      // 2) Only an ALLOWED, EXECUTED action may proceed to the AIRTP runtime.
      if (res.decision !== "allow") {
        setRunning(false);
        return;
      }

      // 3) AIRTP transport — capability negotiation + runtime execution.
      const adapter = new InvokeLLMAdapter();
      await adapter.initialize_contract();

      const splitChunks = new ChunkManager().split(prompt);
      setChunks(splitChunks);
      setEnvelope(new EnvelopeFactory().create("MODEL_REQUEST", { content: prompt }));

      const writer = new CallbackWriter((t) => setArtifact((p) => p + t));
      const runtime = new AIRTPRuntime({
        adapter,
        writer,
        onEvent: (ev) => setEventLog((p) => [...p, ev]),
        onState: (s) => setRuntimeState(s),
        onContinuations: (c) => setContinuations(c),
      });
      setRuntimeState(runtime.state);

      try {
        await runtime.execute(prompt);
      } catch (e) {
        setError(e?.message || "AIRTP runtime error.");
      }
      setRuntimeState(runtime.state);
    } catch (e) {
      setError(e?.message || "Execution failed.");
    }
    setRunning(false);
  };

  const allowed = result?.decision === "allow";
  const halted = result && !allowed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
          <Radio className="h-6 w-6 text-primary" /> AIRTP Session
        </h1>
        <p className="text-sm text-muted-foreground">
          Run a governed agent request through the AIRTP transport. Each request is evaluated against the agent's
          passport first — the runtime only executes on an Allow verdict.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Governed Action
              </CardTitle>
              <CardDescription>The agent action the AIRTP session will perform on the provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent">Agent</Label>
                <select
                  id="agent"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.agent_id}>{a.name} ({a.agent_id})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="action">Action Type</Label>
                  <Input id="action" value={actionType} onChange={(e) => setActionType(e.target.value)} placeholder="generate_report" />
                </div>
                <div>
                  <Label htmlFor="target">Target System</Label>
                  <Input id="target" value={targetSystem} onChange={(e) => setTargetSystem(e.target.value)} placeholder="internal_kb" />
                </div>
              </div>
              <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="params">Parameters (JSON)</Label>
                <Textarea id="params" value={paramsText} onChange={(e) => setParamsText(e.target.value)} rows={3} className="font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="prompt">Artifact Request (AIRTP payload)</Label>
                <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">
                  <AlertTriangle className="h-4 w-4" />{error}
                </div>
              )}
              <Button onClick={onExecute} disabled={running} className="w-full">
                {running ? (
                  <>Transporting…</>
                ) : (
                  <><Play className="h-4 w-4" /> Execute Governed Session</>
                )}
              </Button>
            </CardContent>
          </Card>

          <GovernanceVerdictCard result={result} />

          {halted && (
            <div className="flex items-center gap-2 rounded-md border border-blocked/40 bg-blocked/10 px-3 py-2 text-sm text-blocked">
              <Lock className="h-4 w-4" /> AIRTP runtime halted — governance verdict prevented transport.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ProtocolState
            state={runtimeState}
            continuations={continuations}
            chunks={chunks}
            envelope={envelope}
            eventLog={eventLog}
            running={running && allowed}
          />
          <ArtifactStream artifact={artifact} running={running && allowed} decision={result?.decision} />
        </div>
      </div>
    </div>
  );
}