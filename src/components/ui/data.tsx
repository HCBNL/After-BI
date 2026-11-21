import { SectionMenu } from './SectionMenu';
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input, EmptyState, Skeleton } from './primitives';
import { Select } from './Select';

/* Table */

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** cell renderer */
  cell: (row: T, index: number) => ReactNode;
  /** enables sorting on this column */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** hide below sm */
  hideOnMobile?: boolean;
  sticky?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  dense,
  className,
  footer,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  dense?: boolean;
  className?: string;
  footer?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const getValue = column.sortValue;
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const pad = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={cn('surface-card overflow-hidden rounded-2xl border border-hairline shadow-card', className)}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-body">
          <thead>
            <tr className="border-b border-hairline surface-sunken">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    pad,
                    'text-micro font-semibold uppercase tracking-wide text-muted',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    !col.align && 'text-left',
                    col.hideOnMobile && 'hidden sm:table-cell',
                    col.sticky && 'sticky left-0 z-10 surface-sunken',
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        /*
                         * `uppercase` is repeated here and it is not redundant.
                         *
                         * The `<th>` above already sets it, and `text-transform`
                         * is an inherited property: but Tailwind's preflight
                         * carries normalize.css's `button, select { text-transform:
                         * none }`, which wins over inheritance. So every SORTABLE
                         * column header quietly rendered in sentence case while
                         * the static ones beside it rendered in caps, and a table
                         * with both looked like two tables. Restating it here is
                         * the fix; removing it brings the mismatch straight back.
 */
                        'inline-flex items-center gap-1 uppercase transition-colors hover:text-primary',
                        col.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-hairline last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className={cn(pad, col.hideOnMobile && 'hidden sm:table-cell')}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              sorted.map((row, index) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-hairline last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        pad,
                        'text-secondary align-middle',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.hideOnMobile && 'hidden sm:table-cell',
                        col.sticky && 'sticky left-0 z-10 surface-card',
                      )}
                    >
                      {col.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}

      {footer && <div className="border-t border-hairline surface-sunken px-4 py-3">{footer}</div>}
    </div>
  );
}

/* Tabs */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  /* Sections are picked from one dropdown, never a row of tabs. */
  return <SectionMenu items={items} active={active} onChange={onChange} className={cn('ab-filter-list', className)} />;
}

/* SegmentedControl */

/*
 * One choice out of a few (a period, a view, a source). It used to be a row of
 * pills; it is now the same custom dropdown as every filter, so a page's
 * choices sit side by side looking alike. The name and props stay so every
 * caller keeps working.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  /** Kept for old callers; the dropdown has one size. */
  size?: 'sm' | 'md';
  className?: string;
  /** Read out by screen readers. */
  label?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn('w-auto min-w-[9.5rem]', className)}
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

/* SearchInput */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  /* `.ab-search` (index.css): the full width of a phone, the same width as the page's filter on a laptop. */
  return (
    <div className={cn('ab-search', className)}>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        leading={<Search size={16} />}
        className="w-full"
        aria-label={placeholder}
      />
    </div>
  );
}

/* Pagination */

export function Pagination({
  page,
  pageCount,
  onChange,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
  total?: number;
  pageSize?: number;
}) {
  if (pageCount <= 1) {
    return total !== undefined ? (
      <p className="text-caption text-muted tabular">{total === 1 ? '1 record' : `${total} records`}</p>
    ) : null;
  }

  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const to = pageSize && total ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-caption text-muted tabular">
        {from && to && total ? `Showing ${from} to ${to} of ${total}` : `Page ${page} of ${pageCount}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-card)] disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-caption font-bold text-primary tabular">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[var(--surface-card)] disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/** Client-side pagination helper for the admin tables. */
export function usePagination<T>(rows: T[], pageSize = 12) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    pageCount,
    setPage,
    slice,
    total: rows.length,
    pageSize,
    reset: () => setPage(1),
  };
}
