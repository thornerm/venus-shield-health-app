import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/VerdictBadge";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import TabBar from "@/components/TabBar";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import { POLICY_CATEGORIES, categoryMeta, policyCategory } from "@/lib/policies";
import { fmtDate } from "@/lib/metrics";
import { Plus, Pencil, RefreshCw, ArrowRight, Scale } from "lucide-react";

export default function PolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [p, agg] = await Promise.all([
      base44.entities.ShieldPolicy.list("-priority", 200),
      base44.entities.ActionRecord.aggregate({ groupBy: "policy_matched_name" }),
    ]);
    setPolicies(p || []);
    const by = {};
    (agg?.rows || []).forEach((row) => { if (row.policy_matched_name) by[row.policy_matched_name] = row.count; });
    setDecisions(by);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const withCategory = useMemo(
    () => policies.map((p) => ({ ...p, category: policyCategory(p) })),
    [policies]
  );

  const tabs = useMemo(() => {
    const counts = {};
    withCategory.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return [
      { value: "all", label: "All Policies", count: withCategory.length },
      ...POLICY_CATEGORIES.filter((c) => counts[c.value]).map((c) => ({ value: c.value, label: c.label, count: counts[c.value] })),
    ];
  }, [withCategory]);

  const visible = category === "all" ? withCategory : withCategory.filter((p) => p.category === category);
  const activeCount = withCategory.filter((p) => p.is_active).length;

  const onToggle = async (p) => {
    try { await base44.entities.ShieldPolicy.update(p.id, { is_active: !p.is_active }); load(); }
    catch (e) { alert(e?.message || "Failed to toggle policy. Admin access may be required."); }
  };
  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        subtitle="Define the boundaries within which your AI agents operate."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Policy</Button>
          </>
        }
      />

      <Panel
        title="Policy Library"
        description={`${withCategory.length} polic${withCategory.length === 1 ? "y" : "ies"} configured · ${activeCount} active. Higher priority is evaluated first; a hard prohibition always outweighs an approval requirement.`}
        icon={Scale}
        contentClassName="p-0"
      >
        <TabBar tabs={tabs} value={category} onChange={setCategory} className="px-5" />

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading policies…</div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {withCategory.length === 0 ? "No policies yet. Create one to begin governing agent actions." : "No policies in this category."}
          </div>
        ) : (
          <div className="vs-scroll overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Enforcement</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-center">Decisions</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((p) => {
                  const meta = categoryMeta(p.category);
                  return (
                    <TableRow key={p.id} className="transition-colors duration-200 hover:bg-surface/40">
                      <TableCell className="max-w-[280px]">
                        <Link to={`/policy-details/${p.id}`} className="text-[13px] font-medium text-foreground hover:text-primary">
                          {p.name}
                        </Link>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell><VerdictBadge decision={p.required_decision} /></TableCell>
                      <TableCell className="text-center font-mono text-sm text-foreground">{p.priority}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums text-muted-foreground">{decisions[p.name] ?? 0}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(p.updated_date || p.created_date)}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={!!p.is_active} onCheckedChange={() => onToggle(p)} aria-label={`Toggle ${p.name}`} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" asChild aria-label={`Open ${p.name}`}>
                            <Link to={`/policy-details/${p.id}`}><ArrowRight className="h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <PolicyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={() => { setDialogOpen(false); load(); }} />
    </div>
  );
}