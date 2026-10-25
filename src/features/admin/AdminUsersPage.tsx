import * as React from 'react';
import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { useAdminData, useLookups } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { ROLE_LABELS, type PortalUser, type Role } from '@/types';

const ALL = 'all';

const ADMIN_ROLES: Role[] = ['aicte_admin', 'aicte_reviewer', 'auditor'];

export function AdminUsersPage() {
  const { data, actions } = useAdminData();
  const { can, user } = useAuth();
  const lookups = useLookups();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [scope, setScope] = React.useState(ALL);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<PortalUser | null>(null);

  const filtered = data.users.filter((account) => {
    if (status !== ALL && account.status !== status) return false;
    if (scope !== ALL && account.scope !== scope) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const haystack = `${account.name} ${account.email} ${ROLE_LABELS[account.role]}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const columns: Column<PortalUser>[] = [
    {
      key: 'name',
      header: 'User',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium text-foreground">{row.name}</p>
          <p className="text-2xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      cell: (row) => <span className="text-xs">{ROLE_LABELS[row.role]}</span>,
    },
    {
      key: 'scope',
      header: 'Portal',
      hideBelow: 'md',
      sortValue: (row) => row.scope,
      cell: (row) => (
        <Badge variant={row.scope === 'admin' ? 'info' : 'muted'}>
          {row.scope === 'admin' ? 'AICTE' : 'Institution'}
        </Badge>
      ),
    },
    {
      key: 'institution',
      header: 'Institution',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-2xs text-muted-foreground">
          {row.institutionId ? lookups.institutionCode(row.institutionId) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Account status',
      sortValue: (row) => row.status,
      cell: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : row.status === 'Invited' ? 'warning' : 'critical'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last activity',
      hideBelow: 'xl',
      sortValue: (row) => row.lastActive,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDateTime(row.lastActive)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) =>
        can('admin.users') ? (
          <Button
            size="xs"
            variant="outline"
            onClick={() => setPendingStatus(row)}
            disabled={row.email === user?.email}
          >
            {row.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
          </Button>
        ) : (
          <span className="text-2xs text-muted-foreground">Read-only</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="User management"
        description="Accounts with access to the AICTE administration and institution portals. Demonstration management only; production identities and roles come from Keycloak and Django."
        meta={
          <>
            <Badge variant="outline">{formatNumber(data.users.length)} accounts</Badge>
            <Badge variant="warning">Simulated administration</Badge>
          </>
        }
        actions={
          can('admin.users') ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" aria-hidden /> Invite administrator
            </Button>
          ) : (
            <Badge variant="muted">Read-only for your role</Badge>
          )
        }
      />

      <Alert tone="warning">
        <AlertTitle>Identity provider is not connected</AlertTitle>
        <AlertDescription>
          Invitations create a local demonstration record. No Keycloak user, email or credential is
          created. Production role assignment must be performed through authorized backend processes
          and must be audited.
        </AlertDescription>
      </Alert>

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email or role…"
            filters={[
              {
                key: 'status',
                label: 'Account status',
                value: status,
                onChange: setStatus,
                options: [
                  { value: ALL, label: 'All statuses' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Invited', label: 'Invited' },
                  { value: 'Suspended', label: 'Suspended' },
                ],
              },
              {
                key: 'scope',
                label: 'Portal',
                value: scope,
                onChange: setScope,
                options: [
                  { value: ALL, label: 'All portals' },
                  { value: 'admin', label: 'AICTE administration' },
                  { value: 'institution', label: 'Institution portal' },
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setStatus(ALL);
              setScope(ALL);
            }}
            resultLabel={`${filtered.length} account(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Portal accounts"
          emptyTitle="No accounts match"
          emptyDescription="Adjust the filters to review accounts."
        />
      </Panel>

      <InviteAdminDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(input) => actions.addUser({ ...input, scope: 'admin', institutionId: null })}
      />

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={
          pendingStatus?.status === 'Suspended'
            ? `Reactivate ${pendingStatus?.name}?`
            : `Suspend ${pendingStatus?.name}?`
        }
        description={
          pendingStatus?.status === 'Suspended'
            ? 'The demonstration account returns to Active status. No identity provider session is affected.'
            : 'The demonstration account is marked Suspended. Production suspension must revoke Keycloak sessions and backend permissions.'
        }
        confirmLabel={pendingStatus?.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
        tone={pendingStatus?.status === 'Suspended' ? 'default' : 'critical'}
        onConfirm={() => {
          if (pendingStatus) {
            actions.setUserStatus(
              pendingStatus.id,
              pendingStatus.status === 'Suspended' ? 'Active' : 'Suspended',
            );
          }
          setPendingStatus(null);
        }}
      />
    </div>
  );
}

function InviteAdminDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (input: { name: string; email: string; role: Role }) => void;
}) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<Role>('aicte_reviewer');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setRole('aicte_reviewer');
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite an administrator</DialogTitle>
          <DialogDescription>
            Creates a local demonstration invitation. No email or Keycloak account is created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="admin-invite-name" className="mb-1 block">Full name</Label>
            <Input id="admin-invite-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="admin-invite-email" className="mb-1 block">Official email</Label>
            <Input
              id="admin-invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="admin-invite-role" className="mb-1 block">Role</Label>
            <SelectRoot value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="admin-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          {error && (
            <p role="alert" className="text-2xs text-critical">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (name.trim().length < 3) {
                setError('Enter the administrator’s full name.');
                return;
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setError('Enter a valid official email address.');
                return;
              }
              onInvite({ name: name.trim(), email: email.trim(), role });
              onOpenChange(false);
            }}
          >
            Create invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
