import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'default',
  onConfirm,
  busy,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'default' | 'critical';
  onConfirm: () => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-2.5">
            {tone === 'critical' && (
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-critical/10 text-critical">
                <AlertTriangle className="size-4" aria-hidden />
              </span>
            )}
            <div className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'critical' ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface DecisionOption {
  value: string;
  label: string;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'critical';
}

export function DecisionDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  onSubmit,
  submitLabel = 'Record decision',
  reasonLabel = 'Reason for decision',
  reasonRequired = true,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  options: DecisionOption[];
  onSubmit: (value: string, reason: string) => void;
  submitLabel?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  busy?: boolean;
}) {
  const [selected, setSelected] = React.useState(options[0]?.value ?? '');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelected(options[0]?.value ?? '');
      setReason('');
      setError(null);
    }
  }, [open, options]);

  const handleSubmit = () => {
    if (!selected) {
      setError('Select an outcome.');
      return;
    }
    if (reasonRequired && reason.trim().length < 10) {
      setError('Provide a reason of at least 10 characters. Every decision is recorded in the audit log.');
      return;
    }
    onSubmit(selected, reason.trim());
  };

  const toneClass: Record<NonNullable<DecisionOption['tone']>, string> = {
    default: 'border-secondary/40 bg-secondary/5',
    success: 'border-success/40 bg-success/5',
    warning: 'border-warning/40 bg-warning/5',
    critical: 'border-critical/40 bg-critical/5',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">Outcome</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors',
                  selected === option.value
                    ? toneClass[option.tone ?? 'default']
                    : 'border-border bg-card hover:bg-muted/40',
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={option.value}
                  checked={selected === option.value}
                  onChange={() => {
                    setSelected(option.value);
                    setError(null);
                  }}
                  className="mt-1 size-3.5 accent-[#15365C]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{option.label}</span>
                  {option.description && (
                    <span className="block text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          <div>
            <Label htmlFor="decision-reason" className="mb-1 block">
              {reasonLabel}
              {reasonRequired && <span className="text-critical"> *</span>}
            </Label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder="Explain the basis for this decision. The reason is stored in the audit history."
              rows={3}
              aria-invalid={Boolean(error)}
            />
            {error && (
              <p role="alert" className="mt-1 text-2xs text-critical">
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
