import { base44 } from "@/api/base44Client";

export const APPROVER_NAME = "Micah Thorner";
export const APPROVER_EMAIL = "micah@venusaipros.com";
export const APPROVER_DISPLAY = "Micah Thorner <micah@venusaipros.com>";

export const AUTONOMY_DEFINITIONS = {
  full: "The agent has full autonomy to make decisions without human review and approval.",
  standard: "Irreversible or material actions must be approved by the owner before the agent can complete them.",
  restricted: "Each step performed by the agent must be approved before it proceeds.",
};

export const AUTONOMY_RANK = { full: 3, standard: 2, restricted: 1 };

export const AUTONOMY_BADGE_CLASS = {
  full: "bg-blue-50 text-blue-700 border-blue-200",
  standard: "bg-slate-100 text-slate-700 border-slate-200",
  restricted: "bg-amber-50 text-amber-700 border-amber-200",
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

function policyMatches(policy, action, exfil) {
  const m = policy.match || {};
  if (!m || Object.keys(m).length === 0) return false;
  if (Array.isArray(m.action_types) && !m.action_types.map((x) => String(x).toLowerCase()).includes((action.action_type || "").toLowerCase())) return false;
  if (Array.isArray(m.target_systems) && !m.target_systems.map((x) => String(x).toLowerCase()).includes((action.target_system || "").toLowerCase())) return false;
  if (m.exfiltration === true && !exfil) return false;
  if (m.min_amount != null && Number(action.amount_usd || 0) < Number(m.min_amount)) return false;
  return true;
}

/**
 * Core governance engine. Evaluates a proposed agent action against its passport
 * and active policies, writes a full ActionRecord with a step-by-step reasoning
 * trace, and performs side effects (autonomy ratchet, owner/approver alerts).
 */
export async function evaluateAction({ agent_id, action_type, target_system, amount_usd = 0, params = {}, requested_by = APPROVER_DISPLAY }) {
  const agents = await base44.entities.ShieldAgent.filter({ agent_id });
  const agent = agents?.[0];
  if (!agent) {
    return { error: `No governed agent found with id "${agent_id}". Register and approve the agent first.` };
  }

  const reasons = [];
  let stepNo = 1;
  const ts = now();
  const add = (type, text) => reasons.push(`${stepNo++}. [${ts}] ${type}: ${text}`);

  add("INIT", `Evaluation started for agent "${agent.name}" (${agent.agent_id}).`);
  add("PASSPORT", `Autonomy: ${agent.autonomy_level}. Financial limit: $${Number(agent.financial_limit_usd || 0).toLocaleString()}. Authorized systems: ${(agent.systems || []).join(", ") || "none"}.`);
  add("ACTION", `Requested action "${action_type}" against target "${target_system}" for $${Number(amount_usd || 0).toLocaleString()}.`);

  const exfil = isExfiltration(action_type, target_system, params);
  const blast = computeBlastRadius({ action_type, target_system, amount_usd, params });
  const reversibility = reversibilityFor(action_type, blast, exfil);
  add("ASSESS", `Blast radius: ${blast}/5. Reversibility: ${reversibility}.`);

  let policyName = null;
  let policyPriority = null;
  let policyDecision = null;
  try {
    const policies = await base44.entities.ShieldPolicy.filter({ is_active: true });
    const matched = (policies || [])
      .filter((p) => policyMatches(p, { action_type, target_system, amount_usd, params }, exfil))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (matched) {
      policyName = matched.name;
      policyPriority = matched.priority;
      policyDecision = matched.required_decision;
      add("POLICY MATCH", `Matched policy "${matched.name}" (priority ${matched.priority}) → required decision: ${matched.required_decision}.`);
    } else {
      add("POLICY MATCH", "No explicit policy matched; passport rules govern.");
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

  if (prohibited.includes(actionLower)) {
    add("VIOLATION", `Action "${action_type}" is in the agent's prohibited list [${(agent.prohibited_actions || []).join(", ")}].`);
    decision = "blocked";
  } else if (!systemAuthorized) {
    add("VIOLATION", `Target system "${target_system}" is not in the agent's authorized systems [${(agent.systems || []).join(", ") || "none"}].`);
    decision = "blocked";
  } else if (exfil) {
    add("VIOLATION", `Bulk data exfiltration detected (export to "${target_system}" with sensitive/PII data).`);
    decision = "blocked";
  } else {
    add("PASSED", "Action is not prohibited, target is authorized, and no exfiltration pattern detected.");
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
    add("DECISION", "Verdict: BLOCKED. Owner alerted. Blast radius locked at 5, action marked irreversible.");
  } else {
    const restrictedHighBlast = agent.autonomy_level === "restricted" && blast >= 3;
    const irreversibleSensitive = reversibility === "irreversible";
    if (overLimit) add("EXCEEDED", `Amount $${Number(amount_usd).toLocaleString()} exceeds the agent's financial limit of $${Number(agent.financial_limit_usd || 0).toLocaleString()}.`);
    if (restrictedHighBlast) add("EXCEEDED", `Restricted autonomy with blast radius ${blast} (>= 3) requires human approval.`);
    if (irreversibleSensitive) add("EXCEEDED", "Irreversible action requires human approval.");
    const policyEscalates = policyDecision === "blocked" || policyDecision === "approval_required";
    if (overLimit || restrictedHighBlast || irreversibleSensitive || policyEscalates) {
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
    blast_radius_score: decision === "blocked" ? 5 : blast,
    reversibility: decision === "blocked" ? "irreversible" : reversibility,
    decision,
    status,
    policy_matched_name: policyName,
    policy_matched_priority: policyPriority,
    alert_owner: alertOwner,
    autonomy_downgraded: downgrade,
    previous_autonomy_level: prevAuto,
    new_autonomy_level: decision === "blocked" ? newAuto : prevAuto,
    decided_by: decision === "allow" ? requested_by : null,
    decided_date: decision === "allow" ? now() : null,
    reasons,
  });

  if (downgrade) {
    try { await base44.entities.ShieldAgent.update(agent.id, { autonomy_level: "restricted" }); } catch (e) { /* noop */ }
  }
  if (decision === "approval_required") {
    try {
      await base44.integrations.Core.SendEmail({
        to: APPROVER_EMAIL,
        subject: `[Venus Shield] Approval required: ${action_type} by ${agent.name}`,
        body: `An action requires your approval.\n\nAgent: ${agent.name} (${agent.agent_id})\nAction: ${action_type}\nTarget: ${target_system}\nAmount: $${Number(amount_usd || 0).toLocaleString()}\nBlast radius: ${blast}/5\nReversibility: ${reversibility}\nDecision: APPROVAL REQUIRED\n\nReview pending actions in the Approvals queue.`,
      });
    } catch (e) { /* surfaced in Approvals queue regardless */ }
  }
  if (alertOwner) {
    try {
      await base44.integrations.Core.SendEmail({
        to: agent.owner_email || APPROVER_EMAIL,
        subject: `[Venus Shield] BLOCKED action & autonomy ratchet: ${agent.name}`,
        body: `A governed action was blocked.\n\nAgent: ${agent.name} (${agent.agent_id})\nAction: ${action_type}\nTarget: ${target_system}\nAutonomy: ${prevAuto} → ${newAuto}\n\nThe agent's passport has been ratcheted to restricted.`,
      });
    } catch (e) { /* noop */ }
  }

  return {
    record,
    decision,
    agent: { ...agent, autonomy_level: downgrade ? "restricted" : agent.autonomy_level },
    blast_radius_score: decision === "blocked" ? 5 : blast,
    reversibility: decision === "blocked" ? "irreversible" : reversibility,
  };
}

export async function approveAgentRequest(requestId, decidedBy = APPROVER_DISPLAY) {
  const req = await base44.entities.AgentApprovalRequest.get(requestId);
  const agent = await base44.entities.ShieldAgent.create({
    agent_id: req.agent_id,
    name: req.name,
    owner_name: req.owner_name,
    owner_email: req.owner_email,
    purpose: req.purpose,
    systems: req.systems || [],
    financial_limit_usd: req.financial_limit_usd || 0,
    autonomy_level: req.autonomy_level || "standard",
    prohibited_actions: req.prohibited_actions || [],
    data_permissions: req.data_permissions || [],
    is_active: true,
  });
  await base44.entities.AgentApprovalRequest.update(requestId, {
    status: "approved",
    decided_by: decidedBy,
    decided_date: now(),
    resulting_agent_record_id: agent.id,
    reasons: [...(req.reasons || []), `Approved by ${decidedBy} on ${now()}. Passport provisioned into ShieldAgent (record ${agent.id}).`],
  });
  return { agent, request: req };
}

export async function denyAgentRequest(requestId, decidedBy = APPROVER_DISPLAY, reasonText = "") {
  const req = await base44.entities.AgentApprovalRequest.get(requestId);
  await base44.entities.AgentApprovalRequest.update(requestId, {
    status: "denied",
    decided_by: decidedBy,
    decided_date: now(),
    reasons: [...(req.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : ". Passport not provisioned."}`],
  });
  return { request: req };
}

export async function approveAction(actionId, decidedBy = APPROVER_DISPLAY) {
  const rec = await base44.entities.ActionRecord.get(actionId);
  await base44.entities.ActionRecord.update(actionId, {
    status: "approved",
    decided_by: decidedBy,
    decided_date: now(),
    reasons: [...(rec.reasons || []), `Approved by ${decidedBy} on ${now()}. Action released for execution.`],
  });
}

export async function denyAction(actionId, decidedBy = APPROVER_DISPLAY, reasonText = "") {
  const rec = await base44.entities.ActionRecord.get(actionId);
  await base44.entities.ActionRecord.update(actionId, {
    status: "denied",
    decided_by: decidedBy,
    decided_date: now(),
    reasons: [...(rec.reasons || []), `Denied by ${decidedBy} on ${now()}${reasonText ? ": " + reasonText : "."}`],
  });
}

export function riskForAgent(agent, actions = []) {
  const agentActions = actions.filter((a) => a.agent_id === agent.agent_id);
  const blocked = agentActions.filter((a) => a.decision === "blocked").length;
  const pending = agentActions.filter((a) => a.status === "pending_approval").length;
  const factors = [];
  if (blocked > 0) factors.push(`${blocked} blocked action(s) on record`);
  if (agent.autonomy_level === "restricted") factors.push("restricted autonomy");
  if (pending > 0) factors.push(`${pending} action(s) pending approval`);
  if (agent.financial_limit_usd > 0) factors.push(`financial exposure up to $${agent.financial_limit_usd.toLocaleString()}`);
  const level = blocked > 0 ? "high" : (agent.autonomy_level === "restricted" || pending > 0) ? "medium" : "low";
  return { level, factors, total: agentActions.length, blocked, pending };
}