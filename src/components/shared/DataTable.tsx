import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './States';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'left' | 'right' | 'center';
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

const hideClass: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyTitle = 'No records match the current filters',
  emptyDescription = 'Adjust or reset the filters to see results.',
  footer,
  initialSort,
  dense,
  caption,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: React.ReactNode;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  dense?: boolean;
  caption?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    initialSort ?? null,
  );

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);
      const comparison =
        typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue));
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sort, columns]);

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return null;
    });
  };

  return (
    <div>
      <div className="relative w-full overflow-x-auto scrollbar-thin">
        <table className="w-full caption-bottom border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-muted/60">
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                const align = column.align ?? 'left';
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'h-9 whitespace-nowrap border-b border-border px-3 text-left align-middle text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
                      align === 'right' && 'text-right',
                      align === 'center' && 'text-center',
                      column.hideBelow && hideClass[column.hideBelow],
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="inline-flex items-center gap-1 rounded text-2xs font-semibold uppercase tracking-wide hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {column.header}
                        {isSorted ? (
                          sort?.direction === 'asc' ? (
                            <ArrowUp className="size-3" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'border-b border-border transition-colors last:border-0 hover:bg-muted/40',
                  onRowClick && 'cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 align-middle',
                      dense ? 'py-1.5' : 'py-2.5',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideBelow && hideClass[column.hideBelow],
                      column.cellClassName,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
      {footer}
    </div>
  );
}
