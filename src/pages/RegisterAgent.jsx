import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AUTONOMY_DEFINITIONS, FINANCIAL_LIMIT_MODES } from "@/lib/governance";
import { useAuth } from "@/lib/AuthContext";
import { UserPlus, CheckCircle2, Info } from "lucide-react";

const AUTONOMY_KEYS = ["full", "standard", "restricted"];
const FIN_MODE_KEYS = ["approval_threshold", "hard_cap"];

export default function RegisterAgent() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    agent_id: "", name: "", owner_name: "", owner_email: "",
    purpose: "", systems: "", financial_limit_usd: 0, financial_limit_mode: "approval_threshold",
    autonomy_level: "standard", prohibited_actions: "export_database", data_permissions: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Default the agent owner to the authenticated user (the requester). The owner
  // remains a distinct, editable field — it is not assumed to equal the requester.
  useEffect(() => {
    if (user && !form.owner_name && !form.owner_email) {
      setForm((f) => ({ ...f, owner_name: user.full_name || "", owner_email: user.email || "" }));
    }
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDone(null);
    try {
      const requesterDisplay = user ? `${user.full_name || ""} <${user.email || ""}>`.trim() : "";
      const payload = {
        request_type: "new_agent",
        agent_id: form.agent_id.trim(),
        name: form.name.trim(),
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim(),
        purpose: form.purpose.trim(),
        systems: form.systems.split(",").map((s) => s.trim()).filter(Boolean),
        financial_limit_usd: Number(form.financial_limit_usd) || 0,
        financial_limit_mode: form.financial_limit_mode,
        autonomy_level: form.autonomy_level,
        prohibited_actions: form.prohibited_actions.split(",").map((s) => s.trim()).filter(Boolean),
        data_permissions: form.data_permissions.split(",").map((s) => s.trim()).filter(Boolean),
        notes: form.notes.trim(),
        requested_by: requesterDisplay,
        status: "pending",
        approval_token: "tok_" + Math.random().toString(36).slice(2, 12),
      };
      await base44.entities.AgentApprovalRequest.create(payload);
      setDone({ ok: true, name: payload.name });
      setForm((f) => ({ ...f, agent_id: "", name: "", purpose: "", systems: "", notes: "", data_permissions: "" }));
    } catch (err) {
      setDone({ ok: false, error: err?.message || "Submission failed." });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Register Agent</h1>
        <p className="text-sm text-muted-foreground">Submit a new agent passport for approval. No agent acts until a human approves the passport.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-primary" /> Agent Intake</CardTitle>
            <CardDescription>All fields are required for governance review. The request is attributed to you ({user?.email || "—"}).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Agent ID" required><Input value={form.agent_id} onChange={(e) => set("agent_id", e.target.value)} placeholder="sales-agent" required /></Field>
                <Field label="Agent Name" required><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sales Agent" required /></Field>
                <Field label="Owner Name" required><Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} required /></Field>
                <Field label="Owner Email" required><Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} required /></Field>
              </div>
              <Field label="Purpose" required><Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Manage sales pipeline & CRM deal stages" required /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Authorized Systems" hint="Comma-separated"><Input value={form.systems} onChange={(e) => set("systems", e.target.value)} placeholder="crm, billing" /></Field>
                <Field label="Financial Limit (USD)"><Input type="number" value={form.financial_limit_usd} onChange={(e) => set("financial_limit_usd", e.target.value)} /></Field>
              </div>
              <Field label="Financial Limit Mode" required>
                <select value={form.financial_limit_mode} onChange={(e) => set("financial_limit_mode", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {FIN_MODE_KEYS.map((k) => <option key={k} value={k}>{FINANCIAL_LIMIT_MODES[k].label}</option>)}
                </select>
                <div className="mt-1 text-xs text-muted-foreground">{FINANCIAL_LIMIT_MODES[form.financial_limit_mode].description}</div>
              </Field>
              <Field label="Prohibited Actions" hint="Comma-separated"><Input value={form.prohibited_actions} onChange={(e) => set("prohibited_actions", e.target.value)} placeholder="export_database" /></Field>
              <Field label="Data Permissions" hint="Comma-separated"><Input value={form.data_permissions} onChange={(e) => set("data_permissions", e.target.value)} placeholder="crm_read, crm_write" /></Field>

              <Field label="Autonomy Level" required>
                <select value={form.autonomy_level} onChange={(e) => set("autonomy_level", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {AUTONOMY_KEYS.map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}
                </select>
              </Field>
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Info className="h-3 w-3" /> Autonomy Level Definitions</div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {AUTONOMY_KEYS.map((k) => (
                    <li key={k}><span className="font-medium capitalize text-foreground">{k}:</span> {AUTONOMY_DEFINITIONS[k]}</li>
                  ))}
                </ul>
              </div>

              <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Context for the approver…" /></Field>

              {done?.ok && (
                <div className="flex items-center gap-2 rounded-md bg-allow/10 px-3 py-2 text-sm text-allow">
                  <CheckCircle2 className="h-4 w-4" /> Approval request submitted for "{done.name}". It is now pending human review in Approvals.
                </div>
              )}
              {done?.ok === false && (
                <div className="rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">{done.error}</div>
              )}

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Submitting…" : "Submit for Approval"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Why approval first?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Submitting this form creates a <span className="font-medium text-foreground">pending approval request</span> — not a live passport.</p>
            <p>A governance approver reviews the requested autonomy, systems, financial limit, and prohibited actions, then approves or denies it.</p>
            <p>Only an approved request provisions a passport into the agent registry, after which the agent's actions can be evaluated.</p>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <span className="font-medium text-foreground">Tagline:</span> "No agent acts in the business until its passport is human-approved."
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <Label className="text-sm">{label}{required && <span className="ml-0.5 text-blocked">*</span>}</Label>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}