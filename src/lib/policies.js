/**
 * Policy presentation helpers.
 *
 * Categories are DERIVED from a policy's stored match criteria and required
 * decision. The ShieldPolicy schema has no category column, and this redesign
 * must not alter the database — so the UI organizes around what the policy
 * actually governs rather than inventing a stored field.
 */
export const POLICY_CATEGORIES = [
  { value: "sensitive", label: "Sensitive Information", description: "Bulk data movement and exfiltration patterns." },
  { value: "financial", label: "Financial Actions", description: "Monetary thresholds and spend limits." },
  { value: "data", label: "Data Access", description: "Outright prohibitions on a data operation." },
  { value: "approval", label: "Human Approval", description: "Actions that always require a human decision." },
  { value: "external", label: "External Integrations", description: "Actions aimed at specific connected systems." },
  { value: "custom", label: "Custom Rules", description: "Action-type specific governance rules." },
];

const CUSTOM = POLICY_CATEGORIES[POLICY_CATEGORIES.length - 1];

/**
 * Most specific criterion wins, so a policy reads under the heading that best
 * describes why it exists.
 */
export function policyCategory(policy) {
  const m = policy?.match || {};
  if (m.exfiltration === true) return "sensitive";
  if (m.min_amount != null && m.min_amount !== "") return "financial";
  if (policy?.required_decision === "blocked") return "data";
  if (policy?.required_decision === "approval_required") return "approval";
  if (Array.isArray(m.target_systems) && m.target_systems.length > 0) return "external";
  return "custom";
}

export function categoryMeta(value) {
  return POLICY_CATEGORIES.find((c) => c.value === value) || CUSTOM;
}

export const MATCH_LABELS = {
  action_types: "Action Types",
  target_systems: "Target Systems",
  min_amount: "Minimum Amount (USD)",
  exfiltration: "Exfiltration Pattern",
};