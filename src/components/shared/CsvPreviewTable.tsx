import { AlertTriangle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CSV_COLUMNS, type ParsedCsvRow } from '@/lib/validation/engine';
import { cn } from '@/lib/utils';
import { SeverityBadge } from './StatusBadge';

export function CsvPreviewTable({
  rows,
  onEdit,
  editable = true,
  maxRows,
}: {
  rows: ParsedCsvRow[];
  onEdit?: (rowNumber: number) => void;
  editable?: boolean;
  maxRows?: number;
}) {
  const visible = maxRows ? rows.slice(0, maxRows) : rows;
  return (
    <div className="space-y-2">
      <div className="w-full overflow-x-auto scrollbar-thin rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">CSV preview with validation results per row</caption>
          <thead className="bg-muted/60">
            <tr>
              <th scope="col" className="whitespace-nowrap px-2.5 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Row
              </th>
              {CSV_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-2.5 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="whitespace-nowrap px-2.5 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Findings
              </th>
              {editable && <th scope="col" className="px-2.5 py-2"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const blocked = row.blocking;
              return (
                <tr
                  key={row.rowNumber}
                  className={cn(
                    'border-t border-border align-top',
                    blocked ? 'bg-critical/[0.035]' : 'hover:bg-muted/30',
                  )}
                >
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-2xs text-muted-foreground">
                    {row.rowNumber}
                  </td>
                  {CSV_COLUMNS.map((column) => {
                    const value = row.values[column.key];
                    const fieldFindings = row.findings.filter((finding) => finding.field === column.key);
                    const hasBlocking = fieldFindings.some((finding) =>
                      finding.severity === 'Critical' || finding.severity === 'High',
                    );
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'max-w-[13rem] px-2.5 py-1.5',
                          hasBlocking ? 'font-medium text-critical' : 'text-foreground',
                        )}
                      >
                        <span className="line-clamp-2 break-words">
                          {value || <span className="italic text-muted-foreground">empty</span>}
                        </span>
                        {fieldFindings.length > 0 && (
                          <span className="mt-0.5 block text-2xs font-normal text-muted-foreground">
                            {fieldFindings[0].evidence}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2.5 py-1.5">
                    {row.findings.length === 0 ? (
                      <Badge variant="success">Valid</Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant={blocked ? 'critical' : 'warning'}>
                          <AlertTriangle className="size-2.5" aria-hidden />
                          {row.findings.length} finding{row.findings.length === 1 ? '' : 's'}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(row.findings.map((finding) => finding.ruleId))).map((id) => (
                            <span key={id} className="font-mono text-2xs text-muted-foreground">
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  {editable && (
                    <td className="px-2.5 py-1.5">
                      {onEdit && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onEdit(row.rowNumber)}
                          className="gap-1"
                        >
                          <Pencil className="size-3" aria-hidden /> Edit
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {maxRows && rows.length > maxRows && (
        <p className="text-2xs text-muted-foreground">
          Showing the first {maxRows} of {rows.length} rows. All rows are validated.
        </p>
      )}
      {visible.some((row) => row.blocking) && (
        <p className="flex items-center gap-1.5 text-2xs text-critical">
          <AlertTriangle className="size-3" aria-hidden />
          Rows highlighted in red contain blocking findings and will not be added to the registry
          until corrected.
        </p>
      )}
    </div>
  );
}

export function FindingList({ row }: { row: ParsedCsvRow }) {
  if (row.findings.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {row.findings.map((finding, index) => (
        <li key={`${finding.ruleId}-${index}`} className="rounded border border-border bg-card px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={finding.severity} />
            <span className="font-mono text-2xs text-muted-foreground">{finding.ruleId}</span>
            <span className="text-xs font-medium text-foreground">{finding.ruleName}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{finding.evidence}</p>
          <p className="text-2xs leading-relaxed text-foreground/80">
            Next: {finding.suggestedAction}
          </p>
        </li>
      ))}
    </ul>
  );
}
