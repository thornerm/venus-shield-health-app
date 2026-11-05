// base44/functions/enforce/entry.ts
// Runtime enforcement endpoint. Called by agents, the MCP proxy or an SDK
// BEFORE an action runs.
//
//   POST https://<app-domain>/functions/enforce
//   Authorization: Bearer <agent api key>
//   { action_type, target_system, amount_usd, params, environment?, source?, agent_id? }
//
// Direct HTTP calls carry no user context, so the agent authenticates with its
// own key and every record is attributed to `agent:<agent_id>`, never a person.
// The key check is shared with the status lookup (evaluateKeyAuthorization).
//
// Governance workflows run without an agent key. With no bearer header, a
// signed-in ADMIN may enforce on behalf of a named `agent_id`; the record is
// attributed to that admin and sourced as "orchestrator".

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { evaluateGovernance, buildActionRecordPayload, evaluateKeyAuthorization, hashApiKey, rows, now } from "../../shared/engine.ts";

const json = (body, status = 200) => Response.json(body, { status });
const API_VERDICT = { allow: "allow", approval_required: "approval_required", blocked: "block" };
const SOURCES = ["mcp-proxy", "sdk", "runtime"];

/** An "active" passport is approved, not revoked, and not expired. */
function passportActive(agent) {
  if (agent.is_active === false) return false;
  if (String(agent.review_status || "") !== "reviewed") return false;
  if (agent.passport_expires_at && new Date(agent.passport_expires_at) <= new Date()) return false;
  return true;
}

/** Why a passport is not usable at runtime, in the operator's words. */
function passportState(agent) {
  if (agent.is_active === false) return "revoked";
  const review = String(agent.review_status || "").replace("_", " ");
  if (review && review !== "reviewed") return review;
  if (agent.passport_expires_at && new Date(agent.passport_expires_at) <= new Date()) return "expired";
  return review || "not approved";
}

export default async function (req) {
  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body must be JSON" }, 400);

    // 1. Authenticate: agent key, or (no key) a signed-in admin naming the agent.
    const auth = req.headers.get("authorization") || "";
    const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    let key = null;
    let adminUser = null;
    let agentId;

    // A signed-in admin's session token also arrives as a bearer, so only a
    // bearer that matches a stored key hash is treated as an agent key.
    if (rawKey) {
      key = rows(await db.AgentApiKey.filter({ key_hash: await hashApiKey(rawKey) }))[0] || null;
    }

    if (key) {
      const authz = evaluateKeyAuthorization(key);
      if (!authz.authorized) return json({ error: authz.error }, authz.status);
      // A key is bound to exactly one agent.
      if (body.agent_id && body.agent_id !== key.agent_id) {
        return json({ error: `This key belongs to agent ${key.agent_id}, not ${body.agent_id}` }, 403);
      }
      agentId = key.agent_id;
    } else {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== "admin" || !body.agent_id) {
        return json({ error: rawKey ? "Invalid or revoked API key" : "Missing Authorization: Bearer <agent api key>" }, 401);
      }
      adminUser = user;
      agentId = body.agent_id;
    }

    if (!body.action_type || !body.target_system) return json({ error: "action_type and target_system are required" }, 400);

    const agent = rows(await db.ShieldAgent.filter({ agent_id: agentId }))[0];
    if (!agent) return json({ error: `Agent ${agentId} not found` }, 404);

    const requestedBy = adminUser ? `${adminUser.full_name || "Admin"} <${adminUser.email || ""}>`.trim() : `agent:${agentId}`;
    const viaKey = key ? key.key_prefix : null;
    const source = adminUser ? "orchestrator" : (SOURCES.includes(body.source) ? body.source : "runtime");
    const touchKey = async () => { if (key) await db.AgentApiKey.update(key.id, { last_used_at: now() }); };
    const action = {
      action_type: body.action_type,
      target_system: body.target_system,
      amount_usd: Number(body.amount_usd ?? body.amount ?? 0),
      params: body.params ?? body.parameters ?? {},
      environment: body.environment || "prod",
    };

    // 2. Only an active (approved) passport may act at runtime.
    if (!passportActive(agent)) {
      const reason = `Agent passport is ${passportState(agent)}; runtime actions are not permitted until it is active.`;
      const record = await db.ActionRecord.create(buildActionRecordPayload({
        agent, action, source, requestedBy, requestedViaKey: viaKey,
        result: {
          decision: "blocked", status: "blocked", blast: 5, reversibility: "irreversible",
          matchedList: [], decisivePolicy: null, financialLimitMode: agent.financial_limit_mode || "approval_threshold",
          alertOwner: true, downgrade: false, prevAuto: agent.autonomy_level, newAuto: agent.autonomy_level,
          reasons: [`1. [${now()}] PASSPORT: ${reason}`], blockReason: reason, verdictReason: reason,
        },
      }));
      await touchKey();
      return json({ verdict: "block", evaluation_id: record.id, reason, matched_policies: [], blast_radius: 5, reversibility: "irreversible", trace: record.reasons, status_url: "/functions/enforce-status" });
    }

    // 3. Run the SAME engine the console uses.
    const policies = rows(await db.ShieldPolicy.filter({ is_active: true }));
    const result = evaluateGovernance({ agent, policies, action, requester: requestedBy });

    const record = await db.ActionRecord.create(buildActionRecordPayload({
      agent, action, result, source, requestedBy, requestedViaKey: viaKey,
    }));

    await touchKey();
    // A blocked verdict is what raises the owner-facing alert: the alert queue is
    // derived from blocked ActionRecords, so no separate alert row is written.

    return json({
      verdict: API_VERDICT[result.decision],
      evaluation_id: record.id,
      reason: result.verdictReason,
      matched_policies: result.matchedList,
      blast_radius: result.blast,
      reversibility: result.reversibility,
      trace: result.reasons,
      status_url: "/functions/enforce-status",
    }, result.decision === "approval_required" ? 202 : 200);
  } catch (error) {
    return json({ error: error.message || "Enforcement failed." }, 500);
  }
}