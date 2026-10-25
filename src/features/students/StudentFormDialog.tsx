import * as React from 'react';
import { Info } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useEduTrace } from '@/lib/demo/store';
import { ACADEMIC_YEARS, ENROLMENT_STATUSES, type Course, type EnrolmentStatus, type Student } from '@/types';

interface FormState {
  regNumber: string;
  name: string;
  courseId: string;
  academicYear: string;
  admissionDate: string;
  enrolmentStatus: EnrolmentStatus;
  apaarId: string;
}

function emptyForm(courses: Course[]): FormState {
  return {
    regNumber: '',
    name: '',
    courseId: courses[0]?.id ?? '',
    academicYear: ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1],
    admissionDate: '',
    enrolmentStatus: 'Active',
    apaarId: '',
  };
}

export function AddStudentDialog({
  open,
  onOpenChange,
  institutionId,
  courses,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  courses: Course[];
  onCreated?: (student: Student) => void;
}) {
  const { data, actions } = useEduTrace();
  const [form, setForm] = React.useState<FormState>(() => emptyForm(courses));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setForm(emptyForm(courses));
      setErrors({});
    }
  }, [open, courses]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.regNumber.trim()) next.regNumber = 'Registration number is required.';
    else {
      const duplicate = data.students.some(
        (student) =>
          student.institutionId === institutionId &&
          student.regNumber.toLowerCase() === form.regNumber.trim().toLowerCase(),
      );
      if (duplicate) next.regNumber = 'This registration number already exists in your registry.';
    }
    if (form.name.trim().length < 3) next.name = 'Enter the student name (at least 3 characters).';
    if (!form.courseId) next.courseId = 'Select an approved course.';
    if (!form.admissionDate) next.admissionDate = 'Admission date is required.';
    else if (new Date(form.admissionDate) > new Date()) next.admissionDate = 'Admission date cannot be in the future.';
    if (form.apaarId && !/^\d{12}$/.test(form.apaarId.trim())) {
      next.apaarId = 'APAAR identifiers must be 12 digits. Leave blank if not available.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const student = actions.addStudent({
      institutionId,
      regNumber: form.regNumber.trim(),
      name: form.name.trim(),
      courseId: form.courseId,
      academicYear: form.academicYear,
      admissionDate: form.admissionDate,
      enrolmentStatus: form.enrolmentStatus,
      apaarId: form.apaarId.trim() || null,
      apaarStatus: form.apaarId.trim() ? 'Pending' : 'Not Provided',
    });
    onCreated?.(student);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a student record</DialogTitle>
          <DialogDescription>
            The record is added to your institution registry and audited. Identifiers recorded here
            are marked Pending until the verification adapter responds.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="add-reg" className="mb-1 block">
                Registration number <span className="text-critical">*</span>
              </Label>
              <Input
                id="add-reg"
                value={form.regNumber}
                onChange={(event) => update('regNumber', event.target.value)}
                placeholder="SGIET/2026/CSE/091"
                aria-invalid={Boolean(errors.regNumber)}
              />
              {errors.regNumber && <p className="mt-1 text-2xs text-critical">{errors.regNumber}</p>}
            </div>
            <div>
              <Label htmlFor="add-name" className="mb-1 block">
                Student name <span className="text-critical">*</span>
              </Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="Full name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="mt-1 text-2xs text-critical">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="add-course" className="mb-1 block">
                Course <span className="text-critical">*</span>
              </Label>
              <SelectRoot value={form.courseId} onValueChange={(value) => update('courseId', value)}>
                <SelectTrigger id="add-course" aria-invalid={Boolean(errors.courseId)}>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} · {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
              {errors.courseId && <p className="mt-1 text-2xs text-critical">{errors.courseId}</p>}
            </div>
            <div>
              <Label htmlFor="add-year" className="mb-1 block">
                Academic year
              </Label>
              <SelectRoot value={form.academicYear} onValueChange={(value) => update('academicYear', value)}>
                <SelectTrigger id="add-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            <div>
              <Label htmlFor="add-admission" className="mb-1 block">
                Admission date <span className="text-critical">*</span>
              </Label>
              <Input
                id="add-admission"
                type="date"
                value={form.admissionDate}
                onChange={(event) => update('admissionDate', event.target.value)}
                aria-invalid={Boolean(errors.admissionDate)}
              />
              {errors.admissionDate && <p className="mt-1 text-2xs text-critical">{errors.admissionDate}</p>}
            </div>
            <div>
              <Label htmlFor="add-status" className="mb-1 block">
                Enrolment status
              </Label>
              <SelectRoot
                value={form.enrolmentStatus}
                onValueChange={(value) => update('enrolmentStatus', value as EnrolmentStatus)}
              >
                <SelectTrigger id="add-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENROLMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
          </div>

          <div>
            <Label htmlFor="add-apaar" className="mb-1 block">
              APAAR ID (optional)
            </Label>
            <Input
              id="add-apaar"
              value={form.apaarId}
              onChange={(event) => update('apaarId', event.target.value.replace(/\s+/g, ''))}
              placeholder="12-digit identifier"
              inputMode="numeric"
              aria-invalid={Boolean(errors.apaarId)}
            />
            {errors.apaarId && <p className="mt-1 text-2xs text-critical">{errors.apaarId}</p>}
            <p className="mt-1 flex items-start gap-1 text-2xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              Never invent an identifier. Leave blank to track the student as missing an identifier.
              Recording an identifier does not mean it is verified.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditStudentDialog({
  student,
  open,
  onOpenChange,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actions } = useEduTrace();
  const [enrolmentStatus, setEnrolmentStatus] = React.useState<EnrolmentStatus>(student.enrolmentStatus);
  const [apaarId, setApaarId] = React.useState(student.apaarId ?? '');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEnrolmentStatus(student.enrolmentStatus);
      setApaarId(student.apaarId ?? '');
      setReason('');
      setError(null);
    }
  }, [open, student]);

  const identifierChanged = (student.apaarId ?? '') !== apaarId.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (apaarId && !/^\d{12}$/.test(apaarId.trim())) {
      setError('APAAR identifiers must be 12 numeric digits, or left blank.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Provide a reason of at least 10 characters. The reason is stored in the audit history.');
      return;
    }

    const patch: Partial<Student> = {
      enrolmentStatus,
      apaarId: apaarId.trim() || null,
    };
    if (identifierChanged) {
      patch.apaarStatus = apaarId.trim() ? 'Pending' : 'Not Provided';
    }
    if (enrolmentStatus !== student.enrolmentStatus || identifierChanged) {
      actions.updateStudent(student.id, patch, reason.trim());
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit student record</DialogTitle>
          <DialogDescription>
            {student.name} · {student.recordId}. Changes are recorded in the audit history with your
            reason.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="edit-status" className="mb-1 block">
              Enrolment status
            </Label>
            <SelectRoot
              value={enrolmentStatus}
              onValueChange={(value) => setEnrolmentStatus(value as EnrolmentStatus)}
            >
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENROLMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <Label htmlFor="edit-apaar" className="mb-1 block">
              APAAR ID
            </Label>
            <Input
              id="edit-apaar"
              value={apaarId}
              onChange={(event) => setApaarId(event.target.value.replace(/\s+/g, ''))}
              placeholder="12-digit identifier"
              inputMode="numeric"
            />
            <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
              {student.apaarStatus === 'Verified by Authorized Source'
                ? 'This identifier is currently marked verified by the simulated adapter. Changing it resets the status to Pending.'
                : 'Identifiers are never marked verified from this form. Verification status is set only by the (simulated) adapter.'}
            </p>
          </div>
          <div className="rounded border border-border bg-muted/50 px-2.5 py-2 text-2xs text-muted-foreground">
            Current APAAR status: <span className="font-medium text-foreground">{student.apaarStatus}</span>
          </div>
          <div>
            <Label htmlFor="edit-reason" className="mb-1 block">
              Reason for change <span className="text-critical">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Withdrawal request received from the student on 12 October 2026."
              rows={2}
            />
          </div>
          {error && (
            <p role="alert" className="text-2xs text-critical">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
