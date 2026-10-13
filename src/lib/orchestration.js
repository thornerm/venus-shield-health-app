// VenusAI Orchestration — shared metadata and helpers for the job catalog,
// customer configuration, and execution flow.

export const SOURCE_META = {
  venus_official: {
    label: "Venus Official",
    className: "bg-primary/10 text-primary border-primary/30",
    description: "Curated and maintained by VenusAI developers."
  },
  customer: {
    label: "Customer",
    className: "bg-review/10 text-review border-review/30",
    description: "Uploaded and approved by the customer."
  },
  shared_public: {
    label: "Public",
    className: "bg-allow/10 text-allow border-allow/30",
    description: "Shared publicly by other VenusAI customers."
  }
};

export const EXEC_STATUS_META = {
  queued: { label: "Queued", className: "bg-review/10 text-review border-review/30" },
  running: { label: "Running", className: "bg-review/10 text-review border-review/30" },
  completed: { label: "Completed", className: "bg-allow/10 text-allow border-allow/30" },
  failed: { label: "Failed", className: "bg-blocked/10 text-blocked border-blocked/30" }
};

export const TRACE_STATUS_META = {
  completed: { icon: "CheckCircle", className: "text-allow" },
  running: { icon: "Loader", className: "text-review" },
  failed: { icon: "XCircle", className: "text-blocked" },
  skipped: { icon: "MinusCircle", className: "text-muted-foreground" }
};

export const CATEGORIES = [
  "Data Analysis",
  "Code Review",
  "Reporting",
  "Security",
  "Content Generation",
  "Automation",
  "Research"
];

export function generateTaskUid() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JOB-${ts}-${rand}`;
}

export function buildTraceStep(step, status, detail) {
  return {
    step,
    status,
    detail,
    timestamp: new Date().toISOString()
  };
}

export function buildFullPrompt(prompt) {
  let full = prompt.prompt_content || "";
  if (prompt.instructions && prompt.instructions.length > 0) {
    full +=
      "\n\nTask Instructions:\n" +
      prompt.instructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n");
  }
  return full;
}

export function buildInitialTrace(prompt, customerConfig, verdict = null) {
  const secrets = prompt.required_secrets || [];
  return [
    ...(verdict
      ? [
          buildTraceStep(
            "governance_verdict",
            "completed",
            `Verdict "${verdict.decision}" from the shared engine for passport ${
              verdict.record?.agent_name || verdict.agent?.name || "—"
            }: ${verdict.reason || ""}`
          ),
        ]
      : []),
    buildTraceStep(
      "resolve_customer",
      "completed",
      `Resolved customer: ${customerConfig?.customer_name || "default tenant"}`
    ),
    buildTraceStep(
      "fetch_secrets",
      "completed",
      `Retrieved ${secrets.length} secret(s) from app secret store${
        secrets.length ? ": " + secrets.join(", ") : ""
      }`
    ),
    buildTraceStep(
      "resolve_prompt",
      "completed",
      `Loaded prompt template "${prompt.name}" from catalog`
    ),
    buildTraceStep(
      "dispatch",
      "completed",
      `Dispatched to AI agent at ${customerConfig?.ai_agent_endpoint || "default endpoint"}`
    )
  ];
}

export function formatStepLabel(step) {
  return step
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The passport that governs a job dispatch. A job prompt names the agent it runs
 * as (`agent_type`); that name must resolve to an approved passport before the
 * dispatch can be evaluated. No passport means no permission to dispatch.
 */
export function resolveDispatchPassport(prompt, agents = []) {
  const type = String(prompt?.agent_type || "").trim().toLowerCase();
  if (!type) return null;
  const base = type.replace(/-agent$/, "");
  const pool = agents.filter((a) => a.is_active);
  const matches = (a) => `${a.name || ""} ${a.agent_id || ""}`.toLowerCase();
  return (
    pool.find((a) => String(a.agent_id || "").toLowerCase() === type) ||
    pool.find((a) => matches(a).includes(type)) ||
    pool.find((a) => base.length >= 3 && matches(a).includes(base)) ||
    null
  );
}