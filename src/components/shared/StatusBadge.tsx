import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  APAAR_STATUS_META,
  ISSUE_STATUS_META,
  SUBMISSION_STATUS_META,
  VERIFICATION_STATUS_META,
  type ApaarStatus,
  type Course,
  type EnrolmentStatus,
  type IssueStatus,
  type Severity,
  type SubmissionStatus,
  type ValidationStatus,
  type VerificationStatus,
} from '@/types';

type Tone = 'success' | 'warning' | 'critical' | 'info' | 'muted';

const dotTone: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
  info: 'bg-secondary',
  muted: 'bg-muted-foreground/60',
};

export function StatusBadge({
  tone = 'muted',
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={cn('whitespace-nowrap', className)}>
      {dot && <span className={cn('size-1.5 shrink-0 rounded-full', dotTone[tone])} aria-hidden />}
      {children}
    </Badge>
  );
}

export function ApaarStatusBadge({ status }: { status: ApaarStatus }) {
  return <StatusBadge tone={APAAR_STATUS_META[status].tone}>{status}</StatusBadge>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <StatusBadge tone={ISSUE_STATUS_META[status]}>{status}</StatusBadge>;
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return <StatusBadge tone={SUBMISSION_STATUS_META[status]}>{status}</StatusBadge>;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge tone={VERIFICATION_STATUS_META[status]}>{status}</StatusBadge>;
}

export function ReferenceStatusBadge({ status }: { status: Course['verificationStatus'] }) {
  const tone: Tone = status === 'Verified' ? 'success' : status === 'Provisional' ? 'warning' : 'critical';
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone: Tone =
    severity === 'Critical' ? 'critical' : severity === 'High' ? 'warning' : severity === 'Medium' ? 'info' : 'muted';
  return <StatusBadge tone={tone}>{severity}</StatusBadge>;
}

export function EnrolmentStatusBadge({ status }: { status: EnrolmentStatus }) {
  const tone: Tone =
    status === 'Active' || status === 'Admitted'
      ? 'success'
      : status === 'Pending Verification'
        ? 'warning'
        : status === 'Withdrawn' || status === 'Transferred'
          ? 'muted'
          : 'info';
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const tone: Tone =
    status === 'Valid'
      ? 'success'
      : status === 'Warning'
        ? 'warning'
        : status === 'Invalid'
          ? 'critical'
          : 'muted';
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function ComplianceStatusBadge({
  status,
}: {
  status: 'Within configured limit' | 'Potential excess' | 'Reference data unverified' | 'No approved reference';
}) {
  const tone: Tone =
    status === 'Within configured limit'
      ? 'success'
      : status === 'Potential excess'
        ? 'critical'
        : 'warning';
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}
