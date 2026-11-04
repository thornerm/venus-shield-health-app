import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FINANCIAL_LIMIT_MODES } from "@/lib/governance";
import { PencilLine, CheckCircle2 } from "lucide-react";

const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
const SELECT = "mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function Field({ label, children }) {
  return <div><Label className="text-sm">{label}</Label><div className="mt-1">{children}</div></div>;
}

export default function ModificationRequestCard({ agent, user, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(null);

  const start = () => {
    setForm({
      autonomy_level: agent.autonomy_level || "standard",
      systems: (agent.systems || []).join(", "),
      financial_limit_usd: String(agent.financial_limit_usd || 0),
      financial_limit_mode: agent.financial_limit_mode || "approval_threshold",
      prohibited_actions: (agent.prohibited_actions || []).join(", "),
      data_permissions: (agent.data_permissions || []).join(", "),
      notes: "",
    });
    setMsg(null);
    setOpen(true);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await base44.entities.AgentApprovalRequest.create({
        request_type: "modified_passport",
        agent_id: agent.agent_id,
        name: agent.name,
        owner_name: agent.owner_name,
        owner_email: agent.owner_email,
        purpose: agent.purpose,
        autonomy_level: form.autonomy_level,
        systems: list(form.systems),
        financial_limit_usd: Number(form.financial_limit_usd) || 0,
        financial_limit_mode: form.financial_limit_mode,
        prohibited_actions: list(form.prohibited_actions),
        data_permissions: list(form.data_permissions),
        notes: form.notes.trim(),
        requested_by: `${user?.full_name || ""} <${user?.email || ""}>`.trim(),
        status: "pending",
        approval_token: "tok_" + Math.random().toString(36).slice(2, 12),
      });
      setMsg({ ok: true });
      setOpen(false);
      onSubmitted?.();
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Submission failed." });
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><PencilLine className="h-4 w-4 text-primary" /> Request Passport Modification</CardTitle>
        <CardDescription className="text-xs">Propose changes to autonomy, systems, limits or prohibited actions. Changes apply only after a different approver signs off.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg?.ok && <div className="flex items-center gap-2 rounded-md bg-allow/10 px-3 py-2 text-sm text-allow"><CheckCircle2 className="h-4 w-4" /> Modification request submitted. It is now pending review in Approvals.</div>}
        {msg?.ok === false && <div className="rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">{msg.text}</div>}
        {!open ? (
          <Button variant="outline" size="sm" onClick={start}><PencilLine className="mr-1 h-4 w-4" /> Request Modification</Button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Autonomy Level">
                <select value={form.autonomy_level} onChange={(e) => set("autonomy_level", e.target.value)} className={SELECT}>
                  {["full", "standard", "restricted"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Authorized Systems (comma-separated)"><Input value={form.systems} onChange={(e) => set("systems", e.target.value)} /></Field>
              <Field label="Financial Limit (USD)"><Input type="number" value={form.financial_limit_usd} onChange={(e) => set("financial_limit_usd", e.target.value)} /></Field>
              <Field label="Financial Limit Mode">
                <select value={form.financial_limit_mode} onChange={(e) => set("financial_limit_mode", e.target.value)} className={SELECT}>
                  {Object.keys(FINANCIAL_LIMIT_MODES).map((k) => <option key={k} value={k}>{FINANCIAL_LIMIT_MODES[k].label}</option>)}
                </select>
              </Field>
              <Field label="Prohibited Actions (comma-separated)"><Input value={form.prohibited_actions} onChange={(e) => set("prohibited_actions", e.target.value)} /></Field>
              <Field label="Data Permissions (comma-separated)"><Input value={form.data_permissions} onChange={(e) => set("data_permissions", e.target.value)} /></Field>
            </div>
            <Field label="Reason for change"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Context for the approver…" required /></Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy || !form.notes.trim()}>{busy ? "Submitting…" : "Submit for Approval"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}