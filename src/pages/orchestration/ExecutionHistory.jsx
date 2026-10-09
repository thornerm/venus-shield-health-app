import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, History, ChevronDown, ChevronUp } from "lucide-react";
import ExecStatusBadge from "@/components/orchestration/ExecStatusBadge";
import ExecutionTrace from "@/components/orchestration/ExecutionTrace";

export default function ExecutionHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.JobExecution.list("-created_date", 100);
      setRows(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Execution History</h1>
          <p className="text-sm text-muted-foreground">
            Every job run through the orchestrator, with its full trace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading executions...</p>
      ) : error ? (
        <Card><CardContent className="py-12 text-center text-sm text-blocked">{error}</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="mx-auto mb-2 h-8 w-8 opacity-50" /> No executions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const open = expanded === r.id;
            return (
              <Card key={r.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => setExpanded(open ? null : r.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {r.job_prompt_name || "Job"}
                      </span>
                      <ExecStatusBadge status={r.status} />
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {r.task_uid} · {r.customer_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {r.started_at ? new Date(r.started_at).toLocaleString() : ""}
                    </span>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {open && (
                  <CardContent className="grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">Execution trace</p>
                      <ExecutionTrace trace={r.execution_trace} />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">AI response</p>
                      {r.ai_response ? (
                        <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs">
                          {r.ai_response}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">{r.error_message || "No response."}</p>
                      )}
                      {(r.secrets_used || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.secrets_used.map((s) => (
                            <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}