// Enforcement step of the Job Execution Governance workflow.
// A job that failed its governance evaluation is stopped: the JobExecution is
// marked failed with the reason in its trace, and every admin is alerted.
// (The agent-key `enforce` endpoint authenticates agents, not workflows, so the
// workflow enforces through this admin-only function instead.)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { rows, now } from "../../shared/engine.ts";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    if (!b.job_id) return Response.json({ error: "job_id is required" }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const job = await db.JobExecution.get(b.job_id);
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    const verdict = b.decision || "no verdict";
    const reason = b.reason || b.error || "The job did not pass governance evaluation.";
    const message = `Stopped by governance (${verdict}): ${reason}`;

    // 1. Enforce: stop the job and record why.
    await db.JobExecution.update(job.id, {
      status: "failed",
      error_message: message,
      completed_at: now(),
      execution_trace: [
        ...(job.execution_trace || []),
        { step: "governance_enforcement", status: "failed", detail: message, timestamp: now() },
      ],
    });

    // 2. Alert every admin.
    const admins = rows(await db.User.filter({ role: "admin" }));
    const html = `<div style="font-family:Inter,Arial,sans-serif;background:#070e17;color:#f9fafb;padding:24px">
      <h2 style="color:#d4af35;margin:0 0 12px">Job blocked by Venus Shield</h2>
      <p>A job failed governance evaluation and was stopped.</p>
      <ul>
        <li><b>Job:</b> ${esc(job.job_prompt_name)} (${esc(job.task_uid)})</li>
        <li><b>Customer:</b> ${esc(job.customer_name)}</li>
        <li><b>Requested by:</b> ${esc(job.task_owner)}</li>
        <li><b>Agent type:</b> ${esc(job.agent_type)}</li>
        <li><b>Verdict:</b> ${esc(verdict)}</li>
        <li><b>Reason:</b> ${esc(reason)}</li>
      </ul>
      <p><a href="https://venus-orbit-guard.base44.app/orchestration/history" style="color:#d4af35">Review in Executions</a></p></div>`;
    let alerted = 0;
    for (const a of admins) {
      if (!a.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: a.email,
        subject: `Venus Shield: job blocked - ${job.job_prompt_name || job.task_uid}`,
        body: html,
        category: "transactional",
      }).then(() => { alerted += 1; }).catch(() => {});
    }

    return Response.json({ enforced: true, job_status: "failed", admins_alerted: alerted });
  } catch (error) {
    return Response.json({ error: error.message || "Enforcement failed." }, { status: 500 });
  }
}