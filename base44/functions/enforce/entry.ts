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

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { evaluateGovernance, buildActionRecordPayload, rows, now } from "../../shared/engine.ts";

const encoder = new TextEncoder();
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // 1. Authenticate the agent key.
    const auth = req.headers.get("authorization") || "";
    const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!rawKey) return json({ error: "Missing Authorization: Bearer <agent api key>" }, 401);

    const key = rows(await db.AgentApiKey.filter({ key_hash: await sha256(rawKey), status: "active" }))[0];
    if (!key) return json({ error: "Invalid or revoked API key" }, 401);
    if (key.expires_at && new Date(key.expires_at) <= new Date()) return json({ error: "API key expired" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body must be JSON" }, 400);

    // A key is bound to exactly one agent.
    if (body.agent_id && body.agent_id !== key.agent_id) {
      return json({ error: `This key belongs to agent ${key.agent_id}, not ${body.agent_id}` }, 403);
    }
    if (!body.action_type || !body.target_system) return json({ error: "action_type and target_system are required" }, 400);

    const agentId = key.agent_id;
    const agent = rows(await db.ShieldAgent.filter({ agent_id: agentId }))[0];
    if (!agent) return json({ error: `Agent ${agentId} not found` }, 404);

    const source = SOURCES.includes(body.source) ? body.source : "runtime";
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
        agent, action, source, requestedBy: `agent:${agentId}`, requestedViaKey: key.key_prefix,
        result: {
          decision: "blocked", status: "blocked", blast: 5, reversibility: "irreversible",
          matchedList: [], decisivePolicy: null, financialLimitMode: agent.financial_limit_mode || "approval_threshold",
          alertOwner: true, downgrade: false, prevAuto: agent.autonomy_level, newAuto: agent.autonomy_level,
          reasons: [`1. [${now()}] PASSPORT: ${reason}`], blockReason: reason, verdictReason: reason,
        },
      }));
      await db.AgentApiKey.update(key.id, { last_used_at: now() });
      return json({ verdict: "block", evaluation_id: record.id, reason, matched_policies: [], blast_radius: 5, reversibility: "irreversible", trace: record.reasons, status_url: "/functions/enforce-status" });
    }

    // 3. Run the SAME engine the console uses.
    const policies = rows(await db.ShieldPolicy.filter({ is_active: true }));
    const result = evaluateGovernance({ agent, policies, action, requester: `agent:${agentId}` });

    const record = await db.ActionRecord.create(buildActionRecordPayload({
      agent, action, result, source, requestedBy: `agent:${agentId}`, requestedViaKey: key.key_prefix,
    }));

    await db.AgentApiKey.update(key.id, { last_used_at: now() });
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