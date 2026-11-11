import { base44 } from "@/api/base44Client";
import { notifySecurityEvent } from "@/lib/notifications";
import { UNATTRIBUTED, normalizeActor } from "@/lib/identity";
import { generateRequestUid } from "@/lib/metrics";

/**
 * Actor attribution. Every requester and decider is the authenticated user
 * (see identity.js) — no approver identity is hardcoded.
 */
export const APPROVER_EMAIL = "";

export const AUTONOMY_DEFINITIONS = {
  full: "The agent has full autonomy to make decisions without human review and approval.",
  standard: "Irreversible or material actions must be approved by the owner before the agent can complete them.",
  restricted: "Each step performed by the agent must be approved before it proceeds.",
};

export const AUTONOMY_RANK = { full: 3, standard: 2, restricted: 1 };

export const AUTONOMY_BADGE_CLASS = {
  full: "bg-info/10 text-info border-info/30",
  standard: "bg-muted text-muted-foreground border-border",
  restricted: "bg-review/10 text-review border-review/30",
};

export const DECISION_META = {
  allow: { label: "Allow", className: "bg-allow/10 text-allow border-allow/30" },
  approval_required: { label: "Approval Required", className: "bg-review/10 text-review border-review/40" },
  blocked: { label: "Blocked", className: "bg-blocked/10 text-blocked border-blocked/40" },
};

export const STATUS_META = {
  executed: { label: "Executed", tone: "allow" },
  pending_approval: { label: "Pending Approval", tone: "review" },
  approved: { label: "Approved", tone: "allow" },
  denied: { label: "Denied", tone: "blocked" },
  blocked: { label: "Blocked", tone: "blocked" },
};

export const RISK_META = {
  high: { label: "High", className: "bg-blocked/10 text-blocked border-blocked/30" },
  medium: { label: "Medium", className: "bg-review/10 text-review border-review/30" },
  low: { label: "Low", className: "bg-allow/10 text-allow border-allow/30" },
};

export const FINANCIAL_LIMIT_MODES = {
  approval_threshold: {
    label: "Approval Threshold",
    description: "Actions above this limit are held for human approval (they may still be approved and executed).",
  },
  hard_cap: {
    label: "Hard Cap",
    description: "Actions above this limit are blocked outright and cannot be approved or executed.",
  },
};

export const DEMO_SCENARIOS = [
  {
    id: "routine",
    label: "Routine CRM update",
    description: "sales-agent updates a deal stage — within passport.",
    agent_id: "sales-agent",
    action_type: "update_deal_status",
    target_system: "crm",
    amount_usd: 0,
    params: { deal_id: "D-2041", stage: "closed-won" },
  },
  {
    id: "refund",
    label: "Refund over limit",
    description: "finance-agent issues a $12,000 refund exceeding its $2,500 limit.",
    agent_id: "finance-agent",
    action_type: "issue_refund",
    target_system: "billing",
    amount_usd: 12000,
    params: { customer_id: "C-882", reason: "service credit" },
  },
  {
    id: "exfil",
    label: "Bulk PII export",
    description: "ops-agent exports 50,000 customer records with PII to an external endpoint.",
    agent_id: "ops-agent",
    action_type: "export_database",
    target_system: "external_endpoint",
    amount_usd: 0,
    params: { records: 50000, contains: "PII", destination: "external_endpoint" },
  },
];

const now = () => new Date().toISOString();
const AUTO_ALLOW_ACTOR = "Governance Engine (auto-allow)";

/**
 * Core governance engine. Evaluates a proposed agent action against its passport
 * and ALL active policies, writes a full ActionRecord with a step-by-step
 * reasoning trace, and performs side effects (autonomy ratchet, owner/approver alerts).
 *
 * `actor` is the authenticated user initiating the evaluation (the requester).
 * It is recorded as `requested_by` and never overwrites historical attribution.
 */
export async function evaluateAction({ agent_id, action_type, target_system, amount_usd = 0, params = {}, actor, source = "ui" }) {
  // The verdict is produced by the one shared engine on the server, so the
  // console and the agent runtime can never disagree. Nothing is decided here.
  let data = null;
  try {
    const res = await base44.functions.invoke("evaluate-ui", {
      agent_id,
      action_type,
      target_system,
      amount_usd: Number(amount_usd) || 0,
      params,
      source,
    });
    data = res?.data;
  } catch (e) {
    return { error: e?.response?.data?.error || e?.message || "Evaluation failed." };
  }
  if (!data || data.error) return { error: data?.error || "Evaluation failed." };

  // The owner/approver alert still goes out from the request that raised it.
  let notification = null;
  if (data.decision === "blocked" || data.decision === "approval_required") {
    try {
      notification = await notifySecurityEvent({
        event: data.decision,
        record: data.record,
        agent: data.agent,
        blast: data.blast_radius_score,
        reversibility: data.reversibility,
        prevAuto: data.record.previous_autonomy_level,
        newAuto: data.record.new_autonomy_level,
        approverEmail: actor?.email || "",
      });
    } catch (e) { /* surfaced in Approvals queue regardless */ }
  }

  return { ...data, notification };
}

// Decisions are made and validated on the server (admin role + separation of
// duties); the browser only forwards the request.
async function decide(kind, id, decision, reason) {
  try {
    const res = await base44.functions.invoke("decide", { kind, id, decision, reason });
    return res?.data || { ok: false, error: "Decision failed." };
  } catch (e) {
    return { ok: false, error: e?.response?.data?.error || e?.message || "Decision failed." };
  }
}

export const approveAgentRequest = (requestId, actor, reasonText = "") => decide("agent", requestId, "approve", reasonText);
export const denyAgentRequest = (requestId, actor, reasonText = "") => decide("agent", requestId, "deny", reasonText);
export const approveAction = (actionId, actor, reasonText = "") => decide("action", actionId, "approve", reasonText);
export const denyAction = (actionId, actor, reasonText = "") => decide("action", actionId, "deny", reasonText);

export async function revokeAgent(agentId, actor, reasonText = "") {
  if (actor?.role !== "admin") return { ok: false, error: "Only a governance admin can revoke a passport." };
  const agents = await base44.entities.ShieldAgent.filter({ agent_id: agentId });
  const agent = agents?.[0];
  if (!agent) return { ok: false, error: "Agent not found." };
  if (!agent.is_active) return { ok: false, error: "This passport is already revoked." };
  const decidedBy = actor?.display || UNATTRIBUTED;
  await base44.entities.ShieldAgent.update(agent.id, {
    is_active: false,
    review_status: "needs_attention",
    version_history: [...(agent.version_history || []), { version: agent.passport_version || 1, changed_by: decidedBy, changed_at: now(), summary: `Passport revoked${reasonText ? ": " + reasonText : "."}` }],
  });
  // A revoked passport must not keep working runtime credentials.
  try {
    await base44.entities.AgentApiKey.updateMany(
      { agent_id: agent.agent_id, status: "active" },
      { $set: { status: "revoked", revoked_at: now(), revoked_by: decidedBy } }
    );
  } catch (e) { /* the runtime also refuses a passport that is not active */ }
  await base44.entities.ActionRecord.create({
    agent_id: agent.agent_id, agent_name: agent.name, action_type: "revoke_passport", target_system: "governance",
    amount_usd: 0, params: { reason: reasonText }, decision: "blocked", status: "blocked",
    requested_by: decidedBy, decided_by: decidedBy, decided_date: now(),
    reasons: [`Passport revoked by ${decidedBy}${reasonText ? ": " + reasonText : "."}`],
    blast_radius_score: 4, reversibility: "partially_reversible",
  });
  return { ok: true };
}

export async function renewAgent(agentId, actor, newExpiryIso, reasonText = "") {
  if (actor?.role !== "admin") return { ok: false, error: "Only a governance admin can renew a passport." };
  const agents = await base44.entities.ShieldAgent.filter({ agent_id: agentId });
  const agent = agents?.[0];
  if (!agent) return { ok: false, error: "Agent not found." };
  const decidedBy = actor?.display || UNATTRIBUTED;
  const newVersion = (agent.passport_version || 1) + 1;
  await base44.entities.ShieldAgent.update(agent.id, {
    passport_expires_at: newExpiryIso,
    passport_version: newVersion,
    is_active: true,
    review_status: "reviewed",
    version_history: [...(agent.version_history || []), { version: newVersion, changed_by: decidedBy, changed_at: now(), summary: `Passport renewed until ${newExpiryIso}${reasonText ? ": " + reasonText : "."}` }],
  });
  await base44.entities.ActionRecord.create({
    agent_id: agent.agent_id, agent_name: agent.name, action_type: "renew_passport", target_system: "governance",
    amount_usd: 0, params: { new_expiry: newExpiryIso, reason: reasonText }, decision: "allow", status: "executed",
    requested_by: decidedBy, decided_by: decidedBy, decided_date: now(),
    reasons: [`Passport renewed by ${decidedBy} until ${newExpiryIso}${reasonText ? ": " + reasonText : "."}`],
    blast_radius_score: 1, reversibility: "reversible",
  });
  return { ok: true };
}

export function riskForAgent(agent, actions = []) {
  const agentActions = actions.filter((a) => a.agent_id === agent.agent_id);
  const blocked = agentActions.filter((a) => a.decision === "blocked").length;
  const denied = agentActions.filter((a) => a.status === "denied").length;
  const pending = agentActions.filter((a) => a.status === "pending_approval").length;

  // Observed behavior — what the agent has actually done.
  const observed = [];
  if (blocked > 0) observed.push(`${blocked} blocked action(s)`);
  if (denied > 0) observed.push(`${denied} denied action(s)`);
  if (pending > 0) observed.push(`${pending} pending approval`);

  // Inherent exposure — potential damage, independent of behavior.
  const exposure = [];
  const finLimit = Number(agent.financial_limit_usd || 0);
  if (finLimit >= 10000) exposure.push(`high financial exposure ($${finLimit.toLocaleString()})`);
  else if (finLimit > 0) exposure.push(`financial exposure up to $${finLimit.toLocaleString()}`);
  if (agent.autonomy_level === "full") exposure.push("full autonomy (no human oversight)");
  if ((agent.systems || []).length >= 3) exposure.push(`${agent.systems.length}-system reach`);

  // Protective controls — reduce risk. Restricted autonomy NEVER raises risk.
  const controls = [];
  if (agent.autonomy_level === "restricted") controls.push("restricted autonomy (human oversight on each step)");
  if (agent.autonomy_level === "standard") controls.push("standard autonomy (approval on material actions)");
  if (agent.financial_limit_mode === "hard_cap") controls.push("hard financial cap");
  if ((agent.prohibited_actions || []).length > 0) controls.push(`${agent.prohibited_actions.length} prohibited action(s)`);

  const highExposure = exposure.some((e) => e.startsWith("high financial")) || agent.autonomy_level === "full";
  let level = "low";
  if (blocked > 0) level = "high";
  else if (pending > 0 || denied > 0) level = "medium";
  else if (highExposure) level = "medium";

  return { level, factors: [...observed, ...exposure], observed, exposure, controls, total: agentActions.length, blocked, denied, pending };
}