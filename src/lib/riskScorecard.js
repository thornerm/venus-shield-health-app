// Venus Shield AI Risk Scorecard — methodology data.
// Control status reflects what is implemented in this product today.
// Frameworks are listed as "supports evidence for", never as a certification claim.

export const STATUS = {
  implemented: { label: "Implemented", score: 1, className: "bg-allow/10 text-allow border-allow/30" },
  partial: { label: "Partial", score: 0.5, className: "bg-review/10 text-review border-review/30" },
  gap: { label: "Gap", score: 0, className: "bg-blocked/10 text-blocked border-blocked/30" },
};

export const AUDIENCES = {
  ciso: "CISO",
  gc: "General Counsel",
  cco: "Chief Compliance Officer",
};

export const DOMAINS = [
  {
    id: "identity",
    name: "Agent Identity & Access",
    weight: 20,
    controls: [
      { name: "Agent passport registry", status: "implemented", detail: "Every agent has a registered passport: owner, purpose, authorized systems, limits, expiry.", audience: ["ciso", "cco"], frameworks: ["NIST AI RMF: Govern", "ISO 42001"] },
      { name: "Per-agent runtime credentials", status: "implemented", detail: "Keys bound to one agent, SHA-256 hashed at rest, shown once, revocable, optional expiry.", audience: ["ciso"], frameworks: ["SOC 2 CC6", "ISO 27001"] },
      { name: "Least-privilege system scope", status: "implemented", detail: "Actions against systems outside the passport are blocked.", audience: ["ciso"], frameworks: ["SOC 2 CC6"] },
      { name: "Key rotation automation", status: "gap", detail: "Rotation is manual revoke and reissue. No scheduled rotation.", audience: ["ciso"], frameworks: ["SOC 2 CC6"] },
    ],
  },
  {
    id: "enforcement",
    name: "Pre-Action Enforcement",
    weight: 30,
    controls: [
      { name: "Central policy engine", status: "implemented", detail: "One shared evaluator for console and runtime; blocked beats approval beats allow.", audience: ["ciso", "cco"], frameworks: ["NIST AI RMF: Manage", "EU AI Act Art. 9"] },
      { name: "Prohibited-action and exfiltration blocks", status: "implemented", detail: "Hard blocks before execution, independent of agent behavior.", audience: ["ciso", "gc"], frameworks: ["NIST AI RMF: Manage"] },
      { name: "Financial limits (threshold or hard cap)", status: "implemented", detail: "Per-agent USD limits either force approval or block outright.", audience: ["cco", "gc"], frameworks: ["SOX ITGC", "NIST AI RMF: Manage"] },
      { name: "Autonomy ratchet", status: "implemented", detail: "A blocked action downgrades the agent to restricted; recovery is a manual admin act.", audience: ["ciso", "cco"], frameworks: ["EU AI Act Art. 14"] },
      { name: "Rate limiting and quotas", status: "gap", detail: "No per-key rate limits beyond platform defaults.", audience: ["ciso"], frameworks: ["SOC 2 A1"] },
    ],
  },
  {
    id: "oversight",
    name: "Human Oversight & Approval",
    weight: 20,
    controls: [
      { name: "Approval queue for high-risk actions", status: "implemented", detail: "Single-execution approvals with a 72-hour window.", audience: ["cco", "gc"], frameworks: ["EU AI Act Art. 14", "NIST AI RMF: Govern"] },
      { name: "Admin-only decisions, no self-approval", status: "implemented", detail: "Only admins decide; requesters cannot approve their own request.", audience: ["cco", "gc"], frameworks: ["SOC 2 CC5", "SOX ITGC"] },
      { name: "Escalation and reminders", status: "gap", detail: "No reminder or escalation when a request waits.", audience: ["cco"], frameworks: ["NIST AI RMF: Govern"] },
    ],
  },
  {
    id: "audit",
    name: "Audit & Accountability",
    weight: 20,
    controls: [
      { name: "Reasoning trace on every decision", status: "implemented", detail: "Each evaluation stores the matched policies, blast radius, reversibility and a numbered trace.", audience: ["gc", "cco"], frameworks: ["EU AI Act Art. 12", "ISO 42001"] },
      { name: "Decision history and attribution", status: "implemented", detail: "Approvals and denials are attributed to the signed-in user.", audience: ["gc", "cco"], frameworks: ["SOC 2 CC7"] },
      { name: "Tamper-evident log / SIEM streaming", status: "gap", detail: "Audit lives in application records; no hash chain or external streaming.", audience: ["ciso", "gc"], frameworks: ["SOC 2 CC7", "ISO 27001"] },
      { name: "Compliance report export", status: "partial", detail: "CSV and PDF reporting exists; no scheduled regulator-ready packs.", audience: ["cco"], frameworks: ["ISO 42001"] },
    ],
  },
  {
    id: "platform",
    name: "Data & Platform Security",
    weight: 10,
    controls: [
      { name: "Role-based row-level security", status: "implemented", detail: "Policies and keys are admin-only; other records restricted to signed-in roles.", audience: ["ciso"], frameworks: ["SOC 2 CC6"] },
      { name: "Authenticated access to all screens", status: "implemented", detail: "Layout-level auth guard on every route.", audience: ["ciso"], frameworks: ["SOC 2 CC6"] },
      { name: "Network hardening (mTLS, IP allowlist)", status: "gap", detail: "Standard HTTPS only on runtime endpoints.", audience: ["ciso"], frameworks: ["ISO 27001"] },
    ],
  },
];

// Dev team maturity: self-assessed 1 (ad hoc) to 5 (optimized).
export const MATURITY_LEVELS = [
  { value: 1, label: "1 - Ad hoc" },
  { value: 2, label: "2 - Repeatable" },
  { value: 3, label: "3 - Defined" },
  { value: 4, label: "4 - Measured" },
  { value: 5, label: "5 - Optimized" },
];

export const MATURITY_DIMENSIONS = [
  { id: "sdlc", name: "Secure SDLC for agents", question: "Are agent prompts, tools and permissions code-reviewed and versioned before release?" },
  { id: "testing", name: "Testing and red-teaming", question: "Are agents tested for prompt injection, tool misuse and policy bypass before and after release?" },
  { id: "change", name: "Change management", question: "Are passport and policy changes reviewed, approved and traceable to a person?" },
  { id: "incident", name: "Incident response", question: "Is there a rehearsed playbook to revoke keys, downgrade autonomy and notify stakeholders?" },
  { id: "monitoring", name: "Monitoring and ownership", question: "Does every agent have a named owner and monitored runtime health, with alerts that someone acts on?" },
  { id: "training", name: "Training and accountability", question: "Do developers and approvers understand agent risk and their decision responsibilities?" },
];

export const DEFAULT_MATURITY = { sdlc: 3, testing: 2, change: 3, incident: 2, monitoring: 3, training: 2 };

export const BANDS = [
  { min: 85, label: "Strong", className: "text-allow" },
  { min: 65, label: "Managed", className: "text-info" },
  { min: 40, label: "Developing", className: "text-review" },
  { min: 0, label: "Exposed", className: "text-blocked" },
];

export const bandFor = (score) => BANDS.find((b) => score >= b.min);

export function domainScore(domain) {
  const total = domain.controls.reduce((s, c) => s + STATUS[c.status].score, 0);
  return Math.round((total / domain.controls.length) * 100);
}

export function controlsScore() {
  const weighted = DOMAINS.reduce((s, d) => s + domainScore(d) * d.weight, 0);
  const weights = DOMAINS.reduce((s, d) => s + d.weight, 0);
  return Math.round(weighted / weights);
}

export function maturityScore(values) {
  const sum = MATURITY_DIMENSIONS.reduce((s, d) => s + (values[d.id] || 1), 0);
  return Math.round(((sum / MATURITY_DIMENSIONS.length - 1) / 4) * 100);
}

// Overall readiness: 60% architecture controls, 40% team maturity.
export const WEIGHTS = { controls: 60, maturity: 40 };
export const overallScore = (controls, maturity) =>
  Math.round((controls * WEIGHTS.controls + maturity * WEIGHTS.maturity) / 100);