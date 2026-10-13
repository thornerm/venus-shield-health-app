// The alert queue is derived live from real governance records: blocked actions,
// autonomy ratchets, decisions still owed, and passport reviews. Nothing is
// stored, so an alert clears itself as soon as its underlying record changes.

export const SEVERITY_META = {
  critical: { label: "Critical", rank: 0, cls: "border-blocked/30 bg-blocked/10 text-blocked" },
  high: { label: "High", rank: 1, cls: "border-review/30 bg-review/10 text-review" },
  medium: { label: "Medium", rank: 2, cls: "border-info/30 bg-info/10 text-info" },
};

export const ALERT_KINDS = [
  { value: "all", label: "All Alerts" },
  { value: "blocked", label: "Blocked Actions" },
  { value: "downgrade", label: "Autonomy Downgrades" },
  { value: "approval", label: "Awaiting Decision" },
  { value: "passport", label: "Passport Reviews" },
  { value: "denied", label: "Denied Actions" },
];

function lastReason(record) {
  const reasons = record?.reasons || [];
  return reasons.length ? String(reasons[reasons.length - 1]) : "";
}

/** Passport state worth a human look, or null when the passport is fine. */
export function passportAlert(agent) {
  const status = agent.review_status || "pending_review";
  const expiresAt = agent.passport_expires_at ? new Date(agent.passport_expires_at).getTime() : null;
  const daysLeft = expiresAt != null && !isNaN(expiresAt) ? Math.round((expiresAt - Date.now()) / 86400000) : null;

  if (status === "expired" || (daysLeft !== null && daysLeft < 0)) {
    return { severity: "critical", title: "Passport expired", detail: `${agent.name} is operating on an expired passport and should be re-reviewed or revoked.` };
  }
  if (status === "needs_attention") {
    return { severity: "high", title: "Passport needs attention", detail: `${agent.name} was flagged for review after governance exceptions.` };
  }
  if (daysLeft !== null && daysLeft < 30) {
    return { severity: "high", title: `Passport expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, detail: `${agent.name} must be re-reviewed before its passport lapses.` };
  }
  if (status === "pending_review") {
    return { severity: "medium", title: "Passport review pending", detail: `${agent.name} has not been reviewed by a governance approver yet.` };
  }
  return null;
}

export function deriveAlerts({ actions = [], requests = [], agents = [] } = {}) {
  const alerts = [];

  for (const a of actions) {
    if (a.decision === "blocked") {
      alerts.push({
        id: `blocked:${a.id}`,
        kind: "blocked",
        severity: "critical",
        title: `Blocked: ${a.action_type}`,
        detail: lastReason(a) || `${a.agent_name} attempted ${a.action_type} against ${a.target_system}.`,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
      });
    }

    if (a.autonomy_downgraded) {
      alerts.push({
        id: `downgrade:${a.id}`,
        kind: "downgrade",
        severity: "high",
        title: `Autonomy ratcheted to ${a.new_autonomy_level || "restricted"}`,
        detail: `${a.agent_name} was downgraded from ${a.previous_autonomy_level || "standard"} after ${a.action_type} was blocked against ${a.target_system}.`,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
      });
    }

    if (a.status === "denied") {
      alerts.push({
        id: `denied:${a.id}`,
        kind: "denied",
        severity: "high",
        title: `Denied: ${a.action_type}`,
        detail: `${a.decided_by || "A reviewer"} refused this ${a.action_type} request from ${a.agent_name}.`,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.decided_date || a.created_date,
        route: "/audit",
      });
    }

    if (a.status === "pending_approval") {
      const overdue = a.deadline && new Date(a.deadline).getTime() < Date.now();
      alerts.push({
        id: `approval:${a.id}`,
        kind: "approval",
        severity: overdue ? "critical" : "high",
        title: `Awaiting decision: ${a.action_type}`,
        detail: overdue
          ? `${a.agent_name} is past its decision deadline against ${a.target_system}.`
          : `${a.agent_name} is held for human approval against ${a.target_system}.`,
        agent: a.agent_name,
        agent_id: a.agent_id,
        system: a.target_system,
        when: a.created_date,
        route: "/approvals",
      });
    }
  }

  for (const r of requests) {
    if (r.status !== "pending") continue;
    const overdue = r.deadline && new Date(r.deadline).getTime() < Date.now();
    alerts.push({
      id: `approval:${r.id}`,
      kind: "approval",
      severity: overdue ? "critical" : "high",
      title: `Passport awaiting decision: ${r.name}`,
      detail: `${r.request_type === "modified_passport" ? "A passport change" : "A new passport"} requested by ${r.requested_by || r.owner_name || "an owner"}.`,
      agent: r.name,
      agent_id: r.agent_id,
      system: null,
      when: r.created_date,
      route: "/approvals",
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
      agent: ag.name,
      agent_id: ag.agent_id,
      system: null,
      when: ag.updated_date || ag.created_date,
      route: `/passports/${ag.id}`,
    });
  }

  return alerts.sort((a, b) =>
    (SEVERITY_META[a.severity]?.rank ?? 9) - (SEVERITY_META[b.severity]?.rank ?? 9)
    || new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime());
}