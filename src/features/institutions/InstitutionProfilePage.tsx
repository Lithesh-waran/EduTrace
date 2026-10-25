import * as React from 'react';
import { Building2, Info, Pencil } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { VerificationStatusBadge } from '@/components/shared/StatusBadge';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { useInstitutionData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDate } from '@/lib/format';
import type { Institution, VerificationStatus } from '@/types';

const ONBOARDING_STATES: VerificationStatus[] = [
  'Draft',
  'Submitted',
  'Under Verification',
  'Correction Required',
  'Verified',
  'Rejected',
];

function OnboardingProgress({ status }: { status: VerificationStatus }) {
  const currentIndex = ONBOARDING_STATES.indexOf(status);
  return (
    <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
      {ONBOARDING_STATES.map((state, index) => {
        const isCurrent = state === status;
        const isPast =
          currentIndex >= 0 &&
          index < currentIndex &&
          !(status === 'Rejected' && index === 2);
        return (
          <li
            key={state}
            aria-current={isCurrent ? 'step' : undefined}
            className={
              isCurrent
                ? 'rounded border border-secondary/50 bg-secondary/10 px-2 py-1.5 text-2xs font-semibold text-primary'
                : isPast
                  ? 'rounded border border-success/30 bg-success/5 px-2 py-1.5 text-2xs text-success'
                  : 'rounded border border-border bg-card px-2 py-1.5 text-2xs text-muted-foreground'
            }
          >
            <span className="block text-[9px] uppercase tracking-wide opacity-75">Step {index + 1}</span>
            {state}
          </li>
        );
      })}
    </ol>
  );
}

export function InstitutionProfilePage() {
  const { institution, actions, audit } = useInstitutionData();
  const { can } = useAuth();
  const [editOpen, setEditOpen] = React.useState(false);

  if (!institution) {
    return (
      <Panel title="Institution profile unavailable">
        <p className="text-sm text-muted-foreground">
          This demonstration account is not linked to an institution profile.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institution profile"
        description="Institution identity and approval details. Authoritative approval references and approved intake are managed by AICTE and are read-only here."
        meta={
          <>
            <VerificationStatusBadge status={institution.verificationStatus} />
            <Badge variant="outline" className="font-mono">
              {institution.aicteId}
            </Badge>
            <Badge variant="muted">Last updated {formatDate(institution.lastUpdated)}</Badge>
          </>
        }
        actions={
          can('profile.edit') ? (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden /> Edit profile
            </Button>
          ) : (
            <Badge variant="muted">Read-only for your role</Badge>
          )
        }
      />

      <Panel title="Onboarding and verification state" description="Current position in the institutional verification lifecycle.">
        <OnboardingProgress status={institution.verificationStatus} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border border-border px-3 py-2">
            <p className="data-label">Approval source</p>
            <p className="mt-1 text-xs text-foreground">{institution.approvalSource}</p>
          </div>
          <div className="rounded border border-border px-3 py-2">
            <p className="data-label">Last verified</p>
            <p className="mt-1 text-xs text-foreground">
              {institution.lastVerifiedOn ? formatDate(institution.lastVerifiedOn) : 'Not yet verified'}
            </p>
          </div>
          <div className="rounded border border-border px-3 py-2">
            <p className="data-label">Approval period</p>
            <p className="mt-1 text-xs text-foreground">
              {formatDate(institution.approvalFrom)} → {formatDate(institution.approvalTo)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Institutional identity" description="Core identity fields sourced from the AICTE institution registry.">
          <DefinitionList
            columns={2}
            items={[
              { label: 'AICTE Permanent ID', value: institution.aicteId, mono: true },
              { label: 'Official institution name', value: institution.name },
              { label: 'Institution type', value: institution.type },
              { label: 'Management type', value: institution.managementType },
              { label: 'Approval reference', value: institution.approvalRef, mono: true },
              { label: 'Approval period', value: `${formatDate(institution.approvalFrom)} → ${formatDate(institution.approvalTo)}` },
              { label: 'Verification status', value: <VerificationStatusBadge status={institution.verificationStatus} /> },
              { label: 'Last verified', value: institution.lastVerifiedOn ? formatDate(institution.lastVerifiedOn) : 'Not yet verified' },
            ]}
          />
        </Panel>

        <Panel title="Contact and administration" description="Details the institution may maintain. Changes are audited with a reason.">
          <DefinitionList
            columns={2}
            items={[
              { label: 'Official contact email', value: institution.email },
              { label: 'Official contact number', value: institution.phone },
              { label: 'Address', value: institution.address, span: 2 },
              { label: 'State', value: institution.state },
              { label: 'District', value: institution.district },
              { label: 'Head of institution', value: institution.headOfInstitution },
              { label: 'Authorized portal administrator', value: institution.portalAdministrator },
            ]}
          />
          <p className="mt-3 flex items-start gap-1.5 rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            Institution name, AICTE Permanent ID, approval reference and approved intake are
            authoritative fields and cannot be edited here. Contact AICTE for corrections.
          </p>
        </Panel>
      </div>

      <Panel title="Reviewer history" description="Decisions recorded by the reviewing authority.">
        {institution.reviewerComments.length === 0 ? (
          <p className="rounded border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No reviewer decisions have been recorded for this institution.
          </p>
        ) : (
          <ul className="space-y-2">
            {[...institution.reviewerComments]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((comment, index) => (
                <li key={`${comment.at}-${index}`} className="rounded border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{comment.decision}</Badge>
                    <span className="text-2xs text-muted-foreground">{formatDate(comment.at)}</span>
                    <span className="ml-auto text-2xs text-muted-foreground">{comment.actor}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/90">{comment.reason}</p>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent profile activity" description="Audit events for this institution.">
        <AuditTimeline events={audit.slice(0, 6)} />
      </Panel>

      <EditProfileDialog
        institution={institution}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(patch, reason) => actions.updateInstitution(institution.id, patch, reason)}
      />
    </div>
  );
}

function EditProfileDialog({
  institution,
  open,
  onOpenChange,
  onSave,
}: {
  institution: Institution;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<Institution>, reason: string) => void;
}) {
  const [form, setForm] = React.useState({
    email: institution.email,
    phone: institution.phone,
    address: institution.address,
    district: institution.district,
    headOfInstitution: institution.headOfInstitution,
    portalAdministrator: institution.portalAdministrator,
  });
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        email: institution.email,
        phone: institution.phone,
        address: institution.address,
        district: institution.district,
        headOfInstitution: institution.headOfInstitution,
        portalAdministrator: institution.portalAdministrator,
      });
      setReason('');
      setError(null);
    }
  }, [open, institution]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid official contact email address.');
      return;
    }
    if (form.phone.trim().length < 8) {
      setError('Enter a valid official contact number.');
      return;
    }
    if (form.headOfInstitution.trim().length < 3 || form.portalAdministrator.trim().length < 3) {
      setError('Head of institution and portal administrator names are required.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Provide a reason of at least 10 characters. Profile changes are audited.');
      return;
    }
    onSave(
      {
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        district: form.district.trim(),
        headOfInstitution: form.headOfInstitution.trim(),
        portalAdministrator: form.portalAdministrator.trim(),
      },
      reason.trim(),
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit institution profile</DialogTitle>
          <DialogDescription>
            Only contact and administration fields can be changed. Authoritative approval fields are
            controlled by AICTE.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-email" className="mb-1 block">Official email</Label>
              <Input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="mb-1 block">Official contact number</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="profile-address" className="mb-1 block">Address</Label>
            <Textarea
              id="profile-address"
              rows={2}
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-district" className="mb-1 block">District</Label>
              <Input
                id="profile-district"
                value={form.district}
                onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="profile-head" className="mb-1 block">Head of institution</Label>
              <Input
                id="profile-head"
                value={form.headOfInstitution}
                onChange={(event) => setForm((current) => ({ ...current, headOfInstitution: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="profile-admin" className="mb-1 block">Authorized portal administrator</Label>
            <Input
              id="profile-admin"
              value={form.portalAdministrator}
              onChange={(event) => setForm((current) => ({ ...current, portalAdministrator: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="profile-reason" className="mb-1 block">
              Reason for change <span className="text-critical">*</span>
            </Label>
            <Textarea
              id="profile-reason"
              rows={2}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Registrar contact details updated following the appointment on 1 October 2026."
            />
          </div>
          {error && (
            <p role="alert" className="text-2xs text-critical">
              {error}
            </p>
          )}
          <Alert tone="neutral" hideIcon>
            <AlertDescription>
              Profile changes do not alter verification status. AICTE must re-verify any field that
              affects the institutional approval.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              <Building2 className="size-3.5" aria-hidden /> Save profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
