import { base44 } from "@/api/base44Client";
import { notifySecurityEvent } from "@/lib/notifications";
import { DEMO_APPROVER_DISPLAY, DEMO_APPROVER_EMAIL, normalizeActor } from "@/lib/identity";
import { generateRequestUid } from "@/lib/metrics";

/**
 * Demo governance approver — kept for backward compatibility with existing
 * imports. The real authenticated user is the source of truth (see identity.js).
 */
export const APPROVER_NAME = "Micah Thorner";
export const APPROVER_EMAIL = "micah@venusaipros.com";
export const APPROVER_DISPLAY = DEMO_APPROVER_DISPLAY;

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

function isExfiltration(action_type, target_system, params) {
  const at = (action_type || "").toLowerCase();
  const ts = (target_system || "").toLowerCase();
  const ps = JSON.stringify(params || {}).toLowerCase();
  const hasPII = ["pii", "personal", "customer records", "ssn", "passport", "health", "customer_id"].some((k) => ps.includes(k));
  const external = ts.includes("external") || ts.includes("unauthorized") || ts.trim() === "";
  if (at.includes("export") && at.includes("database")) return true;
  if (at.includes("export") && (external || hasPII)) return true;
  if (external && hasPII) return true;
  return false;
}

function computeBlastRadius({ action_type, target_system, amount_usd, params }) {
  if (isExfiltration(action_type, target_system, params)) return 5;
  if (Number(amount_usd || 0) >= 50000) return 4;
  if (Number(amount_usd || 0) >= 10000) return 3;
  if (Number(amount_usd || 0) > 0) return 2;
  return 1;
}

function reversibilityFor(action_type, blast, exfil) {
  if (exfil) return "irreversible";
  const at = (action_type || "").toLowerCase();
  if (["delete", "drop", "purge", "wipe", "terminate"].some((k) => at.includes(k))) return "irreversible";
  if (["refund", "payment", "transfer", "disbursement"].some((k) => at.includes(k))) return "partially_reversible";
  if (blast >= 4) return "partially_reversible";
  return "reversible";
}

function policyMatchesFn(policy, action, exfil) {
  const m = policy.match || {};
  if (!m || Object.keys(m).length === 0) return false;
  if (Array.isArray(m.action_types) && !m.action_types.map((x) => String(x).toLowerCase()).includes((action.action_type || "").toLowerCase())) return false;
  if (Array.isArray(m.target_systems) && !m.target_systems.map((x) => String(x).toLowerCase()).includes((action.target_system || "").toLowerCase())) return false;
  if (m.exfiltration === true && !exfil) return false;
  if (m.min_amount != null && Number(action.amount_usd || 0) < Number(m.min_amount)) return false;
  return true;
}

/**
 * Conflict resolution across ALL matched policies.
 * Rule: hard prohibitions (blocked) > approval requirements > allow.
 * Returns { decisiveDecision, decisivePolicy, matches }.
 */
function resolvePolicyConflicts(matched) {
  const matches = matched
    .slice()
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .map((p) => ({ name: p.name, priority: p.priority, required_decision: p.required_decision }));

  let decisiveDecision = "allow";
  if (matched.some((p) => p.required_decision === "blocked")) decisiveDecision = "blocked";
  else if (matched.some((p) => p.required_decision === "approval_required")) decisiveDecision = "approval_required";

  const decisivePolicy =
    matched.find((p) => p.required_decision === decisiveDecision) ||
    matched.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] ||
    null;

  return { decisiveDecision, decisivePolicy, matches };
}

/**
 * Core governance engine. Evaluates a proposed agent action against its passport
 * and ALL active policies, writes a full ActionRecord with a step-by-step
 * reasoning trace, and performs side effects (autonomy ratchet, owner/approver alerts).
 *
 * `actor` is the authenticated user initiating the evaluation (the requester).
 * It is recorded as `requested_by` and never overwrites historical attribution.
 */
export async function evaluateAction({ agent_id, action_type, target_system, amount_usd = 0, params = {}, actor }) {
  const agents = await base44.entities.ShieldAgent.filter({ agent_id });
  const agent = agents?.[0];
  if (!agent) {
    return { error: `No governed agent found with id "${agent_id}". Register and approve the agent first.` };
  }

  const requester = actor?.display || DEMO_APPROVER_DISPLAY;
  const requesterEmail = actor?.email || "";

  const reasons = [];
  let stepNo = 1;
  const ts = now();
  const add = (type, text) => reasons.push(`${stepNo++}. [${ts}] ${type}: ${text}`);

  add("INIT", `Evaluation started for agent "${agent.name}" (${agent.agent_id}). Requested by ${requester}.`);

  const finMode = agent.financial_limit_mode || "approval_threshold";
  const finModeLabel = FINANCIAL_LIMIT_MODES[finMode]?.label || finMode;
  add("PASSPORT", `Autonomy: ${agent.autonomy_level}. Financial limit: $${Number(agent.financial_limit_usd || 0).toLocaleString()} (${finModeLabel}). Authorized systems: ${(agent.systems || []).join(", ") || "none"}.`);
  add("ACTION", `Requested action "${action_type}" against target "${target_system}" for $${Number(amount_usd || 0).toLocaleString()}.`);

  const exfil = isExfiltration(action_type, target_system, params);
  const blast = computeBlastRadius({ action_type, target_system, amount_usd, params });
  const reversibility = reversibilityFor(action_type, blast, exfil);
  add("ASSESS", `Blast radius: ${blast}/5. Reversibility: ${reversibility}.`);

  // Evaluate ALL matching policies and resolve conflicts.
  let matchedList = [];
  let decisiveDecision = "allow";
  let decisivePolicy = null;
  try {
    const policies = await base44.entities.ShieldPolicy.filter({ is_active: true });
    const matched = (policies || []).filter((p) => policyMatchesFn(p, { action_type, target_system, amount_usd, params }, exfil));
    const resolved = resolvePolicyConflicts(matched);
    matchedList = resolved.matches;
    decisiveDecision = resolved.decisiveDecision;
    decisivePolicy = resolved.decisivePolicy;
    if (matchedList.length === 0) {
      add("POLICY MATCH", "No explicit policy matched; passport rules govern.");
    } else {
      add("POLICY MATCH", `${matchedList.length} policy(ies) matched:`);
      matchedList.forEach((m) => add("POLICY MATCH", `"${m.name}" (priority ${m.priority}) → required decision: ${m.required_decision}.`));
      add("CONFLICT", `Conflict resolution (blocked > approval_required > allow): decisive policy "${decisivePolicy.name}" → ${decisiveDecision}.`);
    }
  } catch (e) {
    add("POLICY MATCH", "Policy lookup unavailable; passport rules govern.");
  }

  const prohibited = (agent.prohibited_actions || []).map((a) => String(a).toLowerCase());
  const actionLower = (action_type || "").toLowerCase();
  const systems = (agent.systems || []).map((s) => String(s).toLowerCase());
  const systemAuthorized = systems.includes((target_system || "").toLowerCase());
  const overLimit = Number(amount_usd || 0) > Number(agent.financial_limit_usd || 0);

  let decision = "allow";
  let status = "executed";
  let alertOwner = false;
  let downgrade = false;
  const prevAuto = agent.autonomy_level;
  let newAuto = agent.autonomy_level;
  let blockReason = null;

  // 1. Passport hard prohibitions (always block).
  if (prohibited.includes(actionLower)) {
    blockReason = `Action "${action_type}" is in the agent's prohibited list [${(agent.prohibited_actions || []).join(", ")}].`;
    add("VIOLATION", blockReason);
    decision = "blocked";
  } else if (!systemAuthorized) {
    blockReason = `Target system "${target_system}" is not in the agent's authorized systems [${(agent.systems || []).join(", ") || "none"}].`;
    add("VIOLATION", blockReason);
    decision = "blocked";
  } else if (exfil) {
    blockReason = `Bulk data exfiltration detected (export to "${target_system}" with sensitive/PII data).`;
    add("VIOLATION", blockReason);
    decision = "blocked";
  } else {
    add("PASSED", "Action is not prohibited, target is authorized, and no exfiltration pattern detected.");
  }

  // 2. Financial hard cap (block, cannot be approved).
  if (decision !== "blocked" && finMode === "hard_cap" && overLimit) {
    blockReason = `Amount $${Number(amount_usd).toLocaleString()} exceeds the agent's hard cap of $${Number(agent.financial_limit_usd || 0).toLocaleString()} (cannot be approved).`;
    add("VIOLATION", blockReason);
    decision = "blocked";
  }

  // 3. Policy hard blocks.
  if (decision !== "blocked" && decisiveDecision === "blocked") {
    blockReason = `Policy "${decisivePolicy.name}" requires BLOCKED.`;
    add("POLICY BLOCK", blockReason);
    decision = "blocked";
  }

  if (decision === "blocked") {
    status = "blocked";
    alertOwner = true;
    if (AUTONOMY_RANK[prevAuto] > AUTONOMY_RANK.restricted) {
      downgrade = true;
      newAuto = "restricted";
      add("RATCHET", `Autonomy downgraded: ${prevAuto} → restricted.`);
    } else {
      add("RATCHET", "Autonomy ratchet applied: already at restricted floor (no further downgrade).");
    }
    add("DECISION", `Verdict: BLOCKED. ${blockReason} Owner alerted. Blast radius locked at 5, action marked irreversible.`);
  } else {
    // 4. Approval requirements.
    const approvalReasons = [];
    if (finMode === "approval_threshold" && overLimit) approvalReasons.push(`Amount $${Number(amount_usd).toLocaleString()} exceeds the approval threshold of $${Number(agent.financial_limit_usd || 0).toLocaleString()}`);
    if (decisiveDecision === "approval_required") approvalReasons.push(`Policy "${decisivePolicy.name}" requires approval`);
    const restrictedHighBlast = agent.autonomy_level === "restricted" && blast >= 3;
    const irreversibleSensitive = reversibility === "irreversible";
    if (restrictedHighBlast) approvalReasons.push(`Restricted autonomy with blast radius ${blast} (>= 3)`);
    if (irreversibleSensitive) approvalReasons.push("Irreversible action");

    if (approvalReasons.length) {
      approvalReasons.forEach((r) => add("EXCEEDED", `${r} requires human approval.`));
      decision = "approval_required";
      status = "pending_approval";
      add("DECISION", "Verdict: APPROVAL REQUIRED. Action held pending human review.");
    } else {
      add("DECISION", "Verdict: ALLOW. Action within passport; executed.");
    }
  }

  const record = await base44.entities.ActionRecord.create({
    agent_id: agent.agent_id,
    agent_name: agent.name,
    action_type,
    target_system,
    amount_usd: Number(amount_usd || 0),
    params: params || {},
    request_uid: generateRequestUid("ACT"),
    environment: "prod",
    scope_type: "single_execution",
    approval_expires_at: decision === "approval_required" ? new Date(Date.now() + 72 * 3600 * 1000).toISOString() : null,
    blast_radius_score: decision === "blocked" ? 5 : blast,
    reversibility: decision === "blocked" ? "irreversible" : reversibility,
    decision,
    status,
    requested_by: requester,
    policy_matches: matchedList,
    policy_matched_name: decisivePolicy?.name || null,
    policy_matched_priority: decisivePolicy?.priority ?? null,
    financial_limit_mode: finMode,
    alert_owner: alertOwner,
    autonomy_downgraded: downgrade,
    previous_autonomy_level: prevAuto,
    new_autonomy_level: decision === "blocked" ? newAuto : prevAuto,
    decided_by: decision === "allow" ? AUTO_ALLOW_ACTOR : null,
    decided_date: decision === "allow" ? now() : null,
    reasons,
  });

  if (downgrade) {
    try { await base44.entities.ShieldAgent.update(agent.id, { autonomy_level: "restricted" }); } catch (e) { /* noop */ }
  }
  let notification = null;
  if (decision === "blocked" || decision === "approval_required") {
    try {
      notification = await notifySecurityEvent({
        event: decision,
        record,
        agent,
        blast: decision === "blocked" ? 5 : blast,
        reversibility: decision === "blocked" ? "irreversible" : reversibility,
        prevAuto,
        newAuto: decision === "blocked" ? newAuto : prevAuto,
        approverEmail: requesterEmail || DEMO_APPROVER_EMAIL,
      });
    } catch (e) { /* surfaced in Approvals queue regardless */ }
  }

  return {
    record,
    decision,
    notification,
    agent: { ...agent, autonomy_level: downgrade ? "restricted" : agent.autonomy_level },
    blast_radius_score: decision === "blocked" ? 5 : blast,
    reversibility: decision === "blocked" ? "irreversible" : reversibility,
    policyMatches: matchedList,
    decisivePolicy,
    financialLimitMode: finMode,
  };
}

function selfApprovalError(actor, requester, ownerEmail) {
  if (!actor) return null;
  if (actor.role !== "admin") return "Only a governance admin can approve this request.";
  if (requester && actor.display === requester) return "Self-approval is not permitted: you requested this action, so you cannot approve it.";
  if (ownerEmail && actor.email && actor.email.toLowerCase() === String(ownerEmail).toLowerCase()) return "Self-approval is not permitted: you are the owner of this agent, so you cannot approve its request.";
  return null;
}

export async function approveAgentRequest(requestId, actor, reasonText = "") {
  const req = await base44.entities.AgentApprovalRequest.get(requestId);
  const err = selfApprovalError(actor, req.requested_by, req.owner_email);
  if (err) return { ok: false, error: err };
  if (req.status !== "pending") return { ok: false, error: `This request is already ${req.status}. Stale decisions are rejected.` };
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
  const history = [...(req.decision_history || []), { actor: decidedBy, action: "approved", reason: reasonText || "Approved.", timestamp: now() }];
  const agent = await base44.entities.ShieldAgent.create({
    agent_id: req.agent_id,
    name: req.name,
    owner_name: req.owner_name,
    owner_email: req.owner_email,
    purpose: req.purpose,
    systems: req.systems || [],
    financial_limit_usd: req.financial_limit_usd || 0,
    financial_limit_mode: req.financial_limit_mode || "approval_threshold",
    autonomy_level: req.autonomy_level || "standard",
    prohibited_actions: req.prohibited_actions || [],
    data_permissions: req.data_permissions || [],
    is_active: true,
    passport_version: 1,
    review_status: "reviewed",
    runtime_health: "unknown",
    passport_expires_at: req.approval_expires_at || null,
    version_history: [{ version: 1, changed_by: decidedBy, changed_at: now(), summary: `Passport provisioned on approval of ${req.request_uid || requestId}.` }],
  });
  await base44.entities.AgentApprovalRequest.update(requestId, {
    status: "approved",
    decided_by: decidedBy,
    decided_date: now(),
    resulting_agent_record_id: agent.id,
    decision_history: history,
    reasons: [...(req.reasons || []), `Approved by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : ". Passport provisioned into ShieldAgent."}`],
  });
  return { ok: true, agent, request: req };
}

export async function denyAgentRequest(requestId, actor, reasonText = "") {
  const req = await base44.entities.AgentApprovalRequest.get(requestId);
  const err = selfApprovalError(actor, req.requested_by, req.owner_email);
  if (err) return { ok: false, error: err };
  if (req.status !== "pending") return { ok: false, error: `This request is already ${req.status}. Stale decisions are rejected.` };
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
  const history = [...(req.decision_history || []), { actor: decidedBy, action: "denied", reason: reasonText || "Denied.", timestamp: now() }];
  await base44.entities.AgentApprovalRequest.update(requestId, {
    status: "denied",
    decided_by: decidedBy,
    decided_date: now(),
    decision_history: history,
    reasons: [...(req.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : ". Passport not provisioned."}`],
  });
  return { ok: true, request: req };
}

export async function approveAction(actionId, actor, reasonText = "") {
  const rec = await base44.entities.ActionRecord.get(actionId);
  const err = selfApprovalError(actor, rec.requested_by, null);
  if (err) return { ok: false, error: err };
  if (rec.status !== "pending_approval") return { ok: false, error: `This action is already ${rec.status}. Stale decisions are rejected.` };
  if (rec.execution_consumed) return { ok: false, error: "This approval has already been consumed to execute the action once — it cannot be executed twice." };
  const exp = rec.approval_expires_at ? new Date(rec.approval_expires_at).getTime() - Date.now() : null;
  if (exp !== null && exp < 0) return { ok: false, error: "This approval has expired and can no longer be used." };
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
  const history = [...(rec.decision_history || []), { actor: decidedBy, action: "approved", reason: reasonText || "Approved.", timestamp: now() }];
  await base44.entities.ActionRecord.update(actionId, {
    status: "approved",
    decided_by: decidedBy,
    decided_date: now(),
    decision_history: history,
    execution_consumed: true,
    executed_at: now(),
    reasons: [...(rec.reasons || []), `Approved by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : "."} Action released for a single execution.`],
  });
  return { ok: true };
}

export async function denyAction(actionId, actor, reasonText = "") {
  const rec = await base44.entities.ActionRecord.get(actionId);
  const err = selfApprovalError(actor, rec.requested_by, null);
  if (err) return { ok: false, error: err };
  if (rec.status !== "pending_approval") return { ok: false, error: `This action is already ${rec.status}. Stale decisions are rejected.` };
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
  const history = [...(rec.decision_history || []), { actor: decidedBy, action: "denied", reason: reasonText || "Denied.", timestamp: now() }];
  await base44.entities.ActionRecord.update(actionId, {
    status: "denied",
    decided_by: decidedBy,
    decided_date: now(),
    decision_history: history,
    reasons: [...(rec.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : "."}`],
  });
  return { ok: true };
}

export async function revokeAgent(agentId, actor, reasonText = "") {
  if (actor?.role !== "admin") return { ok: false, error: "Only a governance admin can revoke a passport." };
  const agents = await base44.entities.ShieldAgent.filter({ agent_id: agentId });
  const agent = agents?.[0];
  if (!agent) return { ok: false, error: "Agent not found." };
  if (!agent.is_active) return { ok: false, error: "This passport is already revoked." };
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
  await base44.entities.ShieldAgent.update(agent.id, {
    is_active: false,
    review_status: "needs_attention",
    version_history: [...(agent.version_history || []), { version: agent.passport_version || 1, changed_by: decidedBy, changed_at: now(), summary: `Passport revoked${reasonText ? ": " + reasonText : "."}` }],
  });
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
  const decidedBy = actor?.display || DEMO_APPROVER_DISPLAY;
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