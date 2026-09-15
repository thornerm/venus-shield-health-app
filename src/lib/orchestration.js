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

export function buildInitialTrace(prompt, customerConfig) {
  const secrets = prompt.required_secrets || [];
  return [
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