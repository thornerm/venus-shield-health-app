import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Lock, Cpu, Workflow, AlertTriangle } from "lucide-react";
import SourceBadge from "@/components/orchestration/SourceBadge";
import ExecStatusBadge from "@/components/orchestration/ExecStatusBadge";
import ExecutionTrace from "@/components/orchestration/ExecutionTrace";
import {
  generateTaskUid,
  buildTraceStep,
  buildInitialTrace,
  buildFullPrompt,
} from "@/lib/orchestration";
import { getCurrentActor } from "@/lib/identity";

export default function JobRunner() {
  const { id } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [customerConfig, setCustomerConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const [p, actor] = await Promise.all([
        base44.entities.JobPrompt.get(id),
        getCurrentActor(),
      ]);
      setPrompt(p);
      const configs = await base44.entities.CustomerConfig.filter(
        { owner_email: actor.email },
        "-created_date",
        1
      );
      setCustomerConfig(configs[0] || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runJob() {
    setExecuting(true);
    setError(null);
    setExecution(null);
    const actor = await getCurrentActor();
    const taskUid = generateTaskUid();
    const startedAt = new Date().toISOString();

    let exec;
    try {
      exec = await base44.entities.JobExecution.create({
        task_uid: taskUid,
        customer_id: customerConfig?.id || "",
        customer_name: customerConfig?.customer_name || "default tenant",
        job_prompt_id: prompt.id,
        job_prompt_name: prompt.name,
        task_owner: actor.email,
        agent_type: prompt.agent_type || "",
        task_instructions: prompt.instructions || [],
        prompt_snapshot: prompt.prompt_content,
        secrets_used: prompt.required_secrets || [],
        status: "running",
        started_at: startedAt,
        execution_trace: buildInitialTrace(prompt, customerConfig),
      });
      setExecution(exec);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: buildFullPrompt(prompt),
      });

      const completed = await base44.entities.JobExecution.update(exec.id, {
        status: "completed",
        ai_response:
          typeof response === "string" ? response : JSON.stringify(response, null, 2),
        completed_at: new Date().toISOString(),
        execution_trace: [
          ...exec.execution_trace,
          buildTraceStep("ai_processing", "completed", "AI agent processed the prompt"),
          buildTraceStep("complete", "completed", "Job execution complete"),
        ],
      });
      setExecution(completed);
    } catch (e) {
      setError(e.message);
      if (exec) {
        const failed = await base44.entities.JobExecution.update(exec.id, {
          status: "failed",
          error_message: e.message,
          completed_at: new Date().toISOString(),
        });
        setExecution(failed);
      }
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading job...</p>;
  }
  if (!prompt) {
    return <p className="py-12 text-center text-sm text-blocked">{error || "Job not found."}</p>;
  }

  const secrets = prompt.required_secrets || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/orchestration"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">{prompt.name}</h1>
            <SourceBadge source={prompt.source} />
          </div>
          <p className="text-sm text-muted-foreground">{prompt.description || "No description."}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Prompt</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs">
              {prompt.prompt_content}
            </pre>
            {prompt.instructions?.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">Task instructions</p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  {prompt.instructions.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Job details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prompt.agent_type && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="h-4 w-4" /> {prompt.agent_type}
              </div>
            )}
            {prompt.orchestrator_workflow && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Workflow className="h-4 w-4" />
                <span className="truncate font-mono text-xs">{prompt.orchestrator_workflow}</span>
              </div>
            )}
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <Lock className="h-3.5 w-3.5" /> Required secrets
              </p>
              {secrets.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {secrets.map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None</p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
              {customerConfig ? (
                <>
                  <p className="font-medium">{customerConfig.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{customerConfig.ai_agent_endpoint}</p>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-review">
                  <AlertTriangle className="h-3.5 w-3.5" /> No customer config —{" "}
                  <Link to="/orchestration/setup" className="underline">set one up</Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runJob} disabled={executing}>
          <Play className="h-4 w-4" /> {executing ? "Running..." : "Run Job"}
        </Button>
        {execution && <ExecStatusBadge status={execution.status} />}
        {execution && <span className="font-mono text-xs text-muted-foreground">{execution.task_uid}</span>}
      </div>

      {error && prompt && (
        <p className="flex items-center gap-1.5 text-sm text-blocked">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      {execution && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Execution trace</CardTitle></CardHeader>
            <CardContent><ExecutionTrace trace={execution.execution_trace} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">AI response</CardTitle></CardHeader>
            <CardContent>
              {execution.ai_response ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {execution.ai_response}
                </pre>
              ) : execution.status === "running" ? (
                <p className="text-sm text-muted-foreground">Waiting for the AI agent...</p>
              ) : (
                <p className="text-sm text-muted-foreground">No response.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}