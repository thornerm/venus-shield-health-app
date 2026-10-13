import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/metrics";
import { KeyRound, Plus, Copy, Ban, Terminal, AlertTriangle } from "lucide-react";

const APP_URL = "https://venus-orbit-guard.base44.app";

/**
 * Runtime credentials for one agent. A key is a credential, the passport is the
 * permission — keys can only be issued while the passport is active, and the
 * plaintext is shown exactly once.
 */
export default function RuntimeAccessCard({ agent, isAdmin }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState("");
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const active = agent?.is_active !== false && agent?.review_status === "reviewed";

  const load = async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("agent-keys", { action: "list", agent_id: agent.agent_id });
      setKeys(res?.data?.keys || []);
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Could not load runtime keys."); }
    setLoading(false);
  };
  useEffect(() => { if (agent?.agent_id) load(); }, [agent?.agent_id, isAdmin]);

  const issue = async () => {
    setBusy("issue"); setError("");
    try {
      const res = await base44.functions.invoke("agent-keys", { action: "create", agent_id: agent.agent_id, label });
      const data = res?.data;
      if (data?.error) setError(data.error);
      else { setIssued(data.key); setLabel(""); load(); }
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Could not issue a key."); }
    setBusy("");
  };

  const revoke = async (keyId) => {
    setBusy(keyId); setError("");
    try {
      const res = await base44.functions.invoke("agent-keys", { action: "revoke", key_id: keyId });
      if (res?.data?.error) setError(res.data.error);
      load();
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Could not revoke the key."); }
    setBusy("");
  };

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 2000); } catch (e) { /* clipboard unavailable */ }
  };

  if (!isAdmin) return null;

  const snippet = issued
    ? `VENUS_SHIELD_URL=${APP_URL}\nVENUS_SHIELD_API_KEY=${issued}\nVENUS_AGENT_ID=${agent.agent_id}`
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Runtime Access</CardTitle>
        <CardDescription>
          Runtime keys let this agent ask for a verdict before it acts. The key is a credential; the passport above is the permission it is judged against.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-blocked/10 px-3 py-2 text-sm text-blocked">
            <AlertTriangle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {!active && (
          <div className="rounded-md border border-review/30 bg-review/10 px-3 py-2 text-sm text-review">
            Keys can only be issued for an active passport. This passport is {(agent.review_status || "pending review").replace("_", " ")}.
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="key-label">Label (optional)</Label>
            <Input id="key-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="prod MCP proxy" className="mt-1" />
          </div>
          <Button onClick={issue} disabled={!active || busy === "issue"}>
            <Plus className="mr-1 h-4 w-4" /> {busy === "issue" ? "Issuing…" : "Issue key"}
          </Button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading keys…</div>
        ) : keys.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No runtime keys issued for this agent yet.</div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-xs">{k.label || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${k.status === "active" ? "bg-allow/10 text-allow" : "bg-blocked/10 text-blocked"}`}>
                        {k.status === "active" ? "Active" : "Revoked"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.last_used_at ? fmtDate(k.last_used_at) : "Never"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.expires_at ? fmtDate(k.expires_at) : "No expiry"}</TableCell>
                    <TableCell className="text-right">
                      {k.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blocked/40 text-blocked hover:bg-blocked/10 hover:text-blocked"
                          onClick={() => revoke(k.id)}
                          disabled={busy === k.id}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" /> {busy === k.id ? "Revoking…" : "Revoke"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!issued} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Runtime key for {agent.name}</DialogTitle>
            <DialogDescription>This key is shown once. Store it in the agent's secret manager.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="vs-eyebrow">API key</div>
              <div className="mt-1.5 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{issued}</code>
                <Button size="sm" variant="outline" onClick={() => copy(issued, "key")}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> {copied === "key" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="vs-eyebrow flex items-center gap-1.5"><Terminal className="h-3 w-3" /> Point the agent runtime at Venus Shield</span>
                <Button size="sm" variant="outline" onClick={() => copy(snippet, "snippet")}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> {copied === "snippet" ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">{snippet}</pre>
            </div>

            <p className="text-xs text-muted-foreground">
              Every action this key submits is attributed to <span className="font-mono">agent:{agent.agent_id}</span> and judged by the same engine as this console. Revoking the key stops it immediately.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}