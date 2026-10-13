// base44/shared/engine.ts
//
// THE single governance evaluator. Ported line-for-line from the console engine
// so a verdict never depends on which path asked for it.
//
// Callers:
//   enforce       — agent runtimes (authenticated by agent API key)
//   evaluate-ui   — Evaluate Action + AIRTP (authenticated signed-in user)
// Nothing else may compute a verdict.
//
// This module also owns the agent-key credential check (bottom of file), which
// every endpoint that authenticates an agent key shares — so authorization for
// the status lookup can never drift from runtime enforcement.

export const UNATTRIBUTED = "Unattributed";
export const AUTO_ALLOW_ACTOR = "Governance Engine (auto-allow)";

const FINANCIAL_LIMIT_MODE_LABELS = {
  approval_threshold: "Approval Threshold",
  hard_cap: "Hard Cap",
};

export const now = () => new Date().toISOString();

export function generateRequestUid(prefix = "ACT") {
  const yr = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yr}-${rand}`;
}

/** Entity queries return an array or a page; normalise to an array. */
export function rows(result) {
  if (Array.isArray(result)) return result;
  return result?.items || [];
}

export function isExfiltration(action_type, target_system, params) {
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

export function computeBlastRadius({ action_type, target_system, amount_usd, params }) {
  if (isExfiltration(action_type, target_system, params)) return 5;
  if (Number(amount_usd || 0) >= 50000) return 4;
  if (Number(amount_usd || 0) >= 10000) return 3;
  if (Number(amount_usd || 0) > 0) return 2;
  return 1;
}

export function reversibilityFor(action_type, blast, exfil) {
  if (exfil) return "irreversible";
  const at = (action_type || "").toLowerCase();
  if (["delete", "drop", "purge", "wipe", "terminate"].some((k) => at.includes(k))) return "irreversible";
  if (["refund", "payment", "transfer", "disbursement"].some((k) => at.includes(k))) return "partially_reversible";
  if (blast >= 4) return "partially_reversible";
  return "reversible";
}

export function policyMatches(policy, action, exfil) {
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
 */
export function resolvePolicyConflicts(matched) {
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

export const AUTONOMY_RANK = { full: 3, standard: 2, restricted: 1 };

/**
 * Evaluate a proposed action against the agent's passport and every active policy.
 * Pure: no data access, no side effects — `requester` only appears in the trace.
 */
export function evaluateGovernance({ agent, policies, action, requester = UNATTRIBUTED }) {
  const { action_type, target_system, amount_usd = 0, params = {} } = action || {};

  const reasons = [];
  let stepNo = 1;
  const ts = now();
  const add = (type, text) => reasons.push(`${stepNo++}. [${ts}] ${type}: ${text}`);

  add("INIT", `Evaluation started for agent "${agent.name}" (${agent.agent_id}). Requested by ${requester}.`);

  const finMode = agent.financial_limit_mode || "approval_threshold";
  const finModeLabel = FINANCIAL_LIMIT_MODE_LABELS[finMode] || finMode;
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
    const matched = (policies || []).filter((p) => policyMatches(p, { action_type, target_system, amount_usd, params }, exfil));
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
  let verdictReason = "Within passport and no blocking policy matched.";

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
    verdictReason = blockReason;
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
      verdictReason = `${approvalReasons.join("; ")} — human approval required.`;
      add("DECISION", "Verdict: APPROVAL REQUIRED. Action held pending human review.");
    } else {
      verdictReason = "Within passport and no policy matched; executed.";
      add("DECISION", "Verdict: ALLOW. Action within passport; executed.");
    }
  }

  return {
    decision, status, reasons, matchedList, decisivePolicy, blast, reversibility,
    alertOwner, downgrade, prevAuto, newAuto, financialLimitMode: finMode,
    blockReason, verdictReason, exfil,
  };
}

/** Builds the ActionRecord payload for one evaluation. */
export function buildActionRecordPayload({ agent, action, result, source, requestedBy, requestedViaKey = null, requestUid = generateRequestUid("ACT") }) {
  const blocked = result.decision === "blocked";
  return {
    agent_id: agent.agent_id,
    agent_name: agent.name,
    action_type: action.action_type,
    target_system: action.target_system,
    amount_usd: Number(action.amount_usd || 0),
    params: action.params || {},
    request_uid: requestUid,
    environment: action.environment || "prod",
    scope_type: "single_execution",
    approval_expires_at: result.decision === "approval_required" ? new Date(Date.now() + 72 * 3600 * 1000).toISOString() : null,
    blast_radius_score: blocked ? 5 : result.blast,
    reversibility: blocked ? "irreversible" : result.reversibility,
    decision: result.decision,
    status: result.status,
    requested_by: requestedBy,
    policy_matches: result.matchedList,
    policy_matched_name: result.decisivePolicy?.name || null,
    policy_matched_priority: result.decisivePolicy?.priority ?? null,
    financial_limit_mode: result.financialLimitMode,
    alert_owner: result.alertOwner,
    autonomy_downgraded: result.downgrade,
    previous_autonomy_level: result.prevAuto,
    new_autonomy_level: blocked ? result.newAuto : result.prevAuto,
    decided_by: result.decision === "allow" ? AUTO_ALLOW_ACTOR : null,
    decided_date: result.decision === "allow" ? now() : null,
    reasons: result.reasons,
    source,
    requested_via_key: requestedViaKey,
  };
}

/* ==========================================================================
   Agent key credentials
   Shared by enforce, enforce-status and agent-keys.
   ========================================================================= */

export const KEY_DENIED = "Invalid or revoked API key";
export const KEY_EXPIRED = "API key expired";
export const KEY_BAD_EXPIRY = "Invalid key expiration";

export interface KeyRecord {
  status?: string;
  expires_at?: string | null;
}

export type KeyAuthorization =
  | { authorized: true }
  | { authorized: false; status: number; error: string };

/**
 * Decides whether a stored key record authorizes a runtime call.
 *
 * Fails closed: a key that is missing, not `active`, or whose expiration cannot
 * be understood is refused. An `expires_at` left unset (null / undefined / "")
 * marks a non-expiring key and is allowed.
 *
 * `nowMs` is injectable so the expiration boundary can be tested directly.
 */
export function evaluateKeyAuthorization(key: KeyRecord | null | undefined, nowMs: number = Date.now()): KeyAuthorization {
  if (!key || String(key.status || "") !== "active") {
    return { authorized: false, status: 401, error: KEY_DENIED };
  }

  const raw = key.expires_at;
  if (raw === null || raw === undefined || raw === "") return { authorized: true };

  const expiresAt = new Date(raw as string).getTime();
  if (!Number.isFinite(expiresAt)) {
    return { authorized: false, status: 401, error: KEY_BAD_EXPIRY };
  }
  // Expired, or expiring at exactly this instant.
  if (expiresAt <= nowMs) {
    return { authorized: false, status: 401, error: KEY_EXPIRED };
  }

  return { authorized: true };
}

/** SHA-256 hex digest — the only form of a key this app stores. */
export async function hashApiKey(rawKey: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}