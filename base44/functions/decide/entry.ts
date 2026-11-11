// base44/functions/decide/entry.ts
// Server-side approve/deny for agent passport requests and pending actions.
// Re-checks admin role and separation of duties (requester / agent owner may
// not decide their own request) so the rule cannot be bypassed from the browser.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const json = (body, status = 200) => Response.json(body, { status });
const now = () => new Date().toISOString();
const rows = (r) => (Array.isArray(r) ? r : r?.items || []);

function selfApprovalError(user, decidedBy, requester, ownerEmail) {
  const email = String(user.email || "").toLowerCase();
  if (requester) {
    const r = String(requester).toLowerCase();
    if (requester === decidedBy || (email && (r === email || r.includes(`<${email}>`)))) {
      return "Self-approval is not permitted: you requested this action, so you cannot approve it.";
    }
  }
  if (ownerEmail && email && email === String(ownerEmail).toLowerCase()) {
    return "Self-approval is not permitted: you are the owner of this agent, so you cannot approve its request.";
  }
  return null;
}

export default async function (req) {
  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json({ ok: false, error: "Sign in required." }, 401);
    if (user.role !== "admin") return json({ ok: false, error: "Only a governance admin can approve this request." }, 403);

    const body = await req.json().catch(() => null);
    const { kind, id, decision } = body || {};
    const reasonText = String(body?.reason || "").slice(0, 1000);
    if (!["agent", "action"].includes(kind) || !id || !["approve", "deny"].includes(decision)) {
      return json({ ok: false, error: "kind, id and decision are required." }, 400);
    }

    const db = base44.asServiceRole.entities;
    const name = user.full_name || user.name || "Unknown user";
    const decidedBy = user.email ? `${name} <${user.email}>` : name;
    const approve = decision === "approve";
    const verb = approve ? "approved" : "denied";
    const fail = (error) => json({ ok: false, error });

    if (kind === "action") {
      const rec = await db.ActionRecord.get(id);
      if (!rec) return fail("Action not found.");
      const err = selfApprovalError(user, decidedBy, rec.requested_by, null);
      if (err) return fail(err);
      if (rec.status !== "pending_approval") return fail(`This action is already ${rec.status}. Stale decisions are rejected.`);
      const history = [...(rec.decision_history || []), { actor: decidedBy, action: verb, reason: reasonText || (approve ? "Approved." : "Denied."), timestamp: now() }];
      if (approve) {
        if (rec.execution_consumed) return fail("This approval has already been consumed to execute the action once — it cannot be executed twice.");
        if (rec.approval_expires_at && new Date(rec.approval_expires_at).getTime() < Date.now()) return fail("This approval has expired and can no longer be used.");
        await db.ActionRecord.update(id, {
          status: "approved", decided_by: decidedBy, decided_date: now(), decision_history: history,
          execution_consumed: true, executed_at: now(),
          reasons: [...(rec.reasons || []), `Approved by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : "."} Action released for a single execution.`],
        });
      } else {
        await db.ActionRecord.update(id, {
          status: "denied", decided_by: decidedBy, decided_date: now(), decision_history: history,
          reasons: [...(rec.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : "."}`],
        });
      }
      return json({ ok: true });
    }

    // kind === "agent"
    const request = await db.AgentApprovalRequest.get(id);
    if (!request) return fail("Request not found.");
    const err = selfApprovalError(user, decidedBy, request.requested_by, request.owner_email);
    if (err) return fail(err);
    if (request.status !== "pending") return fail(`This request is already ${request.status}. Stale decisions are rejected.`);
    const history = [...(request.decision_history || []), { actor: decidedBy, action: verb, reason: reasonText || (approve ? "Approved." : "Denied."), timestamp: now() }];

    if (!approve) {
      await db.AgentApprovalRequest.update(id, {
        status: "denied", decided_by: decidedBy, decided_date: now(), decision_history: history,
        reasons: [...(request.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : ". Passport not provisioned."}`],
      });
      return json({ ok: true, request });
    }

    let agent;
    let note;
    if (request.request_type === "modified_passport") {
      const existing = rows(await db.ShieldAgent.filter({ agent_id: request.agent_id }))[0];
      if (!existing) return fail(`Agent ${request.agent_id} no longer exists.`);
      const newVersion = (existing.passport_version || 1) + 1;
      agent = await db.ShieldAgent.update(existing.id, {
        systems: request.systems || [],
        financial_limit_usd: request.financial_limit_usd || 0,
        financial_limit_mode: request.financial_limit_mode || "approval_threshold",
        autonomy_level: request.autonomy_level || existing.autonomy_level,
        prohibited_actions: request.prohibited_actions || [],
        data_permissions: request.data_permissions || [],
        passport_version: newVersion,
        version_history: [...(existing.version_history || []), { version: newVersion, changed_by: decidedBy, changed_at: now(), summary: `Passport modified on approval of ${request.request_uid || id}.` }],
      });
      agent = { ...existing, ...agent, id: existing.id };
      note = "Passport updated.";
    } else {
      agent = await db.ShieldAgent.create({
        agent_id: request.agent_id, name: request.name, owner_name: request.owner_name, owner_email: request.owner_email,
        purpose: request.purpose, systems: request.systems || [],
        financial_limit_usd: request.financial_limit_usd || 0,
        financial_limit_mode: request.financial_limit_mode || "approval_threshold",
        autonomy_level: request.autonomy_level || "standard",
        prohibited_actions: request.prohibited_actions || [], data_permissions: request.data_permissions || [],
        is_active: true, passport_version: 1, review_status: "reviewed", runtime_health: "unknown",
        passport_expires_at: request.approval_expires_at || null,
        version_history: [{ version: 1, changed_by: decidedBy, changed_at: now(), summary: `Passport provisioned on approval of ${request.request_uid || id}.` }],
      });
      note = "Passport provisioned into ShieldAgent.";
    }
    await db.AgentApprovalRequest.update(id, {
      status: "approved", decided_by: decidedBy, decided_date: now(), resulting_agent_record_id: agent.id, decision_history: history,
      reasons: [...(request.reasons || []), `Approved by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : ". " + note}`],
    });
    return json({ ok: true, agent, request });
  } catch (error) {
    return json({ ok: false, error: error.message || "Decision failed." }, 500);
  }
}