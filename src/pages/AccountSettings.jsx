import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import { deriveSystems } from "@/lib/integrations";
import { Save, CheckCircle2, Mail, Bell, Building2, UserRound, RotateCcw, Users, ShieldCheck, Plug, ArrowRight } from "lucide-react";

const DEFAULT_PREFS = { approval_emails: true, blocked_alerts: true, weekly_summary: false };

function Toggle({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {title}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="vs-eyebrow">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-foreground" title={String(value)}>{value}</div>
    </div>
  );
}

function Count({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-surface/40 p-3">
      <div className="vs-eyebrow">{label}</div>
      <div className="mt-1.5 font-heading text-[22px] font-bold leading-none tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        setOrgName(u.organization_name || "");
        setPrefs({
          approval_emails: u.notification_preferences?.approval_emails ?? true,
          blocked_alerts: u.notification_preferences?.blocked_alerts ?? true,
          weekly_summary: u.notification_preferences?.weekly_summary ?? false,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([base44.entities.ShieldAgent.list(), base44.entities.ShieldPolicy.list()])
      .then(([ag, po]) => {
        const derived = deriveSystems({ agents: ag || [], policies: po || [] });
        setServices({
          systems: derived.length,
          authorizations: derived.reduce((n, s) => n + s.authorizedAgents.length, 0),
          policies: (po || []).filter((p) => p.is_active !== false).length,
        });
      })
      .catch(() => setServices(null));
  }, []);

  const setPref = (k, v) => { setSaved(false); setPrefs((p) => ({ ...p, [k]: v })); };
  const setOrg = (v) => { setSaved(false); setOrgName(v); };

  const dirty = !!user && (orgName !== (user.organization_name || "") || JSON.stringify(prefs) !== JSON.stringify({
    approval_emails: user.notification_preferences?.approval_emails ?? true,
    blocked_alerts: user.notification_preferences?.blocked_alerts ?? true,
    weekly_summary: user.notification_preferences?.weekly_summary ?? false,
  }));

  const cancel = () => {
    setOrgName(user.organization_name || "");
    setPrefs({
      approval_emails: user.notification_preferences?.approval_emails ?? true,
      blocked_alerts: user.notification_preferences?.blocked_alerts ?? true,
      weekly_summary: user.notification_preferences?.weekly_summary ?? false,
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({ organization_name: orgName, notification_preferences: prefs });
      setUser((u) => ({ ...u, organization_name: orgName, notification_preferences: prefs }));
      setSaved(true);
    } catch (e) { /* bubble silently */ }
    setSaving(false);
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading account…</div>;
  if (!user) return <div className="py-16 text-center text-sm text-muted-foreground">Sign in to manage account settings.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Your account, organization, and the governance events that alert you."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Profile"
          description="Your identity comes from your login and cannot be changed here."
          icon={UserRound}
          contentClassName="p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="settings-name" className="text-sm">Full Name</Label>
              <Input id="settings-name" className="mt-1" value={user.full_name || ""} disabled />
            </div>
            <div>
              <Label htmlFor="settings-email" className="text-sm">Email</Label>
              <Input id="settings-email" className="mt-1" value={user.email || ""} disabled />
            </div>
          </div>
        </Panel>

        <Panel
          title="Organization"
          description="This organization's governance namespace."
          icon={Building2}
          contentClassName="p-5"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="settings-org" className="text-sm">Organization Name</Label>
              <Input
                id="settings-org"
                className="mt-1"
                value={orgName}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="e.g. Venus AI Pros"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Shown on reports and exported audit evidence.</p>
            </div>
            <div className="border-t border-border pt-4">
              <Fact label="Your Access" value={user.role === "admin" ? "Admin" : "User"} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Notifications"
          description="Choose which governance events alert you."
          icon={Bell}
          contentClassName="p-5"
        >
          <Toggle
            icon={Mail}
            title="Approval requests"
            description="Email me when an action or passport needs approval."
            checked={prefs.approval_emails}
            onChange={(v) => setPref("approval_emails", v)}
          />
          <Toggle
            icon={Bell}
            title="Blocked actions"
            description="Alert me immediately when an action is blocked."
            checked={prefs.blocked_alerts}
            onChange={(v) => setPref("blocked_alerts", v)}
          />
          <Toggle
            icon={Mail}
            title="Weekly summary"
            description="A digest of agent activity each week."
            checked={prefs.weekly_summary}
            onChange={(v) => setPref("weekly_summary", v)}
          />
        </Panel>

        <Panel
          title="Access Management"
          description="Who can act in this governance console."
          icon={Users}
          contentClassName="p-5"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Your Role" value={user.role === "admin" ? "Governance Admin" : "Member"} />
              <Fact label="Enforcement" value="Platform-enforced" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Invitations, role changes, and access revocation are handled on the Team screen. Roles are enforced by the
              platform's record-level security, not by this page.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/team">
                Open Team <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel
          title="Connected Services"
          description="Systems wired into agent passports, and the policies governing them."
          icon={Plug}
          contentClassName="p-5"
        >
          {services === null ? (
            <p className="text-xs text-muted-foreground">Loading connected services…</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Count label="Systems" value={services.systems} />
                <Count label="Authorizations" value={services.authorizations} />
                <Count label="Policies" value={services.policies} />
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/integrations">
                  Open Integrations <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </Panel>

        <Panel
          title="Security"
          description="How your access is secured. These fields are read-only."
          icon={ShieldCheck}
          contentClassName="p-5"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Access Level" value={user.role === "admin" ? "Admin" : "User"} />
              <Fact label="Account Email" value={user.email || "—"} />
            </div>
            <p className="rounded-md border border-border bg-surface/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Sign-in credentials, sessions, and identity verification are handled by the platform's authentication
              service and are never stored by this application. Sensitive access changes require a governance admin.
            </p>
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving || !dirty}>
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={cancel} disabled={saving || !dirty}>
          <RotateCcw className="mr-2 h-4 w-4" /> Cancel
        </Button>
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-allow" role="status">
            <CheckCircle2 className="h-4 w-4" /> Settings saved.
          </span>
        )}
      </div>
    </div>
  );
}