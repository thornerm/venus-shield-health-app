import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import ListField from "@/components/orchestration/ListField";
import { CATEGORIES, SOURCE_META } from "@/lib/orchestration";
import { getCurrentActor } from "@/lib/identity";

export default function PromptBuilder() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    prompt_content: "",
    instructions: [],
    required_secrets: [],
    source: "customer",
    category: CATEGORIES[0],
    agent_type: "",
    orchestrator_workflow: "",
    tags: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setError(null);
    if (!form.name.trim() || !form.prompt_content.trim()) {
      setError("Job name and prompt content are required.");
      return;
    }
    setSaving(true);
    try {
      const actor = await getCurrentActor();
      await base44.entities.JobPrompt.create({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        prompt_content: form.prompt_content.trim(),
        instructions: form.instructions.filter(Boolean),
        required_secrets: form.required_secrets.filter(Boolean),
        tags: form.tags.filter(Boolean),
        owner_email: actor.email,
        is_approved: form.source !== "customer",
      });
      navigate("/orchestration");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/orchestration"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Create Job Prompt</h1>
          <p className="text-sm text-muted-foreground">
            Design a reusable job: a prompt, its instructions, and the secrets it needs.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Job definition</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Job name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Quarterly Revenue Analysis" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this job does" />
          </div>
          <div className="space-y-2">
            <Label>Prompt content *</Label>
            <Textarea rows={6} value={form.prompt_content} onChange={(e) => set("prompt_content", e.target.value)} placeholder="The AI prompt the agent will run..." />
          </div>
          <ListField
            label="Task instructions"
            hint="Step-by-step guidance passed to the AI agent."
            values={form.instructions}
            onChange={(v) => set("instructions", v)}
            placeholder="e.g. Summarize the last 90 days of transactions"
          />
          <ListField
            label="Required secrets"
            hint="Names of secrets the orchestrator must fetch (stored as app secrets)."
            values={form.required_secrets}
            onChange={(v) => set("required_secrets", v)}
            placeholder="e.g. STRIPE_API_KEY"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              >
                {Object.entries(SOURCE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Agent type</Label>
              <Input value={form.agent_type} onChange={(e) => set("agent_type", e.target.value)} placeholder="e.g. analysis-agent" />
            </div>
            <div className="space-y-2">
              <Label>Orchestrator workflow</Label>
              <Input value={form.orchestrator_workflow} onChange={(e) => set("orchestrator_workflow", e.target.value)} placeholder=".github/workflows/analyze.yml" />
            </div>
          </div>
          <ListField label="Tags" values={form.tags} onChange={(v) => set("tags", v)} placeholder="e.g. finance" />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-blocked">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline"><Link to="/orchestration">Cancel</Link></Button>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Publish to catalog"}
        </Button>
      </div>
    </div>
  );
}