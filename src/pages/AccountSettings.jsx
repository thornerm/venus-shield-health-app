import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, CheckCircle2, Mail, Bell } from "lucide-react";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [prefs, setPrefs] = useState({ approval_emails: true, blocked_alerts: true, weekly_summary: false });
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

  const setPref = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({ organization_name: orgName, notification_preferences: prefs });
      setSaved(true);
    } catch (e) { /* bubble silently */ }
    setSaving(false);
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading account…</div>;
  if (!user) return <div className="py-16 text-center text-sm text-muted-foreground">Sign in to manage account settings.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account details, organization, and notification preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4 text-primary" /> Profile & Organization</CardTitle>
            <CardDescription>Your name and email come from your login and cannot be changed here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Full Name</Label>
                <Input className="mt-1" value={user.full_name || ""} disabled />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input className="mt-1" value={user.email || ""} disabled />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Role</Label>
                <Input className="mt-1" value={user.role || "user"} disabled />
              </div>
              <div>
                <Label className="text-sm">Organization Name</Label>
                <Input className="mt-1" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Venus AI Pros" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
            <CardDescription>Choose which governance events alert you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Approval requests</div>
                <div className="text-xs text-muted-foreground">Email me when an action or passport needs approval.</div>
              </div>
              <Switch checked={prefs.approval_emails} onCheckedChange={(v) => setPref("approval_emails", v)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Blocked actions</div>
                <div className="text-xs text-muted-foreground">Alert me immediately when an action is blocked.</div>
              </div>
              <Switch checked={prefs.blocked_alerts} onCheckedChange={(v) => setPref("blocked_alerts", v)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Weekly summary</div>
                <div className="text-xs text-muted-foreground">A digest of agent activity each week.</div>
              </div>
              <Switch checked={prefs.weekly_summary} onCheckedChange={(v) => setPref("weekly_summary", v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}</Button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-allow"><CheckCircle2 className="h-4 w-4" /> Settings saved.</span>}
      </div>
    </div>
  );
}