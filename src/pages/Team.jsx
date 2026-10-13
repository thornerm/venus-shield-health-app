import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import Panel from "@/components/Panel";
import StatTile from "@/components/StatTile";
import MemberTable from "@/components/team/MemberTable";
import InviteMemberDialog from "@/components/team/InviteMemberDialog";
import UnlinkedIdentitiesPanel from "@/components/team/UnlinkedIdentitiesPanel";
import SkeletonRows from "@/components/SkeletonRows";
import { deriveTeam } from "@/lib/team";
import { getCurrentActor, roleLabel } from "@/lib/identity";
import { Users, ShieldCheck, ClipboardCheck, AlertTriangle, UserPlus, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Team() {
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const load = async () => {
    setLoading(true);
    const [u, ar, rq, actor] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.ActionRecord.list("-created_date", 500),
      base44.entities.AgentApprovalRequest.list("-created_date", 200),
      getCurrentActor(),
    ]);
    setUsers(u || []);
    setActions(ar || []);
    setRequests(rq || []);
    setCurrentUserId(actor?.id || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const { members, unlinked, totals } = useMemo(
    () => deriveTeam({ users, actions, requests, currentUserId }),
    [users, actions, requests, currentUserId]
  );

  const openInvite = (email = "") => {
    setInviteEmail(email);
    setInviteOpen(true);
  };

  const changeRole = async (member, role) => {
    if (role === member.role) return;
    setSavingId(member.user_id);
    setNotice("");
    try {
      await base44.entities.User.update(member.user_id, { role });
      setUsers((prev) => prev.map((u) => (u.id === member.user_id ? { ...u, role } : u)));
      setNotice(`${member.name} is now a ${roleLabel(role)}.`);
    } catch (e) {
      setNotice(e?.message || "The role could not be changed.");
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Manage organizational access and responsibilities."
        actions={
          <>
            <Button size="sm" onClick={() => openInvite()}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      {notice && (
        <div className="flex items-center gap-1.5 text-sm text-allow">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Team Members" value={totals.members} icon={Users} tone="blue" hint="registered in this workspace" />
        <StatTile label="Governance Admins" value={totals.admins} icon={ShieldCheck} hint="can approve and manage policies" />
        <StatTile label="Decisions Recorded" value={totals.decisions} icon={ClipboardCheck} tone="green" hint={`${totals.denials} refusals`} />
        <StatTile label="Unlinked Identities" value={totals.unlinked} icon={AlertTriangle} tone="amber" hint="decisions with no roster match" />
      </div>

      <Panel
        title="Team Roster"
        description="Decisions counts every approval or refusal recorded against that member's identity in the audit records, and Last Active reflects their most recent recorded decision."
        icon={Users}
        contentClassName="p-0"
      >
        {loading ? (
          <SkeletonRows rows={5} />
        ) : (
          <MemberTable members={members} savingId={savingId} onRoleChange={changeRole} />
        )}
      </Panel>

      <UnlinkedIdentitiesPanel identities={unlinked} onInvite={openInvite} />

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        initialEmail={inviteEmail}
        onInvited={(email, role) => setNotice(`Invitation sent to ${email} as ${roleLabel(role)}.`)}
      />
    </div>
  );
}