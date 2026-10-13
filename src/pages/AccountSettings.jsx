import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import { Save, CheckCircle2, Mail, Bell, Building2, UserRound, RotateCcw } from "lucide-react";

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

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
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
        subtitle="Your account details, organization, and the governance events that alert you."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Profile"
          description="Your identity comes from your login and cannot be changed here."
          icon={UserRound}
          className="lg:col-span-2"
          contentClassName="p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input className="mt-1" value={user.full_name || ""} disabled />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input className="mt-1" value={user.email || ""} disabled />
            </div>
            <div>
              <Label className="text-sm">Role</Label>
              <Input className="mt-1 capitalize" value={user.role || "user"} disabled />
            </div>
            <div>
              <Label className="text-sm">Organization Name</Label>
              <Input className="mt-1" value={orgName} onChange={(e) => setOrg(e.target.value)} placeholder="Venus AI Pros" />
              <p className="mt-1 text-[11px] text-muted-foreground">Shown on reports and exported audit evidence.</p>
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
      </div>

      <Panel title="Organization" description="This organisation's governance namespace." icon={Building2} contentClassName="p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="vs-eyebrow">Organization</div>
            <div className="mt-1 font-medium text-foreground">{orgName || "Not set"}</div>
          </div>
          <div>
            <div className="vs-eyebrow">Your Access</div>
            <div className="mt-1 font-medium capitalize text-foreground">{user.role || "user"}</div>
          </div>
          <div className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Team members are managed from the app dashboard under App Users, where roles and invitations are handled.
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving || !dirty}>
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={cancel} disabled={saving || !dirty}>
          <RotateCcw className="mr-2 h-4 w-4" /> Cancel
        </Button>
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-allow">
            <CheckCircle2 className="h-4 w-4" /> Settings saved.
          </span>
        )}
      </div>
    </div>
  );
}