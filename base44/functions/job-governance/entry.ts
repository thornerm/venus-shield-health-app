// base44/functions/job-governance/entry.ts
// Helper steps for the "Job Execution Governance" workflow. Admin-only.
//
//   { action: "context", execution_id }  -> resolves the governing passport,
//        the evaluation params and the admin to alert.
//   { action: "fail", execution_id, reason, decision } -> marks the run failed.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { rows, now } from "../../shared/engine.ts";

const json = (body, status = 200) => Response.json(body, { status });

// Same resolution the Job Runner uses: a job's agent_type must name a passport.
function resolvePassport(agentType, agents) {
  const type = String(agentType || "").trim().toLowerCase();
  if (!type) return null;
  const base = type.replace(/-agent$/, "");
  const pool = agents.filter((a) => a.is_active !== false);
  const hay = (a) => `${a.name || ""} ${a.agent_id || ""}`.toLowerCase();
  return (
    pool.find((a) => String(a.agent_id || "").toLowerCase() === type) ||
    pool.find((a) => hay(a).includes(type)) ||
    pool.find((a) => base.length >= 3 && hay(a).includes(base)) ||
    null
  );
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (user.role !== "admin") return json({ error: "Forbidden" }, 403);

    const { action, execution_id, reason, decision } = await req.json().catch(() => ({}));
    if (!execution_id) return json({ error: "execution_id is required" }, 400);
    const db = base44.asServiceRole.entities;
    const exec = await db.JobExecution.get(execution_id);
    if (!exec) return json({ error: "JobExecution not found" }, 404);

    if (action === "context") {
      const agents = rows(await db.ShieldAgent.list());
      const agent = resolvePassport(exec.agent_type, agents);
      const admin = rows(await db.User.filter({ role: "admin" }))[0];
      return json({
        agent_id: agent?.agent_id || null,
        job_name: exec.job_prompt_name || "Unnamed job",
        task_uid: exec.task_uid,
        admin_email: admin?.email || null,
        params: {
          task_uid: exec.task_uid,
          job_prompt_id: exec.job_prompt_id,
          job_prompt_name: exec.job_prompt_name,
          agent_type: exec.agent_type || "",
          customer: exec.customer_name || "default tenant",
        },
      });
    }

    if (action === "fail") {
      const message = `Blocked by governance: ${reason || "evaluation did not pass."}`;
      const trace = [...(exec.execution_trace || []), { step: "governance_workflow", status: "failed", detail: message, timestamp: now() }];
      await db.JobExecution.update(execution_id, {
        status: "failed",
        error_message: message,
        completed_at: now(),
        execution_trace: trace,
      });
      return json({ updated: true, decision: decision || "blocked", message });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error.message || "Job governance step failed." }, 500);
  }
}