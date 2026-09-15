import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/VerdictBadge";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import { Plus, Pencil, RefreshCw, ArrowRight, Scale } from "lucide-react";

export default function PolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const p = await base44.entities.ShieldPolicy.list("-priority", 200);
    setPolicies(p || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onToggle = async (p) => {
    try { await base44.entities.ShieldPolicy.update(p.id, { is_active: !p.is_active }); load(); }
    catch (e) { alert(e?.message || "Failed to toggle policy. Admin access may be required."); }
  };
  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Policy Manager</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and toggle the governance policies that shape agent decisions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
          <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Policy</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-primary" /> Governance Policies</CardTitle>
          <CardDescription>{policies.length} polic{policies.length === 1 ? "y" : "ies"} configured.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading policies…</div>
          ) : policies.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No policies yet. Create one to begin governing agent actions.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Required Decision</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/policy-details/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
                      </TableCell>
                      <TableCell><VerdictBadge decision={p.required_decision} /></TableCell>
                      <TableCell className="text-center font-mono text-sm">{p.priority}</TableCell>
                      <TableCell className="text-center"><Switch checked={!!p.is_active} onCheckedChange={() => onToggle(p)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" asChild><Link to={`/policy-details/${p.id}`}><ArrowRight className="h-4 w-4" /></Link></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PolicyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={() => { setDialogOpen(false); load(); }} />
    </div>
  );
}