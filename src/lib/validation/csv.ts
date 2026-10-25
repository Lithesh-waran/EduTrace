import Papa from 'papaparse';
import { downloadCsv } from '@/lib/format';
import { CSV_COLUMNS, type CsvValidationResult, type RawCsvRow } from './engine';

export const CSV_TEMPLATE_HEADERS = CSV_COLUMNS.map((column) => column.key);

export const CSV_TEMPLATE_SAMPLE_ROWS = [
  [
    'DEMO/2026/CSE/901',
    'Aarav Sharma',
    'CSE',
    '2026-27',
    '2026-07-22',
    'Active',
    '999000000901',
  ],
  [
    'DEMO/2026/CSE/902',
    'Ishita Nair',
    'CSE',
    '2026-27',
    '2026-07-23',
    'Active',
    '',
  ],
];

export function downloadCsvTemplate(): void {
  const rows: string[][] = [CSV_TEMPLATE_HEADERS as unknown as string[], ...CSV_TEMPLATE_SAMPLE_ROWS];
  downloadCsv('edutrace_student_upload_template.csv', rows);
}

export function writeCsvErrorReport(result: CsvValidationResult, fileName: string): void {
  const rows: (string | number | null)[][] = [
    ['row_number', 'rule_id', 'rule_name', 'severity', 'field', 'evidence', 'suggested_action'],
  ];
  for (const row of result.rows) {
    for (const finding of row.findings) {
      rows.push([
        row.rowNumber,
        finding.ruleId,
        finding.ruleName,
        finding.severity,
        finding.field ?? '',
        finding.evidence,
        finding.suggestedAction,
      ]);
    }
  }
  downloadCsv(
    `${fileName.replace(/\.csv$/i, '')}_validation_report.csv`,
    rows,
  );
}

export interface ParseCsvResult {
  rows: RawCsvRow[];
  errors: string[];
  meta: { delimiter: string; fields: string[] };
}

/**
 * Parse an uploaded CSV with Papa Parse and normalise header names.
 * Rows are never discarded silently: every parsed row is returned with its
 * original row number so validation findings can be traced back to the file.
 */
export function parseCsvFile(file: File): Promise<ParseCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) =>
        header
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, ''),
      complete: (results) => {
        const fields = (results.meta.fields ?? []).filter(Boolean);
        const errors: string[] = results.errors.slice(0, 12).map((error) => {
          const row = typeof error.row === 'number' ? ` (row ${error.row + 2})` : '';
          return `${error.message}${row}`;
        });

        const missingColumns = CSV_TEMPLATE_HEADERS.filter((header) => !fields.includes(header));
        if (missingColumns.length > 0) {
          errors.push(
            `Missing expected column(s): ${missingColumns.join(', ')}. Download the template to see the required layout.`,
          );
        }

        const rows: RawCsvRow[] = results.data
          .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
          .map((row, index) => ({
            rowNumber: index + 2,
            values: row as never,
          }));

        if (rows.length === 0) {
          errors.push('The file contains no data rows.');
        }

        resolve({
          rows,
          errors,
          meta: { delimiter: results.meta.delimiter ?? ',', fields },
        });
      },
      error: (error) => reject(error),
    });
  });
}

export function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsvFromRows(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}
