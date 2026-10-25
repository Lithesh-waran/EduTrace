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
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { useInstitutionData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { ROLE_LABELS, type PortalUser, type Role } from '@/types';

const INSTITUTION_ROLES: Role[] = [
  'institution_admin',
  'institution_operator',
  'institution_verifier',
];

export function InstitutionUsersPage() {
  const { users, actions, institutionId } = useInstitutionData();
  const { can, user } = useAuth();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<PortalUser | null>(null);

  const canManage = can('users.manage');

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
      key: 'status',
      header: 'Account status',
      sortValue: (row) => row.status,
      cell: (row) => (
        <Badge
          variant={row.status === 'Active' ? 'success' : row.status === 'Invited' ? 'warning' : 'critical'}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last activity',
      hideBelow: 'md',
      sortValue: (row) => row.lastActive,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDateTime(row.lastActive)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canManage ? (
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
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal users"
        description="Demonstration user administration for your institution. Production role assignments must be performed by authorized backend operations through Keycloak and Django."
        meta={
          <>
            <Badge variant="outline">{formatNumber(users.length)} user(s)</Badge>
            <Badge variant="warning">Simulated management</Badge>
          </>
        }
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" aria-hidden /> Invite user
            </Button>
          ) : (
            <Badge variant="muted">Read-only for your role</Badge>
          )
        }
      />

      <Alert tone="warning">
        <AlertTitle>Demonstration user management</AlertTitle>
        <AlertDescription>
          Invitations and status changes are recorded in the local demonstration dataset only. No
          email is sent and no identity provider account is created. In production, users are
          provisioned through Keycloak and roles are enforced by Django.
        </AlertDescription>
      </Alert>

      <Panel bodyClassName="p-0">
        <DataTable
          rows={users}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Institution portal users"
          emptyTitle="No portal users"
          emptyDescription="No users are linked to this institution."
        />
      </Panel>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(input) => {
          actions.addUser({
            name: input.name,
            email: input.email,
            role: input.role,
            scope: 'institution',
            institutionId,
          });
        }}
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
            ? 'The demonstration account returns to Active status. Access control is not actually enforced by this mock.'
            : 'The demonstration account is marked Suspended. In production, suspending a user must revoke active Keycloak sessions.'
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

function InviteUserDialog({
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
  const [role, setRole] = React.useState<Role>('institution_operator');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setRole('institution_operator');
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a portal user</DialogTitle>
          <DialogDescription>
            The invitation is simulated. No email is sent and no Keycloak account is created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="invite-name" className="mb-1 block">
              Full name
            </Label>
            <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="invite-email" className="mb-1 block">
              Official email
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invite-role" className="mb-1 block">
              Role
            </Label>
            <SelectRoot value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTION_ROLES.map((option) => (
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
                setError('Enter the user’s full name.');
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
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
