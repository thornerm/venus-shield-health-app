import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { categoryMeta, policyCategory } from "@/lib/policies";
import { cn } from "@/lib/utils";

const ENFORCEMENT = [
  { value: "allow", label: "Allow", blurb: "Matching actions proceed and are recorded." },
  { value: "approval_required", label: "Require Review", blurb: "Matching actions are held for a human decision." },
  { value: "blocked", label: "Block", blurb: "Matching actions are refused outright and cannot be approved." },
];

const toList = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

function emptyForm() {
  return { name: "", description: "", required_decision: "allow", priority: 10, action_types: "", target_systems: "", min_amount: "", exfiltration: false };
}

function FormSection({ title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-surface/30 p-4">
      <h3 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function PolicyFormDialog({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      if (editing) {
        setForm({
          name: editing.name || "",
          description: editing.description || "",
          required_decision: editing.required_decision || "allow",
          priority: editing.priority ?? 10,
          action_types: (editing.match?.action_types || []).join(", "),
          target_systems: (editing.match?.target_systems || []).join(", "),
          min_amount: editing.match?.min_amount ?? "",
          exfiltration: editing.match?.exfiltration || false,
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Live preview of the derived category — mirrors exactly what gets stored.
  const derived = useMemo(() => {
    const match = {};
    const at = toList(form.action_types);
    const ts = toList(form.target_systems);
    if (at.length) match.action_types = at;
    if (ts.length) match.target_systems = ts;
    if (form.min_amount !== "" && form.min_amount !== null) match.min_amount = Number(form.min_amount);
    if (form.exfiltration) match.exfiltration = true;
    return categoryMeta(policyCategory({ match, required_decision: form.required_decision }));
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const match = {};
    const at = toList(form.action_types);
    const ts = toList(form.target_systems);
    if (at.length) match.action_types = at;
    if (ts.length) match.target_systems = ts;
    if (form.min_amount !== "" && form.min_amount !== null) match.min_amount = Number(form.min_amount);
    if (form.exfiltration) match.exfiltration = true;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      required_decision: form.required_decision,
      priority: Number(form.priority) || 10,
      match,
      is_active: editing ? editing.is_active : true,
    };
    try {
      if (editing) await base44.entities.ShieldPolicy.update(editing.id, payload);
      else await base44.entities.ShieldPolicy.create(payload);
      onSaved();
    } catch (err) {
      setError(err?.message || "Failed to save policy. Admin access may be required.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? "Edit Policy" : "New Policy"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this governance policy." : "Define a new governance policy."} A reason is not required, but the change is recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <FormSection title="Policy Information" description="How this policy is identified across the governance console.">
            <div>
              <Label className="text-sm">Policy Name</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bulk Data Exfiltration" required />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Block any bulk export of PII to external endpoints." />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
              <span className="vs-eyebrow">Category</span>
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {derived.label}
              </span>
              <span className="text-xs text-muted-foreground">{derived.description} Derived from the conditions below.</span>
            </div>
          </FormSection>

          <FormSection title="Conditions" description="A proposed action must meet every condition below for this policy to apply.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Action Types</Label>
                <Input className="mt-1" value={form.action_types} onChange={(e) => set("action_types", e.target.value)} placeholder="issue_refund, export_database" />
                <p className="mt-1 text-[11px] text-muted-foreground">Comma-separated. Leave empty to match any action.</p>
              </div>
              <div>
                <Label className="text-xs">Target Systems</Label>
                <Input className="mt-1" value={form.target_systems} onChange={(e) => set("target_systems", e.target.value)} placeholder="billing, crm" />
                <p className="mt-1 text-[11px] text-muted-foreground">Comma-separated. Leave empty to match any system.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Minimum Amount (USD)</Label>
                <Input className="mt-1" type="number" value={form.min_amount} onChange={(e) => set("min_amount", e.target.value)} placeholder="10000" />
                <p className="mt-1 text-[11px] text-muted-foreground">Only applies to actions at or above this amount.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="pr-3">
                  <Label className="text-xs">Exfiltration Pattern</Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Match bulk data movement to external endpoints.</p>
                </div>
                <Switch checked={form.exfiltration} onCheckedChange={(v) => set("exfiltration", v)} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Enforcement" description="What the governance engine does when an action matches.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ENFORCEMENT.map((o) => {
                const active = form.required_decision === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set("required_decision", o.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
                      active ? "border-primary/50 bg-primary/10" : "border-border bg-background/40 hover:border-primary/30"
                    )}
                  >
                    <span className={cn("block text-sm font-medium", active ? "text-primary" : "text-foreground")}>{o.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{o.blurb}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <Label className="text-sm">Priority</Label>
              <Input className="mt-1 max-w-[160px]" type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} />
              <p className="mt-1 text-[11px] text-muted-foreground">Higher priority is evaluated first.</p>
            </div>
          </FormSection>

          {error && <div className="rounded-lg border border-blocked/30 bg-blocked/10 px-3 py-2 text-sm text-blocked">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Policy"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}