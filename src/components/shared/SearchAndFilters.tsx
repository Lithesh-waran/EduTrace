import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

export function SearchAndFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records…',
  filters = [],
  onReset,
  resultLabel,
  trailing,
  searchLabel = 'Search',
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onReset?: () => void;
  resultLabel?: string;
  trailing?: React.ReactNode;
  searchLabel?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <div className="relative w-full lg:max-w-xs">
          <Label htmlFor="record-search" className="sr-only">
            {searchLabel}
          </Label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="record-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            type="search"
          />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end">
          {filters.map((filter) => (
            <div key={filter.key} className={filter.className ?? 'min-w-[8.5rem]'}>
              <Label htmlFor={`filter-${filter.key}`} className="mb-1 block">
                {filter.label}
              </Label>
              <SelectRoot value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger id={`filter-${filter.key}`} className="h-9">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
          ))}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} className="mb-0.5 gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </Button>
          )}
        </div>
        {trailing && <div className="flex items-center gap-2 lg:ml-auto">{trailing}</div>}
      </div>
      {resultLabel && <p className="text-2xs text-muted-foreground">{resultLabel}</p>}
    </div>
  );
}
