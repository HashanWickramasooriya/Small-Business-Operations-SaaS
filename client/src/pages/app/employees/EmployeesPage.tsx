import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserX, UserCheck, Trash2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatDate } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { MembershipStatus, Role } from "../../../types";

interface MemberRow {
  id: string;
  userId: string;
  businessId: string;
  role: Role;
  status: MembershipStatus;
  department: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  user: { id: string; fullName: string; email: string; avatarUrl: string | null; isActive: boolean };
}

const ROLE_TONE: Record<Role, "info" | "success" | "neutral" | "warning"> = {
  OWNER: "info",
  MANAGER: "success",
  CASHIER: "neutral",
  ACCOUNTANT: "warning",
  STAFF: "neutral",
};

const STATUS_TONE: Record<MembershipStatus, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "danger",
};

const INVITE_ROLES: { value: Role; label: string }[] = [
  { value: "MANAGER", label: "Manager" },
  { value: "CASHIER", label: "Cashier" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "STAFF", label: "Staff" },
];

interface InviteForm {
  fullName: string;
  email: string;
  role: Role;
  department: string;
}

const EMPTY_INVITE: InviteForm = { fullName: "", email: "", role: "STAFF", department: "" };

export default function EmployeesPage() {
  const { activeBusinessId, role } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const canInvite = role === "OWNER" || role === "MANAGER";
  const canManage = role === "OWNER";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE);
  const [inviting, setInviting] = useState(false);

  const [roleTarget, setRoleTarget] = useState<MemberRow | null>(null);
  const [newRole, setNewRole] = useState<Role>("STAFF");
  const [changingRole, setChangingRole] = useState(false);

  const [statusTarget, setStatusTarget] = useState<MemberRow | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["members", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/members`)).data.members as MemberRow[],
    enabled: !!activeBusinessId,
  });

  async function handleInvite() {
    if (!invite.fullName.trim() || !invite.email.trim()) {
      push("error", "Full name and email are required");
      return;
    }
    setInviting(true);
    try {
      await api.post(`/businesses/${activeBusinessId}/members`, {
        email: invite.email.trim(),
        fullName: invite.fullName.trim(),
        role: invite.role,
        department: invite.department.trim() || undefined,
      });
      push("success", "Invitation sent");
      setInviteOpen(false);
      setInvite(EMPTY_INVITE);
      queryClient.invalidateQueries({ queryKey: ["members", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  function openRoleChange(m: MemberRow) {
    setNewRole(m.role);
    setRoleTarget(m);
  }

  async function handleRoleChange() {
    if (!roleTarget) return;
    setChangingRole(true);
    try {
      await api.patch(`/businesses/${activeBusinessId}/members/${roleTarget.id}`, { role: newRole });
      push("success", "Role updated");
      setRoleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["members", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setChangingRole(false);
    }
  }

  async function handleStatusToggle() {
    if (!statusTarget) return;
    setChangingStatus(true);
    try {
      const nextStatus: MembershipStatus = statusTarget.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
      await api.patch(`/businesses/${activeBusinessId}/members/${statusTarget.id}`, { status: nextStatus });
      push("success", nextStatus === "SUSPENDED" ? "Employee suspended" : "Employee reactivated");
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ["members", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/businesses/${activeBusinessId}/members/${removeTarget.id}`);
      push("success", "Employee removed");
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["members", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  const columns: Column<MemberRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Employee",
        render: (m) => (
          <div className="flex items-center gap-3">
            {m.user.avatarUrl ? (
              <img src={m.user.avatarUrl} alt={m.user.fullName} className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                {m.user.fullName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900 dark:text-white">{m.user.fullName}</p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{m.user.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (m) => <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>,
      },
      {
        key: "status",
        header: "Status",
        render: (m) => <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>,
      },
      {
        key: "department",
        header: "Department",
        render: (m) => <span className="text-ink-600 dark:text-ink-300">{m.department ?? "—"}</span>,
      },
      {
        key: "joined",
        header: "Joined",
        render: (m) => (
          <span className="text-ink-600 dark:text-ink-300">
            {m.joinedAt ? formatDate(m.joinedAt) : <span className="text-ink-400 dark:text-ink-500">Pending</span>}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (m) =>
          canManage ? (
            <div className="flex justify-end gap-1">
              <button
                className="btn-ghost p-2"
                aria-label="Change role"
                title="Change role"
                onClick={(e) => {
                  e.stopPropagation();
                  openRoleChange(m);
                }}
              >
                <ShieldCheck className="h-4 w-4" />
              </button>
              <button
                className="btn-ghost p-2"
                aria-label={m.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                title={m.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusTarget(m);
                }}
              >
                {m.status === "SUSPENDED" ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
              </button>
              <button
                className="btn-ghost p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Remove employee"
                title={m.role === "OWNER" ? "The owner can't be removed" : "Remove employee"}
                disabled={m.role === "OWNER"}
                onClick={(e) => {
                  e.stopPropagation();
                  setRemoveTarget(m);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null,
      },
    ],
    [canManage]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Employees</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage your team's access and roles.</p>
        </div>
        {canInvite && (
          <button
            className="btn-primary"
            onClick={() => {
              setInvite(EMPTY_INVITE);
              setInviteOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Invite Employee
          </button>
        )}
      </div>

      {membersQuery.isError ? (
        <ErrorState message={getApiErrorMessage(membersQuery.error)} onRetry={() => membersQuery.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={membersQuery.data ?? []}
          rowKey={(m) => m.id}
          isLoading={membersQuery.isLoading}
          emptyTitle="No employees yet"
          emptyDescription="Invite your first team member to get started."
        />
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Employee"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>
                {INVITE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department (optional)</label>
              <input className="input" value={invite.department} onChange={(e) => setInvite({ ...invite, department: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        title={`Change role — ${roleTarget?.user.fullName ?? ""}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRoleTarget(null)} disabled={changingRole}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleRoleChange} disabled={changingRole}>
              {changingRole ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div>
          <label className="label">Role</label>
          <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === "SUSPENDED" ? "Reactivate employee" : "Suspend employee"}
        description={
          statusTarget?.status === "SUSPENDED"
            ? `Reactivate ${statusTarget?.user.fullName}? They will regain access to this business.`
            : `Suspend ${statusTarget?.user.fullName}? They will lose access to this business until reactivated.`
        }
        confirmLabel={statusTarget?.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
        danger={statusTarget?.status !== "SUSPENDED"}
        onConfirm={handleStatusToggle}
        onCancel={() => setStatusTarget(null)}
        loading={changingStatus}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove employee"
        description={`Remove ${removeTarget?.user.fullName} from this business? This can't be undone.`}
        confirmLabel="Remove"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={removing}
      />
    </div>
  );
}
