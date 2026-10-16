import { useEffect, useState } from "react";
import {
  BookOpen, Network, Cpu, GitBranch, KeyRound, ClipboardCheck, Database,
  AlertTriangle, ShieldCheck, Check, X, MinusCircle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import SectionNav from "@/components/handbook/SectionNav";
import FlowDiagram from "@/components/handbook/FlowDiagram";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "System Architecture", icon: Network },
  { id: "engine", label: "Governance Engine", icon: Cpu },
  { id: "flows", label: "Request Flows", icon: GitBranch },
  { id: "credentials", label: "Runtime Credentials", icon: KeyRound },
  { id: "approvals", label: "Approvals & Audit", icon: ClipboardCheck },
  { id: "data", label: "Data Model & Security", icon: Database },
  { id: "limits", label: "Prototype Limits", icon: AlertTriangle },
];

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-semibold text-foreground">{children}</h2>
    </div>
  );
}

function Callout({ tone = "muted", title, children }) {
  const cls = {
    gold: "border-primary/30 bg-primary/5 text-primary",
    allow: "border-allow/30 bg-allow/5 text-allow",
    review: "border-review/30 bg-review/5 text-review",
    blocked: "border-blocked/30 bg-blocked/5 text-blocked",
    muted: "border-border bg-surface text-muted-foreground",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px] leading-relaxed", cls)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:gap-4">
      <div className="w-44 shrink-0 text-[12px] font-medium text-muted-foreground">{k}</div>
      <div className="text-[13px] text-foreground/90">{v}</div>
    </div>
  );
}

function Code({ children }) {
  return <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-primary">{children}</code>;
}

const RUNTIME_FLOW = [
  { label: "Agent / MCP proxy / SDK", sub: "Bearer key", tone: "muted" },
  { label: "enforce", sub: "POST /functions/enforce", tone: "gold" },
  { label: "Key auth", sub: "SHA-256 hash check", tone: "muted" },
  { label: "Passport active?", sub: "reviewed + not expired", tone: "muted" },
  { label: "Governance engine", sub: "evaluateGovernance()", tone: "gold" },
  { label: "ActionRecord", sub: "audit + alert", tone: "muted" },
  { label: "Verdict", sub: "allow / approval / block", tone: "review" },
];

const DECISION_LADDER = [
  { label: "Prohibited action", sub: "passport list", tone: "blocked" },
  { label: "Unauthorized system", sub: "not in passport", tone: "blocked" },
  { label: "Exfiltration pattern", sub: "export + PII/external", tone: "blocked" },
  { label: "Hard cap exceeded", sub: "hard_cap mode", tone: "blocked" },
  { label: "Policy hard block", sub: "decisive policy", tone: "blocked" },
  { label: "Approval required", sub: "threshold / policy / risk", tone: "review" },
  { label: "Allow", sub: "within passport", tone: "allow" },
];

const LIMITS = [
  ["Policy engine", "Policies are entity records matched in-process; no external engine (e.g. OPA) or versioned bundle is wired."],
  ["Key hashing", "Keys are stored as unsalted SHA-256 hashes; rotation is manual revoke + reissue."],
  ["Approval callbacks", "Agents poll enforce-status; there is no signed webhook callback to the agent on decision."],
  ["Approval window", "Fixed at 72 hours; no reminder or escalation workflow is attached."],
  ["Rate limiting", "No per-key rate limiting or quotas beyond the platform's own limits on the enforce endpoint."],
  ["Transport", "No mTLS or IP allowlisting on the runtime endpoints; standard HTTPS only."],
  ["Audit export", "Audit lives in ActionRecord; there is no tamper-evident log or SIEM streaming beyond Reporting."],
  ["Autonomy recovery", "The ratchet is one-way; restoring autonomy is a manual admin action."],
  ["Budgets", "Financial limits are per-agent USD thresholds, not rolling-window budgets."],
];

export default function DevOpsHandbook() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0.1, 0.5, 1] }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DevOps Technical Handbook"
        subtitle="Architecture and governance flow of the Venus Shield prototype — for candidate technical review."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <SectionNav sections={SECTIONS} activeId={active} onNavigate={go} />

        <div className="space-y-6">
          <section id="overview" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={BookOpen}>Overview</SectionTitle>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Venus Shield is a control layer that sits between AI agents and the real-world
                business actions they attempt. Every action an agent wants to take is authenticated,
                evaluated against a passport and policy set, then allowed, held for human approval,
                or blocked — with a full reasoning trace recorded for audit.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Callout tone="gold" title="Control before action">
                  No agent action executes until the governance engine has issued a verdict.
                </Callout>
                <Callout tone="allow" title="One engine">
                  Console and runtime share a single evaluator — verdicts can never disagree.
                </Callout>
                <Callout tone="review" title="Auditable">
                  Every evaluation is persisted as an immutable ActionRecord with a trace.
                </Callout>
              </div>
            </Panel>
          </section>

          <section id="architecture" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={Network}>System Architecture</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                The prototype is a Base44 application: a React + Tailwind console backed by platform
                entities and four serverless functions. A shared server-side module owns the only
                governance logic.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface/50 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-foreground">Console (UI)</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    React pages for passports, policy, approvals, audit, analytics and orchestration.
                    Human-driven evaluations go through <Code>evaluate-ui</Code>.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface/50 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-foreground">Agent runtime</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    An MCP proxy, SDK, or agent process calls <Code>enforce</Code> with a Bearer API
                    key before any action runs.
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-primary">Shared engine</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    <Code>base44/shared/engine.ts</Code> — the single pure evaluator plus key
                    authorization. Both endpoints import it.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface/50 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-foreground">Data layer</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Base44 entities: ShieldAgent, ShieldPolicy, ActionRecord, AgentApiKey,
                    AgentApprovalRequest, plus orchestration entities.
                  </p>
                </div>
              </div>
            </Panel>
          </section>

          <section id="engine" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={Cpu}>The Governance Engine</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                <Code>evaluateGovernance()</Code> is a pure function: it takes an agent, the active
                policies, and the proposed action, and returns a decision, status, and a numbered
                reasoning trace. It touches no data and has no side effects — callers fetch the agent
                and policies, then persist the record.
              </p>
              <div className="mb-4">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Evaluation order (verified from source)
                </div>
                <FlowDiagram steps={DECISION_LADDER} />
              </div>
              <div className="rounded-lg border border-border bg-surface/40 p-4">
                <div className="mb-2 text-[12px] font-semibold text-foreground">Risk scoring</div>
                <KV k="Blast radius" v="5 = exfiltration; 4 = $50k+; 3 = $10k+; 2 = any spend; 1 = none" />
                <KV k="Reversibility" v="irreversible (delete/exfil); partially (payments, blast 4+); reversible" />
                <KV k="Policy conflict" v="blocked beats approval_required beats allow, then by priority" />
                <KV k="Autonomy ratchet" v="a blocked verdict downgrades the agent to restricted (one-way)" />
              </div>
            </Panel>
          </section>

          <section id="flows" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={GitBranch}>Request Flows</SectionTitle>
              <div className="mb-5">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Runtime path — <Code>enforce</Code> (agent key)
                </div>
                <FlowDiagram steps={RUNTIME_FLOW} />
              </div>
              <Callout tone="gold" title="Why two endpoints share one engine">
                <Code>enforce</Code> authenticates an agent API key and attributes the record to
                <Code>agent:&lt;id&gt;</Code>. <Code>evaluate-ui</Code> authenticates a signed-in user
                and attributes the record to that person. Both call the same
                <Code>evaluateGovernance()</Code>, so a verdict never depends on which path asked.
              </Callout>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <div className="mb-1.5 text-[13px] font-semibold text-foreground">enforce response</div>
                  <ul className="space-y-1 text-[12px] text-muted-foreground">
                    <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-allow shrink-0 mt-0.5" /> allow: 200, verdict + evaluation_id</li>
                    <li className="flex gap-2"><MinusCircle className="h-3.5 w-3.5 text-review shrink-0 mt-0.5" /> approval_required: 202</li>
                    <li className="flex gap-2"><X className="h-3.5 w-3.5 text-blocked shrink-0 mt-0.5" /> block: 200, owner alerted via audit</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <div className="mb-1.5 text-[13px] font-semibold text-foreground">enforce-status</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    While an action is held for approval, the agent polls
                    <Code> /functions/enforce-status</Code> with the same key and the evaluation_id.
                    It returns pending / approved / denied, and an agent can only read its own
                    evaluations.
                  </p>
                </div>
              </div>
            </Panel>
          </section>

          <section id="credentials" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={KeyRound}>Runtime Credentials</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                Keys are credentials; passports are permissions. A runtime key is bound to exactly
                one agent and is managed by the admin-only <Code>agent-keys</Code> function.
              </p>
              <div className="rounded-lg border border-border bg-surface/40 p-4">
                <KV k="Format" v={<Code>vs_live_&lt;40 chars&gt;</Code>} />
                <KV k="Storage" v="Only the SHA-256 hash is stored; plaintext is returned once at issue" />
                <KV k="Identification" v="First 12 characters saved as key_prefix for the console" />
                <KV k="Eligibility" v="Issued only for an active (reviewed) passport" />
                <KV k="Authorization" v={<span><Code>evaluateKeyAuthorization()</Code> fails closed on missing/revoked/bad expiry</span>} />
                <KV k="Lifecycle" v="active to revoked; optional expires_at; null expiry = non-expiring" />
              </div>
            </Panel>
          </section>

          <section id="approvals" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={ClipboardCheck}>Approvals & Auditability</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                When the engine returns <Code>approval_required</Code>, the action is persisted with
                status <Code>pending_approval</Code> and a 72-hour approval window. A governance admin
                approves or denies from the Action Review queue; the decision is written to the same
                ActionRecord's decision history.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Callout tone="review" title="Approval scope">
                  Each approval releases a single execution. Approving an agent passport request, by
                  contrast, changes ongoing access — a separate, heavier decision.
                </Callout>
                <Callout tone="blocked" title="Self-approval guard">
                  An admin cannot approve their own request; another admin must review it. Only
                  admins can approve or deny.
                </Callout>
                <Callout tone="gold" title="Alerts are derived">
                  The alert queue is derived from blocked ActionRecords — no separate alert row is
                  written by enforcement.
                </Callout>
                <Callout tone="muted" title="Audit is the record">
                  The ActionRecord itself is the audit trail: decision, status, matched policies,
                  blast radius, and the full numbered reasoning trace.
                </Callout>
              </div>
            </Panel>
          </section>

          <section id="data" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={Database}>Data Model & Security</SectionTitle>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-foreground">Core entities</div>
                  <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /><Code>ShieldAgent</Code> — the passport</li>
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /><Code>ShieldPolicy</Code> — match to required decision</li>
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /><Code>ActionRecord</Code> — every evaluation</li>
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /><Code>AgentApiKey</Code> — runtime credentials</li>
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /><Code>AgentApprovalRequest</Code> — passport changes</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-foreground">Row-level security</div>
                  <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                    <li>ShieldPolicy create/update/delete — admin only</li>
                    <li>AgentApiKey all operations — admin only</li>
                    <li>Other entities — admin + user read/create; admin update/delete</li>
                    <li>Layout-level auth guard: every screen requires a signed-in user</li>
                  </ul>
                </div>
              </div>
            </Panel>
          </section>

          <section id="limits" className="scroll-mt-24">
            <Panel>
              <SectionTitle icon={AlertTriangle}>Prototype Limitations & Production Considerations</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                These are clearly labeled as prototype-level. They are discussion points, not
                implemented behavior.
              </p>
              <div className="space-y-2.5">
                {LIMITS.map(([t, d]) => (
                  <div key={t} className="flex gap-3 rounded-lg border border-border bg-surface/30 px-4 py-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-review mt-0.5" />
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{t}</div>
                      <div className="text-[12px] leading-relaxed text-muted-foreground">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}