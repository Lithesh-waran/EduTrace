import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { FileUploadZone, validateCsvFile } from '@/components/shared/FileUploadZone';
import { CsvPreviewTable, FindingList } from '@/components/shared/CsvPreviewTable';
import { EmptyState } from '@/components/shared/States';
import { SubmissionStatusBadge } from '@/components/shared/StatusBadge';
import { useInstitutionData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatBytes, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  CSV_COLUMNS,
  emptyCsvValues,
  validateCsvRows,
  type CsvValues,
  type ParsedCsvRow,
  type RawCsvRow,
} from '@/lib/validation/engine';
import { downloadCsvTemplate, parseCsvFile, writeCsvErrorReport } from '@/lib/validation/csv';
import { ACADEMIC_YEARS, type Submission } from '@/types';

const STEPS = [
  'Download template',
  'Upload CSV',
  'Preview records',
  'Validate data',
  'Review errors',
  'Confirm submission',
  'Batch status',
] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
      {STEPS.map((label, index) => {
        const state = index < step ? 'complete' : index === step ? 'current' : 'upcoming';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded border px-2 py-1.5 text-2xs',
              state === 'current' && 'border-secondary/50 bg-secondary/10 font-semibold text-primary',
              state === 'complete' && 'border-success/30 bg-success/5 text-success',
              state === 'upcoming' && 'border-border bg-card text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                state === 'current' && 'bg-primary text-primary-foreground',
                state === 'complete' && 'bg-success text-white',
                state === 'upcoming' && 'bg-muted text-muted-foreground',
              )}
            >
              {state === 'complete' ? <CheckCircle2 className="size-3" aria-hidden /> : index + 1}
            </span>
            <span className="truncate">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SummaryTiles({
  file,
  rows,
  valid,
  invalid,
  duplicates,
  missing,
  warnings,
  fatal,
}: {
  file: File | null;
  rows: number;
  valid: number;
  invalid: number;
  duplicates: number;
  missing: number;
  warnings: number;
  fatal: number;
}) {
  const tiles = [
    { label: 'Rows parsed', value: formatNumber(rows), tone: 'neutral' },
    { label: 'Valid records', value: formatNumber(valid), tone: 'success' },
    { label: 'Invalid records', value: formatNumber(invalid), tone: 'critical' },
    { label: 'Duplicate candidates', value: formatNumber(duplicates), tone: 'warning' },
    { label: 'Missing fields', value: formatNumber(missing), tone: 'warning' },
    { label: 'Warnings', value: formatNumber(warnings), tone: 'warning' },
    { label: 'Fatal errors', value: formatNumber(fatal), tone: 'critical' },
  ];
  return (
    <div className="space-y-2">
      {file && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
          <FileSpreadsheet className="size-3.5 text-secondary" aria-hidden />
          <span className="font-medium text-foreground">{file.name}</span>
          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded border border-border bg-card px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p
              className={cn(
                'mt-0.5 text-lg font-semibold leading-none',
                tile.tone === 'success' && 'text-success',
                tile.tone === 'critical' && 'text-critical',
                tile.tone === 'warning' && 'text-[#96660d]',
                tile.tone === 'neutral' && 'text-foreground',
              )}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UploadPage() {
  const { institution, institutionId, courses, students, actions, data } = useInstitutionData();
  const { can, user } = useAuth();
  const canUpload = can('upload.create');

  const [step, setStep] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [rows, setRows] = React.useState<RawCsvRow[]>([]);
  const [parseErrors, setParseErrors] = React.useState<string[]>([]);
  const [parsing, setParsing] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [primaryYear, setPrimaryYear] = React.useState<string>(ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]);
  const [editingRow, setEditingRow] = React.useState<ParsedCsvRow | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [submission, setSubmission] = React.useState<Submission | null>(null);

  const result = React.useMemo(() => {
    if (!institution || rows.length === 0) return null;
    return validateCsvRows(rows, {
      institution,
      courses,
      students,
      allStudents: data.students,
    });
  }, [rows, institution, courses, students, data.students]);

  const reset = () => {
    setStep(0);
    setFile(null);
    setRows([]);
    setParseErrors([]);
    setFileError(null);
    setEditingRow(null);
    setAcknowledged(false);
    setSubmission(null);
  };

  const handleFile = async (selected: File) => {
    const validationError = validateCsvFile(selected);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setFileError(null);
    setFile(selected);
    setParsing(true);
    setParseErrors([]);
    setRows([]);
    setSubmission(null);
    setAcknowledged(false);
    try {
      const parsed = await parseCsvFile(selected);
      setParseErrors(parsed.errors);
      setRows(parsed.rows);
      if (parsed.rows.length > 0) setStep(2);
    } catch (error) {
      setFileError(
        error instanceof Error ? `The file could not be parsed: ${error.message}` : 'The file could not be parsed.',
      );
    } finally {
      setParsing(false);
    }
  };

  const updateRowValues = (rowNumber: number, values: CsvValues) => {
    setRows((current) =>
      current.map((row) => (row.rowNumber === rowNumber ? { ...row, values } : row)),
    );
    setEditingRow(null);
    setAcknowledged(false);
  };

  const handleCommit = () => {
    if (!result || !institution || !file) return;
    const validRows = result.rows.filter((row) => !row.blocking && row.courseId);
    const skipped = result.rows
      .filter((row) => row.blocking)
      .map((row) => ({
        rowNumber: row.rowNumber,
        recordRef: row.values.registration_number || `Row ${row.rowNumber}`,
        findings: row.findings.map((finding) => ({
          ruleId: finding.ruleId,
          ruleName: finding.ruleName,
          severity: finding.severity,
          recordRef: row.values.registration_number || `Row ${row.rowNumber}`,
          reason: finding.reason,
          evidence: finding.evidence,
          suggestedAction: finding.suggestedAction,
        })),
      }));

    const created = actions.commitUpload({
      institutionId,
      academicYear: primaryYear,
      file: { name: file.name, sizeBytes: file.size, rows: result.summary.totalRows },
      rows: validRows.map((row) => ({
        regNumber: row.values.registration_number,
        name: row.values.student_name,
        courseId: row.courseId as string,
        academicYear: row.values.academic_year,
        admissionDate: row.values.admission_date,
        enrolmentStatus: row.values.enrolment_status as never,
        apaarId: row.values.apaar_id || null,
        apaarStatus: row.values.apaar_id ? 'Pending' : 'Not Provided',
      })),
      skipped,
      summary: {
        recordCount: result.summary.totalRows,
        duplicateCandidates: result.summary.duplicateCandidates,
      },
    });
    setSubmission(created);
    setStep(6);
  };

  if (!institution) {
    return (
      <EmptyState
        title="Institution profile required"
        description="Bulk upload is available to institution portal roles only."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk CSV upload"
        description="Upload enrolment records, validate them against deterministic rules, correct row-level errors and submit the batch for AICTE review."
        meta={
          <>
            <Badge variant="warning">Synthetic demonstration workflow</Badge>
            <Badge variant="outline">Deterministic validation only</Badge>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/institution/submissions">View submissions</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
              <Download className="size-4" aria-hidden /> Download template
            </Button>
          </>
        }
      />

      <Stepper step={step} />

      <Alert tone="warning">
        <AlertTitle>Frontend validation is advisory</AlertTitle>
        <AlertDescription>
          Rows are validated in this browser for the demonstration using the shared rule catalogue.
          In production the same rules must run on the Django backend, which remains the final
          authority, and the original file must be stored in private object storage.
        </AlertDescription>
      </Alert>

      {!canUpload && (
        <Alert tone="critical">
          <AlertTitle>Upload not permitted for this role</AlertTitle>
          <AlertDescription>
            The signed-in role cannot submit batches. A demonstration administrator or data operator
            account is required.
          </AlertDescription>
        </Alert>
      )}

      {step === 0 && (
        <Panel
          title="Step 1 · Download the CSV template"
          description="Use the exact column headers. Do not add APAAR identifiers that were not provided by the student."
        >
          <div className="overflow-x-auto scrollbar-thin rounded border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Column</th>
                  <th scope="col" className="px-3 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Required</th>
                  <th scope="col" className="px-3 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Guidance</th>
                </tr>
              </thead>
              <tbody>
                {CSV_COLUMNS.map((column) => (
                  <tr key={column.key} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs text-foreground">{column.key}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant={column.required ? 'critical' : 'muted'}>
                        {column.required ? 'Required' : 'Optional'}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{column.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={downloadCsvTemplate}>
              <Download className="size-4" aria-hidden /> Download CSV template
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              Continue to upload <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel
          title="Step 2 · Upload the completed CSV"
          description={`Batch files are validated against approved courses for ${institution.name}.`}
        >
          {!canUpload ? (
            <EmptyState title="Upload disabled" description="Sign in with an administrator or data operator role to continue." />
          ) : (
            <>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[12rem_1fr] sm:items-end">
                <div>
                  <Label htmlFor="primary-year" className="mb-1 block">
                    Primary academic year
                  </Label>
                  <SelectRoot value={primaryYear} onValueChange={setPrimaryYear}>
                    <SelectTrigger id="primary-year">
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
                <p className="text-2xs leading-relaxed text-muted-foreground">
                  Used on the submission record. Each row is still validated against its own academic
                  year.
                </p>
              </div>
              <FileUploadZone
                file={file}
                onFile={handleFile}
                onClear={() => {
                  setFile(null);
                  setRows([]);
                  setParseErrors([]);
                }}
                error={fileError}
                disabled={parsing || !canUpload}
              />
              {parsing && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Parsing file…
                </p>
              )}
              {parseErrors.length > 0 && (
                <Alert tone="critical" className="mt-3">
                  <AlertTitle>File parsing issues</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {parseErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {rows.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="success">{formatNumber(rows.length)} data row(s) parsed</Badge>
                  <Button size="sm" onClick={() => setStep(2)}>
                    Continue to preview <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="size-4" aria-hidden /> Back
                  </Button>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {step === 2 && result && (
        <Panel
          title="Step 3 · Preview parsed records"
          description="Every parsed row is shown with its original file row number. Rows are never discarded silently."
          actions={
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <RefreshCw className="size-3.5" aria-hidden /> Replace file
            </Button>
          }
        >
          <div className="max-h-[24rem] overflow-auto scrollbar-thin rounded border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th scope="col" className="px-2.5 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Row</th>
                  {CSV_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className="whitespace-nowrap px-2.5 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-border">
                    <td className="px-2.5 py-1.5 font-mono text-2xs text-muted-foreground">{row.rowNumber}</td>
                    {CSV_COLUMNS.map((column) => (
                      <td key={column.key} className="max-w-[12rem] truncate px-2.5 py-1.5 text-foreground">
                        {row.values[column.key] || <span className="italic text-muted-foreground">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setStep(3)}>
              Run validation <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Button>
            <span className="text-2xs text-muted-foreground">
              {formatNumber(result.summary.totalRows)} row(s) ready for validation.
            </span>
          </div>
        </Panel>
      )}

      {step === 3 && result && (
        <div className="space-y-3">
          <Panel
            title="Step 4 · Deterministic validation results"
            description="Rules run in a fixed order against approved courses, the existing registry and duplicate checks."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => writeCsvErrorReport(result, file?.name ?? 'upload')}
                disabled={result.summary.fatalErrors === 0}
              >
                <Download className="size-3.5" aria-hidden /> Download error report
              </Button>
            }
          >
            <SummaryTiles
              file={file}
              rows={result.summary.totalRows}
              valid={result.summary.validRecords}
              invalid={result.summary.invalidRecords}
              duplicates={result.summary.duplicateCandidates}
              missing={result.summary.missingFields}
              warnings={result.summary.warnings}
              fatal={result.summary.fatalErrors}
            />
          </Panel>

          <Panel
            title="Row-level results"
            description="Blocking findings must be corrected before the row can be added to the registry."
            bodyClassName="p-3"
          >
            <CsvPreviewTable rows={result.rows} onEdit={(rowNumber) => {
              const row = result.rows.find((candidate) => candidate.rowNumber === rowNumber);
              if (row) setEditingRow(row);
            }} />
          </Panel>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setStep(4)} disabled={result.summary.invalidRecords > 0}>
              Review errors <ArrowRight className="size-4" aria-hidden />
            </Button>
            {result.summary.invalidRecords > 0 && (
              <span className="text-2xs text-critical">
                {formatNumber(result.summary.invalidRecords)} row(s) contain blocking findings. Use
                “Review errors” to correct them or continue to submit only the valid rows.
              </span>
            )}
            {result.summary.invalidRecords === 0 && (
              <span className="text-2xs text-success">All rows passed validation.</span>
            )}
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setStep(2)}>
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Button>
            {result.summary.invalidRecords > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStep(4)}>
                Review and correct
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="space-y-3">
          <Panel
            title="Step 5 · Review errors"
            description="Correct values inline. Validation re-runs immediately for every row."
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <Upload className="size-3.5" aria-hidden /> Upload corrected file
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => writeCsvErrorReport(result, file?.name ?? 'upload')}
                >
                  <Download className="size-3.5" aria-hidden /> Error report
                </Button>
              </>
            }
          >
            <SummaryTiles
              file={file}
              rows={result.summary.totalRows}
              valid={result.summary.validRecords}
              invalid={result.summary.invalidRecords}
              duplicates={result.summary.duplicateCandidates}
              missing={result.summary.missingFields}
              warnings={result.summary.warnings}
              fatal={result.summary.fatalErrors}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {result.rows.filter((row) => row.blocking).length === 0 ? (
              <Panel title="No blocking errors" className="xl:col-span-2">
                <EmptyState
                  title="All rows passed validation"
                  description="Continue to confirm the submission. Warnings such as missing identifiers do not block the batch."
                  action={<Button size="sm" onClick={() => setStep(5)}>Continue to confirm</Button>}
                />
              </Panel>
            ) : (
              result.rows
                .filter((row) => row.blocking)
                .map((row) => (
                  <div key={row.rowNumber} className="rounded-lg border border-critical/30 bg-card">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                      <Badge variant="critical">Row {row.rowNumber}</Badge>
                      <span className="font-mono text-2xs text-muted-foreground">
                        {row.values.registration_number || 'No registration number'}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {row.values.student_name}
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        className="ml-auto"
                        onClick={() => setEditingRow(row)}
                      >
                        Correct row
                      </Button>
                    </div>
                    <div className="p-2.5">
                      <FindingList row={row} />
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setStep(5)}
              disabled={result.summary.validRecords === 0}
            >
              Continue to confirm <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="size-4" aria-hidden /> Validation results
            </Button>
            <span className="text-2xs text-muted-foreground">
              {formatNumber(result.summary.validRecords)} valid row(s) will be added;{' '}
              {formatNumber(result.summary.invalidRecords)} will be retained as validation issues and
              excluded from the registry.
            </span>
          </div>
        </div>
      )}

      {step === 5 && result && (
        <Panel
          title="Step 6 · Confirm submission"
          description="Review the batch summary. Submitting records a batch, creates validation issues for excluded rows and notifies the reviewing authority."
        >
          <SummaryTiles
            file={file}
            rows={result.summary.totalRows}
            valid={result.summary.validRecords}
            invalid={result.summary.invalidRecords}
            duplicates={result.summary.duplicateCandidates}
            missing={result.summary.missingFields}
            warnings={result.summary.warnings}
            fatal={result.summary.fatalErrors}
          />

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded border border-border p-3 text-xs">
              <p className="text-xs font-semibold text-foreground">What will happen</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-2xs leading-relaxed text-muted-foreground">
                <li>
                  {formatNumber(result.summary.validRecords)} valid row(s) are added to the student
                  registry with APAAR status Pending (or Not Provided when blank).
                </li>
                <li>A submission batch is created for {primaryYear} and marked for review.</li>
                <li>
                  {formatNumber(result.summary.invalidRecords)} invalid row(s) become open validation
                  issues; they are not discarded and no student is created for them.
                </li>
                <li>Every action is written to the audit history with your identity.</li>
              </ul>
            </div>
            <div className="rounded border border-border p-3 text-xs">
              <p className="text-xs font-semibold text-foreground">Declaration</p>
              <label className="mt-1.5 flex items-start gap-2 text-2xs leading-relaxed text-muted-foreground">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                  id="ack-submit"
                />
                <span>
                  I confirm that the records are based on institutional source documents and that no
                  APAAR identifier has been invented. I understand this demonstration does not submit
                  data to AICTE.
                </span>
              </label>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" onClick={handleCommit} disabled={!acknowledged || !user}>
                  <Upload className="size-3.5" aria-hidden /> Confirm submission
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="size-3.5" aria-hidden /> Back
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {step === 6 && submission && (
        <div className="space-y-3">
          <Panel title="Step 7 · Batch submitted" description="The batch is stored in the demonstration data layer and visible to both portals.">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Batch <span className="font-mono">{submission.id}</span> received
                </p>
                <p className="text-2xs text-muted-foreground">
                  {submission.validRecords} valid record(s) · {submission.correctionRecords} correction row(s) ·{' '}
                  {submission.academicYear}
                </p>
              </div>
              <SubmissionStatusBadge status={submission.status} />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/institution/submissions/${submission.id}`}>Open submission</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/institution/validation-issues">View generated issues</Link>
                </Button>
                <Button size="sm" onClick={reset}>
                  <Upload className="size-3.5" aria-hidden /> Upload another batch
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded border border-border px-2.5 py-2">
                <p className="text-2xs text-muted-foreground">File</p>
                <p className="truncate text-xs font-medium text-foreground">{submission.file.name}</p>
              </div>
              <div className="rounded border border-border px-2.5 py-2">
                <p className="text-2xs text-muted-foreground">Rows processed</p>
                <p className="text-xs font-medium text-foreground">{submission.recordCount}</p>
              </div>
              <div className="rounded border border-border px-2.5 py-2">
                <p className="text-2xs text-muted-foreground">Validation issues created</p>
                <p className="text-xs font-medium text-foreground">
                  {data.issues.filter((issue) => issue.batchId === submission.id).length}
                </p>
              </div>
            </div>

            {submission.correctionRecords > 0 && (
              <Alert tone="warning" className="mt-3">
                <AlertTitle className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" aria-hidden /> Some rows were not added
                </AlertTitle>
                <AlertDescription>
                  {submission.correctionRecords} row(s) failed blocking validation and were recorded
                  as validation issues instead of student records. Correct them and resubmit, or
                  upload a corrected file. No row was silently discarded.
                </AlertDescription>
              </Alert>
            )}
          </Panel>
        </div>
      )}

      {editingRow && (
        <EditCsvRowDialog
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={updateRowValues}
        />
      )}

      <DemoNotice title="Demonstration upload">
        Files never leave this browser. Production uploads must be stored privately, scanned, and
        validated again by the Django backend before any record is accepted.
      </DemoNotice>
    </div>
  );
}

function EditCsvRowDialog({
  row,
  onClose,
  onSave,
}: {
  row: ParsedCsvRow;
  onClose: () => void;
  onSave: (rowNumber: number, values: CsvValues) => void;
}) {
  const [values, setValues] = React.useState<CsvValues>({ ...emptyCsvValues(), ...row.values });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Correct row {row.rowNumber}</DialogTitle>
          <DialogDescription>
            Update the values and save. Validation re-runs for the whole file immediately, including
            duplicate checks against the registry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CSV_COLUMNS.map((column) => (
            <div key={column.key} className={column.key === 'student_name' ? 'sm:col-span-2' : undefined}>
              <Label htmlFor={`edit-${column.key}`} className="mb-1 block">
                {column.label}
                {column.required && <span className="text-critical"> *</span>}
              </Label>
              <Input
                id={`edit-${column.key}`}
                value={values[column.key]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [column.key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <FindingList row={row} />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(row.rowNumber, values)}>
            Save and revalidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
