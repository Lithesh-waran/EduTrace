const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormatter.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateTimeFormatter.format(d).replace('am', 'AM').replace('pm', 'PM');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** APAAR identifiers are masked in list views; only the last four digits show. */
export function maskIdentifier(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return '•'.repeat(clean.length);
  return `${'•'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function relativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMinutes = Math.round((Date.now() - then) / 60000);
  if (Math.abs(diffMinutes) < 1) return 'just now';
  if (Math.abs(diffMinutes) < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days}d ago`;
  return formatDate(value);
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (cell: string | number | null | undefined) => {
    const value = cell === null || cell === undefined ? '' : String(cell);
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  downloadText(filename, csv, 'text/csv;charset=utf-8');
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
