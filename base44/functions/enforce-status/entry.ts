// base44/functions/enforce-status/entry.ts
// Polled by the MCP proxy / SDK while an action is held for human approval.
//
//   POST https://<app-domain>/functions/enforce-status
//   Authorization: Bearer <agent api key>
//   { evaluation_id }
//
// The key is checked here exactly as it is at runtime enforcement — an expired,
// revoked or malformed-expiry key is refused with 401 before any record is read.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { evaluateKeyAuthorization, hashApiKey, rows } from "../../shared/engine.ts";

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

    const key = rows(await db.AgentApiKey.filter({ key_hash: await hashApiKey(rawKey) }))[0];
    const authz = evaluateKeyAuthorization(key);
    if (!authz.authorized) return json({ error: authz.error }, authz.status);

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