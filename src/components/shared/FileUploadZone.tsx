import * as React from 'react';
import { FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

export function FileUploadZone({
  file,
  onFile,
  onClear,
  error,
  disabled,
}: {
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const candidate = files?.[0];
    if (!candidate) return;
    onFile(candidate);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors',
          dragging ? 'border-secondary bg-secondary/5' : 'border-border bg-muted/20',
          disabled && 'opacity-60',
        )}
      >
        <UploadCloud className="mx-auto size-7 text-secondary" aria-hidden />
        <p className="mt-2 text-sm font-medium text-foreground">Drag a CSV file here</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          or choose a file from this device · CSV only · maximum {formatBytes(MAX_BYTES)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Choose CSV file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
          aria-label="Choose CSV file"
          disabled={disabled}
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <FileSpreadsheet className="size-4 shrink-0 text-success" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-2xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            aria-label="Remove selected file"
          >
            <X />
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-critical">
          {error}
        </p>
      )}
      <p className="text-2xs leading-relaxed text-muted-foreground">
        Files are parsed in this browser for the demonstration. Nothing is uploaded to a server. In
        production the original file is stored privately and validation runs on the Django backend.
      </p>
    </div>
  );
}

export function validateCsvFile(file: File): string | null {
  if (!/\.csv$/i.test(file.name)) return 'Select a .csv file exported from the EduTrace template.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_BYTES) return `The file is larger than ${formatBytes(MAX_BYTES)}. Split the batch and try again.`;
  return null;
}
