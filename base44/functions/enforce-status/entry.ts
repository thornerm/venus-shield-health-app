// base44/functions/enforce-status/entry.ts
// Polled by the MCP proxy / SDK while an action is held for human approval.
//
//   POST https://<app-domain>/functions/enforce-status
//   Authorization: Bearer <agent api key>
//   { evaluation_id }
//
// Returns { status: "pending"|"approved"|"denied"|"blocked"|"executed", decided_by, decided_at, reason }

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const encoder = new TextEncoder();
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const json = (body, status = 200) => Response.json(body, { status });

const STATUS = {
  pending_approval: "pending",
  approved: "approved",
  denied: "denied",
  blocked: "blocked",
  executed: "executed",
};

export default async function (req) {
  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const auth = req.headers.get("authorization") || "";
    const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!rawKey) return json({ error: "Missing Authorization header" }, 401);

    const keys = await db.AgentApiKey.filter({ key_hash: await sha256(rawKey), status: "active" });
    const key = (Array.isArray(keys) ? keys : keys?.items || [])[0];
    if (!key) return json({ error: "Invalid or revoked API key" }, 401);

    const body = await req.json().catch(() => ({}));
    if (!body.evaluation_id) return json({ error: "evaluation_id required" }, 400);

    const evaluation = await db.ActionRecord.get(body.evaluation_id).catch(() => null);
    if (!evaluation) return json({ error: "Evaluation not found" }, 404);
    // An agent may only read the status of its own evaluations.
    if (evaluation.agent_id !== key.agent_id) return json({ error: "Forbidden" }, 403);

    const history = evaluation.decision_history || [];
    const lastDecision = history.length ? history[history.length - 1] : null;

    return json({
      status: STATUS[evaluation.status] || evaluation.status,
      decided_by: evaluation.decided_by || null,
      decided_at: evaluation.decided_date || lastDecision?.timestamp || null,
      reason: lastDecision?.reason || null,
      evaluation_id: evaluation.id,
    });
  } catch (error) {
    return json({ error: error.message || "Status lookup failed." }, 500);
  }
}