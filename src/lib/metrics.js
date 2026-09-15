// Shared metric definitions and computations for Dashboard, Agent Performance,
// Audit Trail, and Report Export. Keeps verdicts (governance decision) separate
// from workflow status (lifecycle state) so totals reconcile across pages.

export const ENVIRONMENTS = [
  { value: "all", label: "All Environments" },
  { value: "dev", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Production" },
];

export const TIME_RANGES = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const VERDICT_META = {
  allow: { label: "Allow", tone: "allow", description: "Permitted and executed within the agent's passport on the first pass." },
  approval_required: { label: "Approval Required", tone: "review", description: "Held for human review before it could execute." },
  blocked: { label: "Blocked", tone: "blocked", description: "Denied outright by a hard prohibition, unauthorized system, or blocking policy." },
};

export const STATUS_META = {
  executed: { label: "Executed", tone: "allow" },
  pending_approval: { label: "Pending Approval", tone: "review" },
  approved: { label: "Approved", tone: "allow" },
  denied: { label: "Denied", tone: "blocked" },
  blocked: { label: "Blocked", tone: "blocked" },
};

export const METRIC_DEFINITIONS = {
  firstPassAllowRate: "Share of evaluated actions allowed on the first pass with no human review. Actions still pending or already blocked are not counted as first-pass allows.",
  executionSuccessRate: "Share of executed actions with a confirmed successful outcome. Only shown when confirmed execution outcomes exist; otherwise shown as Unknown.",
  blastRadius: "Potential impact radius of an action (1 = isolated, 5 = enterprise-wide), scored from amount, target system, and data sensitivity — independent of the verdict.",
  inherentExposure: "Potential damage the agent could do given its autonomy, financial limit, and system reach — independent of what it has actually done.",
  observedBehavior: "What the agent has actually done: blocked, denied, and pending actions from real evaluations.",
  protectiveControls: "Guardrails that reduce risk: restricted or standard autonomy, hard financial caps, and prohibited-action lists. Restricted autonomy never raises risk on its own.",
  registeredPassports: "Agent passports provisioned in the registry, whether or not they have any activity yet.",
  monitoredAgents: "Registered passports that have at least one evaluated action — i.e. actively generating governed activity.",
};

export function isSample(r) {
  return !!(r && r.is_sample);
}

export function applyEnvFilter(records, env) {
  if (!env || env === "all") return records;
  return records.filter((r) => (r.environment || "prod") === env);
}

export function applyTimeFilter(records, range, dateField = "created_date") {
  if (!range || range === "all") return records;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];
  if (!days) return records;
  const cutoff = Date.now() - days * 86400000;
  return records.filter((r) => new Date(r[dateField] || 0).getTime() >= cutoff);
}

export function applyFilters(records, { env, range } = {}, dateField = "created_date") {
  return applyTimeFilter(applyEnvFilter(records, env), range, dateField);
}

export function verdictCounts(actions) {
  const v = { allow: 0, approval_required: 0, blocked: 0 };
  for (const a of actions) if (v[a.decision] != null) v[a.decision]++;
  return { ...v, total: actions.length };
}

export function statusCounts(actions) {
  const s = { executed: 0, pending_approval: 0, approved: 0, denied: 0, blocked: 0 };
  for (const a of actions) if (s[a.status] != null) s[a.status]++;
  return s;
}

export function requestStatusCounts(requests) {
  const s = { pending: 0, approved: 0, denied: 0 };
  for (const r of requests) if (s[r.status] != null) s[r.status]++;
  return s;
}

export function firstPassAllowRate(actions) {
  const total = actions.length;
  if (!total) return null;
  const allowed = actions.filter((a) => a.decision === "allow").length;
  return Math.round((allowed / total) * 100);
}

export function executionSuccessRate(actions) {
  const confirmed = actions.filter((a) => a.execution_outcome === "succeeded" || a.execution_outcome === "failed");
  if (!confirmed.length) return { rate: null, hasConfirmed: false, succeeded: 0, failed: 0, total: 0 };
  const succeeded = confirmed.filter((a) => a.execution_outcome === "succeeded").length;
  return { rate: Math.round((succeeded / confirmed.length) * 100), hasConfirmed: true, succeeded, failed: confirmed.length - succeeded, total: confirmed.length };
}

export function blastRadiusExplanation(score) {
  const map = {
    1: "1 — Isolated: a single record or user, no downstream impact.",
    2: "2 — Limited: small financial value or a single-system change.",
    3: "3 — Material: significant value ($10k+) or a cross-system effect.",
    4: "4 — Major: high value ($50k+) or broad operational impact.",
    5: "5 — Enterprise-wide: bulk data exfiltration or irreversible mass effect.",
  };
  return map[score] || "Unknown blast radius.";
}

export function ageLabel(createdDate) {
  if (!createdDate) return "—";
  const ms = Date.now() - new Date(createdDate).getTime();
  if (ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function freshnessLabel(records) {
  if (!records.length) return "No data";
  const latest = records.reduce((m, r) => Math.max(m, new Date(r.created_date || 0).getTime()), 0);
  return `Updated ${ageLabel(new Date(latest).toISOString())}`;
}

export function deadlineStatus(deadline) {
  if (!deadline) return { label: "No deadline", tone: "muted" };
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { label: "Overdue", tone: "blocked" };
  if (ms < 86400000) return { label: "Due soon", tone: "review" };
  return { label: "On track", tone: "allow" };
}

export function approvalExpirationStatus(expiresAt) {
  if (!expiresAt) return { label: "No expiration", tone: "muted", expired: false };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 0) return { label: "Expired", tone: "blocked", expired: true };
  if (ms < 86400000) return { label: "Expires soon", tone: "review", expired: false };
  return { label: "Valid", tone: "allow", expired: false };
}

export function generateRequestUid(prefix = "REQ") {
  const yr = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yr}-${rand}`;
}

export function displayUid(record, prefix = "REQ") {
  if (record?.request_uid) return record.request_uid;
  if (!record?.id) return "—";
  return `${prefix}-${String(record.id).slice(-6).toUpperCase()}`;
}

export function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}