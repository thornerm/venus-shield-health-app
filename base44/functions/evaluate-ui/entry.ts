// base44/functions/evaluate-ui/entry.ts
// The verdict path for everything a human drives: the Evaluate Action sandbox
// and the AIRTP governed session. Both call this instead of running their own
// copy of the engine, so console and runtime can never disagree.
//
//   POST /functions/evaluate-ui   (signed-in app user, via the SDK)
//   { agent_id, action_type, target_system, amount_usd, params, source }
//
// Attribution is the signed-in user, resolved server-side.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { evaluateGovernance, buildActionRecordPayload, rows } from "../../shared/engine.ts";

// Only paths that legitimately originate in this app may label a record.
const SOURCES = ["ui", "airtp"];

export default async function (req) {
  try {
    if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agent_id, action_type, target_system } = body;
    const amount_usd = Number(body.amount_usd || 0);
    const params = body.params || {};
    const source = SOURCES.includes(body.source) ? body.source : "ui";

    if (!agent_id || !action_type || !target_system) {
      return Response.json({ error: "agent_id, action_type and target_system are required." }, { status: 400 });
    }

    const agent = rows(await base44.entities.ShieldAgent.filter({ agent_id }))[0];
    if (!agent) {
      return Response.json({ error: `No governed agent found with id "${agent_id}". Register and approve the agent first.` });
    }

    const policies = rows(await base44.entities.ShieldPolicy.filter({ is_active: true }));
    const requester = `${user.full_name || "Unknown user"} <${user.email || ""}>`.trim();
    const action = { action_type, target_system, amount_usd, params, environment: body.environment || "prod" };

    const result = evaluateGovernance({ agent, policies, action, requester });

    const record = await base44.entities.ActionRecord.create(buildActionRecordPayload({
      agent, action, result, source, requestedBy: requester,
    }));

    // Autonomy ratchet — same behaviour as before: best effort, never fatal.
    if (result.downgrade) {
      try { await base44.entities.ShieldAgent.update(agent.id, { autonomy_level: "restricted" }); } catch (e) { /* ratchet is recorded on the action record regardless */ }
    }

    return Response.json({
      record,
      decision: result.decision,
      source,
      agent: { ...agent, autonomy_level: result.downgrade ? "restricted" : agent.autonomy_level },
      blast_radius_score: result.decision === "blocked" ? 5 : result.blast,
      reversibility: result.decision === "blocked" ? "irreversible" : result.reversibility,
      policyMatches: result.matchedList,
      decisivePolicy: result.decisivePolicy,
      financialLimitMode: result.financialLimitMode,
      reason: result.verdictReason,
    });
  } catch (error) {
    return Response.json({ error: error.message || "Evaluation failed." }, { status: 500 });
  }
}