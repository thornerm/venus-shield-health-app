import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const DECISIONS = ["allow", "approval_required", "blocked"];

function emptyForm() {
  return { name: "", description: "", required_decision: "allow", priority: 10, action_types: "", target_systems: "", min_amount: "", exfiltration: false };
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

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const match = {};
    const at = form.action_types.split(",").map((s) => s.trim()).filter(Boolean);
    const ts = form.target_systems.split(",").map((s) => s.trim()).filter(Boolean);
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Policy" : "New Policy"}</DialogTitle>
          <DialogDescription>{editing ? "Update this governance policy." : "Define a new governance policy."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-sm">Policy Name</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bulk Data Exfiltration" required />
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <Textarea className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Block any bulk export of PII to external endpoints." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Required Decision</Label>
              <select value={form.required_decision} onChange={(e) => set("required_decision", e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {DECISIONS.map((d) => <option key={d} value={d} className="capitalize">{d.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm">Priority</Label>
              <Input className="mt-1" type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match Criteria</div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Action Types (comma-separated)</Label>
                <Input className="mt-1" value={form.action_types} onChange={(e) => set("action_types", e.target.value)} placeholder="issue_refund, export_database" />
              </div>
              <div>
                <Label className="text-xs">Target Systems (comma-separated)</Label>
                <Input className="mt-1" value={form.target_systems} onChange={(e) => set("target_systems", e.target.value)} placeholder="billing, crm" />
              </div>
              <div>
                <Label className="text-xs">Minimum Amount (USD)</Label>
                <Input className="mt-1" type="number" value={form.min_amount} onChange={(e) => set("min_amount", e.target.value)} placeholder="10000" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Match exfiltration pattern</Label>
                <Switch checked={form.exfiltration} onCheckedChange={(v) => set("exfiltration", v)} />
              </div>
            </div>
          </div>
          {error && <div className="rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Policy"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}