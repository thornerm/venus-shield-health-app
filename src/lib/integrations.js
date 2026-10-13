// The integrations landscape is derived from governance data already on record:
// the systems each passport authorizes (ShieldAgent.systems), the systems
// policies name (ShieldPolicy.match.target_systems), and the systems that have
// actually been acted on (ActionRecord.target_system). Nothing is stored twice.

const SYSTEM_LABELS = {
  billing: "Billing",
  crm: "CRM",
  email: "Email",
  helpdesk: "Helpdesk",
  internal_kb: "Internal KB",
  linkedin: "LinkedIn",
  governance: "Governance",
  external_endpoint: "External Endpoint",
  audit_trail: "Audit Trail",
  github: "GitHub",
  slack: "Slack",
  salesforce: "Salesforce",
  stripe: "Stripe",
};

const SYSTEM_DESCRIPTIONS = {
  billing: "Payment processing, refunds, and invoicing.",
  crm: "Customer records and deal pipeline.",
  email: "Outbound messaging and notifications.",
  helpdesk: "Support tickets and customer conversations.",
  internal_kb: "Internal knowledge base and documentation.",
  linkedin: "Social publishing and profile data.",
  governance: "Venus Shield passport and policy services.",
  external_endpoint: "Third-party HTTP endpoints and webhooks.",
  audit_trail: "Immutable governance event history.",
};

export function systemKey(raw) {
  return String(raw ?? "").trim().toLowerCase();
}

export function systemLabel(key) {
  if (!key) return "—";
  if (SYSTEM_LABELS[key]) return SYSTEM_LABELS[key];
  return key.split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function systemDescription(key) {
  return SYSTEM_DESCRIPTIONS[key] || "Connected system.";
}

/** Every system name an active policy claims to govern. */
export function policySystemKeys(policy) {
  const m = (policy && policy.match) || {};
  const raw = Array.isArray(m.target_systems) ? m.target_systems : m.target_system ? [m.target_system] : [];
  return raw.map(systemKey).filter(Boolean);
}

export function deriveSystems({ agents = [], actions = [], policies = [] } = {}) {
  const map = new Map();

  const ensure = (raw) => {
    const key = systemKey(raw);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: systemLabel(key),
        description: systemDescription(key),
        authorizedAgents: [],
        authorizedAgentNames: [],
        observedAgents: [],
        policies: [],
        operations: {},
        records: [],
        total: 0,
        allow: 0,
        review: 0,
        blocked: 0,
        maxBlast: 0,
        lastActivity: null,
      });
    }
    return map.get(key);
  };

  for (const ag of agents) {
    for (const raw of ag.systems || []) {
      const s = ensure(raw);
      if (!s || s.authorizedAgents.includes(ag.agent_id)) continue;
      s.authorizedAgents.push(ag.agent_id);
      s.authorizedAgentNames.push(ag.name || ag.agent_id);
    }
  }

  for (const p of policies) {
    if (p.is_active === false) continue;
    for (const key of policySystemKeys(p)) {
      const s = ensure(key);
      if (s && !s.policies.some((x) => x.id === p.id)) {
        s.policies.push({ id: p.id, name: p.name, required_decision: p.required_decision });
      }
    }
  }

  for (const a of actions) {
    const s = ensure(a.target_system);
    if (!s) continue;
    s.total++;
    if (a.decision === "allow") s.allow++;
    else if (a.decision === "approval_required") s.review++;
    else if (a.decision === "blocked") s.blocked++;
    s.operations[a.action_type] = (s.operations[a.action_type] || 0) + 1;
    if (!s.observedAgents.includes(a.agent_id)) s.observedAgents.push(a.agent_id);
    s.records.push(a);
    const t = new Date(a.created_date || 0).getTime();
    if (!isNaN(t) && (s.lastActivity == null || t > s.lastActivity)) s.lastActivity = t;
    const blast = Number(a.blast_radius_score) || 0;
    if (blast > s.maxBlast) s.maxBlast = blast;
  }

  return [...map.values()]
    .map((s) => ({
      key: s.key,
      label: s.label,
      description: s.description,
      authorizedAgents: s.authorizedAgents,
      authorizedAgentNames: s.authorizedAgentNames,
      observedAgents: s.observedAgents,
      agentsInvolved: [...new Set([...s.authorizedAgents, ...s.observedAgents])],
      policies: s.policies,
      total: s.total,
      allow: s.allow,
      review: s.review,
      blocked: s.blocked,
      maxBlast: s.maxBlast,
      hasActivity: s.total > 0,
      lastActivityIso: s.lastActivity ? new Date(s.lastActivity).toISOString() : null,
      operations: Object.entries(s.operations)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      records: [...s.records].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}