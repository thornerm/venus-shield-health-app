// The alert queue is derived live from real governance records: blocked actions,
// autonomy ratchets, decisions still owed, and passport reviews. Nothing is
// stored, so an alert clears itself as soon as its underlying record changes.

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    rank: 0,
    cls: "border-blocked/30 bg-blocked/10 text-blocked",
    text: "text-blocked",
    dot: "bg-blocked",
    hint: "A hard block or a decision already past its deadline",
  },
  high: {
    label: "High",
    rank: 1,
    cls: "border-high/30 bg-high/10 text-high",
    text: "text-high",
    dot: "bg-high",
    hint: "A refusal, an autonomy ratchet, or a deadline inside 24 hours",
  },
  medium: {
    label: "Medium",
    rank: 2,
    cls: "border-review/30 bg-review/10 text-review",
    text: "text-review",
    dot: "bg-review",
    hint: "Held for a human decision, with time still on the clock",
  },
  low: {
    label: "Low",
    rank: 3,
    cls: "border-info/30 bg-info/10 text-info",
    text: "text-info",
    dot: "bg-info",
    hint: "Housekeeping: a passport that has not been reviewed yet",
  },
};

/** Chip treatments for the workflow state recorded against each alert. */
export const STATE_TONE = {
  blocked: "border-blocked/30 bg-blocked/10 text-blocked",
  review: "border-review/30 bg-review/10 text-review",
  info: "border-info/30 bg-info/10 text-info",
  allow: "border-allow/30 bg-allow/10 text-allow",
  muted: "border-border bg-surface/60 text-muted-foreground",
};

export const ALERT_KINDS = [
  { value: "all", label: "All Alerts" },
  { value: "blocked", label: "Blocked Actions" },
  { value: "downgrade", label: "Autonomy Downgrades" },
  { value: "approval", label: "Awaiting Decision" },
  { value: "passport", label: "Passport Reviews" },
  { value: "denied", label: "Denied Actions" },
];

/** The final reasoning-trace line, stripped of its trace index and timestamp. */
function lastReason(record) {
  const reasons = record?.reasons || [];
  if (!reasons.length) return "";
  return String(reasons[reasons.length - 1])
    .replace(/^\s*\d+\.\s*\[[^\]]+\]\s*/, "")
    .replace(/^DECISION:\s*/i, "")
    .trim();
}

/** The policy that decided the record, falling back to the first it matched. */
function policyOf(record) {
  if (!record) return null;
  if (record.policy_matched_name) return record.policy_matched_name;
  const first = (record.policy_matches || [])[0];
  return first?.name || null;
}

/** How urgent a held decision is, judged by its own deadline. */
function deadlineSeverity(deadline) {
  if (!deadline) return "medium";
  const ms = new Date(deadline).getTime() - Date.now();
  if (isNaN(ms)) return "medium";
  if (ms < 0) return "critical";
  if (ms < 86400000) return "high";
  return "medium";
}

function deadlineState(deadline) {
  if (!deadline) return { label: "Awaiting decision", tone: "review" };
  const ms = new Date(deadline).getTime() - Date.now();
  if (isNaN(ms)) return { label: "Awaiting decision", tone: "review" };
  if (ms < 0) return { label: "Overdue", tone: "blocked" };
  if (ms < 86400000) return { label: "Due soon", tone: "review" };
  return { label: "Awaiting decision", tone: "review" };
}

/** Passport state worth a human look, or null when the passport is fine. */
export function passportAlert(agent) {
  const status = agent.review_status || "pending_review";
  const expiresAt = agent.passport_expires_at ? new Date(agent.passport_expires_at).getTime() : null;
  const daysLeft = expiresAt != null && !isNaN(expiresAt) ? Math.round((expiresAt - Date.now()) / 86400000) : null;

  if (status === "expired" || (daysLeft !== null && daysLeft < 0)) {
    return {
      severity: "critical",
      title: "Passport expired",
      detail: `${agent.name} is operating on an expired passport and should be re-reviewed or revoked.`,
      state: { label: "Expired", tone: "blocked" },
    };
  }
  if (status === "needs_attention") {
    return {
      severity: "high",
      title: "Passport needs attention",
      detail: `${agent.name} was flagged for review after governance exceptions.`,
      state: { label: "Needs attention", tone: "review" },
    };
  }
  if (daysLeft !== null && daysLeft < 30) {
    return {
      severity: "high",
      title: `Passport expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      detail: `${agent.name} must be re-reviewed before its passport lapses.`,
      state: { label: "Expiring soon", tone: "review" },
    };
  }
  if (status === "pending_review") {
    return {
      severity: "low",
      title: "Passport review pending",
      detail: `${agent.name} has not been reviewed by a governance approver yet.`,
      state: { label: "Review pending", tone: "info" },
    };
  }
  return null;
}

export function deriveAlerts({ actions = [], requests = [], agents = [] } = {}) {
  const alerts = [];

  for (const a of actions) {
    const policy = policyOf(a);

    if (a.decision === "blocked") {
      alerts.push({
        id: `blocked:${a.id}`,
        kind: "blocked",
        severity: "critical",
        title: `Blocked: ${a.action_type}`,
        detail: lastReason(a) || `${a.agent_name} attempted ${a.action_type} against ${a.target_system}.`,
        policy,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
        state: { label: "Blocked", tone: "blocked" },
      });
    }

    if (a.autonomy_downgraded) {
      alerts.push({
        id: `downgrade:${a.id}`,
        kind: "downgrade",
        severity: "high",
        title: `Autonomy ratcheted to ${a.new_autonomy_level || "restricted"}`,
        detail: `${a.agent_name} was downgraded from ${a.previous_autonomy_level || "standard"} after ${a.action_type} was blocked against ${a.target_system}.`,
        policy,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
        state: { label: "Applied", tone: "review" },
      });
    }

    if (a.status === "denied") {
      alerts.push({
        id: `denied:${a.id}`,
        kind: "denied",
        severity: "high",
        title: `Denied: ${a.action_type}`,
        detail: `${a.decided_by || "A reviewer"} refused this ${a.action_type} request from ${a.agent_name}.`,
        policy,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
        state: { label: "Denied", tone: "blocked" },
      });
    }

    if (a.status === "pending_approval") {
      alerts.push({
        id: `approval:${a.id}`,
        kind: "approval",
        severity: deadlineSeverity(a.deadline),
        title: `Awaiting decision: ${a.action_type}`,
        detail: `${a.agent_name} is held for human approval against ${a.target_system}.`,
        policy,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.created_date,
        route: "/approvals",
        state: deadlineState(a.deadline),
      });
    }
  }

  for (const r of requests) {
    if (r.status !== "pending") continue;
    alerts.push({
      id: `approval:${r.id}`,
      kind: "approval",
      severity: deadlineSeverity(r.deadline),
      title: `Passport awaiting decision: ${r.name}`,
      detail: `${r.request_type === "modified_passport" ? "A passport change" : "A new passport"} requested by ${r.requested_by || r.owner_name || "an owner"}.`,
      policy: null,
      agent: r.name,
      agent_id: r.agent_id,
      system: null,
      when: r.created_date,
      route: "/approvals",
      state: deadlineState(r.deadline),
    });
  }

  for (const ag of agents) {
    const found = passportAlert(ag);
    if (!found) continue;
    alerts.push({
      id: `passport:${ag.id}`,
      kind: "passport",
      severity: found.severity,
      title: found.title,
      detail: found.detail,
      policy: null,
      agent: ag.name,
      agent_id: ag.agent_id,
      system: null,
      when: ag.updated_date || ag.created_date,
      route: `/passports/${ag.id}`,
      state: found.state,
    });
  }

  return alerts.sort((a, b) =>
    (SEVERITY_META[a.severity]?.rank ?? 9) - (SEVERITY_META[b.severity]?.rank ?? 9)
    || new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime());
}