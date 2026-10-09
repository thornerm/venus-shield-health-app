import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, CheckCircle, Github, Cpu, KeyRound } from "lucide-react";
import { getCurrentActor } from "@/lib/identity";
import { SOURCE_META } from "@/lib/orchestration";

export default function CustomerSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [form, setForm] = useState({
    customer_name: "",
    organization: "",
    github_org: "",
    github_repo: "",
    ai_agent_endpoint: "",
    ai_key_secret_name: "AI_AGENT_API_KEY",
    allowed_job_sources: ["venus_official", "customer"],
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const actor = await getCurrentActor();
      const rows = await base44.entities.CustomerConfig.filter(
        { owner_email: actor.email },
        "-created_date",
        1
      );
      if (rows[0]) {
        setExistingId(rows[0].id);
        setForm({
          customer_name: rows[0].customer_name || "",
          organization: rows[0].organization || "",
          github_org: rows[0].github_org || "",
          github_repo: rows[0].github_repo || "",
          ai_agent_endpoint: rows[0].ai_agent_endpoint || "",
          ai_key_secret_name: rows[0].ai_key_secret_name || "AI_AGENT_API_KEY",
          allowed_job_sources: rows[0].allowed_job_sources || ["venus_official", "customer"],
        });
      } else {
        setForm((f) => ({ ...f, customer_name: actor.name || "" }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (k, v) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  function toggleSource(src) {
    setSaved(false);
    setForm((f) => {
      const has = f.allowed_job_sources.includes(src);
      return {
        ...f,
        allowed_job_sources: has
          ? f.allowed_job_sources.filter((s) => s !== src)
          : [...f.allowed_job_sources, src],
      };
    });
  }

  async function save() {
    setError(null);
    if (!form.customer_name.trim() || !form.ai_agent_endpoint.trim()) {
      setError("Customer name and AI agent endpoint are required.");
      return;
    }
    setSaving(true);
    try {
      const actor = await getCurrentActor();
      const payload = { ...form, owner_email: actor.email };
      if (existingId) {
        await base44.entities.CustomerConfig.update(existingId, payload);
      } else {
        const created = await base44.entities.CustomerConfig.create(payload);
        setExistingId(created.id);
      }
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading configuration...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customer Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure your orchestrator identity, AI agent, and access controls.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Github className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Orchestrator identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer name *</Label>
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Organization</Label>
            <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GitHub organization</Label>
            <Input value={form.github_org} onChange={(e) => set("github_org", e.target.value)} placeholder="acme-corp" />
          </div>
          <div className="space-y-2">
            <Label>GitHub repository</Label>
            <Input value={form.github_repo} onChange={(e) => set("github_repo", e.target.value)} placeholder="venus-jobs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">AI agent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>AI agent endpoint *</Label>
            <Input value={form.ai_agent_endpoint} onChange={(e) => set("ai_agent_endpoint", e.target.value)} placeholder="https://agent.acme.com/invoke" />
          </div>
          <div className="space-y-2">
            <Label>API key secret name</Label>
            <Input value={form.ai_key_secret_name} onChange={(e) => set("ai_key_secret_name", e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Name of the app secret holding the key. The value is never stored here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Access controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Allowed job sources</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SOURCE_META).map(([k, v]) => {
              const on = form.allowed_job_sources.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleSource(k)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Which catalog sources this customer is permitted to run.
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-blocked">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-allow">
          <CheckCircle className="h-4 w-4" /> Configuration saved.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save configuration"}
        </Button>
      </div>
    </div>
  );
}