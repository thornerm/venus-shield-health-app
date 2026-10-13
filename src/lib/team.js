// The team model reconciles the app's registered users with the human decisions
// recorded in governance records. Attribution is stored as "Name <email>", so a
// decision is linked to a member by matching the email inside it.

export function parseActor(value) {
  const str = String(value ?? "").trim();
  if (!str) return { name: "", email: "" };
  const match = str.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: str, email: str.includes("@") ? str.toLowerCase() : "" };
}

export function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function latestOf(events) {
  const times = events.map((e) => new Date(e.when || 0).getTime()).filter((t) => !isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

function decisionEvents({ actions, requests }) {
  const events = [];
  for (const a of actions) {
    if (!a.decided_by) continue;
    events.push({
      actor: parseActor(a.decided_by),
      when: a.decided_date || a.updated_date || a.created_date,
      outcome: a.status,
      kind: "action",
    });
  }
  for (const r of requests) {
    if (!r.decided_by) continue;
    events.push({
      actor: parseActor(r.decided_by),
      when: r.decided_date || r.updated_date || r.created_date,
      outcome: r.status,
      kind: "passport",
    });
  }
  return events;
}

export function deriveTeam({ users = [], actions = [], requests = [], currentUserId = null } = {}) {
  const events = decisionEvents({ actions, requests });

  const byActor = new Map();
  for (const e of events) {
    const key = e.actor.email || e.actor.name.toLowerCase();
    if (!key) continue;
    if (!byActor.has(key)) byActor.set(key, { name: e.actor.name, email: e.actor.email, events: [] });
    byActor.get(key).events.push(e);
  }

  const memberEmails = new Set(users.map((u) => String(u.email || "").toLowerCase()).filter(Boolean));

  const members = users.map((u) => {
    const record = byActor.get(String(u.email || "").toLowerCase());
    const own = record ? [...record.events] : [];
    return {
      user_id: u.id,
      name: u.full_name || u.email || "Unnamed member",
      email: u.email || "",
      role: u.role || "user",
      isCurrent: !!currentUserId && u.id === currentUserId,
      status: own.length > 0 ? "active" : "idle",
      statusLabel: own.length > 0 ? "Active" : "No activity",
      lastActive: latestOf(own),
      decisions: own.length,
      approvals: own.filter((e) => e.outcome === "approved").length,
      denials: own.filter((e) => e.outcome === "denied").length,
      actionDecisions: own.filter((e) => e.kind === "action").length,
      passportDecisions: own.filter((e) => e.kind === "passport").length,
      lastDecision: latestOf(own),
    };
  }).sort((a, b) => b.decisions - a.decisions || a.name.localeCompare(b.name));

  const unlinked = [...byActor.entries()]
    .filter(([key]) => !memberEmails.has(key))
    .map(([key, record]) => ({
      email: record.email || key,
      name: record.name,
      decisions: record.events.length,
      lastDecision: latestOf(record.events),
    }))
    .sort((a, b) => b.decisions - a.decisions || a.name.localeCompare(b.name));

  return {
    members,
    unlinked,
    totals: {
      members: members.length,
      admins: members.filter((m) => m.role === "admin").length,
      decisions: events.length,
      denials: events.filter((e) => e.outcome === "denied").length,
      unlinked: unlinked.length,
    },
  };
}