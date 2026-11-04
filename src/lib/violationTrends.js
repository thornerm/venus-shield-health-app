// Policy violations over the last 30 days, derived from recorded actions.
// A violation is a hard block, a human denial, or an autonomy ratchet.

export const DAYS = 30;

export const VIOLATION_SERIES = [
  { key: "blocked", label: "Blocked", color: "#EF4444" },
  { key: "denied", label: "Denied", color: "#F97316" },
  { key: "downgrade", label: "Autonomy downgrades", color: "#F59E0B" },
];

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export function buildViolationTrends(actions = []) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DAYS - 1));

  const buckets = new Map();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(dayKey(d), {
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      blocked: 0, denied: 0, downgrade: 0,
    });
  }

  const byAgent = {};
  const byPolicy = {};
  let total = 0;
  let prior = 0;
  const priorStart = new Date(start);
  priorStart.setDate(priorStart.getDate() - DAYS);

  for (const a of actions) {
    const when = new Date(a.decided_date || a.created_date);
    if (isNaN(when.getTime())) continue;
    const kinds = [];
    if (a.decision === "blocked") kinds.push("blocked");
    if (a.status === "denied") kinds.push("denied");
    if (a.autonomy_downgraded) kinds.push("downgrade");
    if (!kinds.length) continue;

    if (when < start) {
      if (when >= priorStart) prior += kinds.length;
      continue;
    }
    const bucket = buckets.get(dayKey(when));
    if (!bucket) continue;
    for (const k of kinds) bucket[k]++;
    total += kinds.length;
    const agent = a.agent_name || a.agent_id || "Unknown";
    byAgent[agent] = (byAgent[agent] || 0) + kinds.length;
    const policy = a.policy_matched_name || a.policy_matches?.[0]?.name;
    if (policy) byPolicy[policy] = (byPolicy[policy] || 0) + kinds.length;
  }

  const top = (obj) =>
    Object.entries(obj).map(([name, count]) => ({ name, count }))
      .sort((x, y) => y.count - x.count).slice(0, 6);

  const daily = [...buckets.values()];
  const peak = daily.reduce((m, d) => {
    const n = d.blocked + d.denied + d.downgrade;
    return n > m.count ? { date: d.date, count: n } : m;
  }, { date: null, count: 0 });

  return { daily, total, prior, peak, topAgents: top(byAgent), topPolicies: top(byPolicy) };
}