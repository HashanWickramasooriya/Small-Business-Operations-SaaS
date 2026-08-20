import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingState, EmptyState } from "./States";

export interface Column<T> {
  header: string;
  key: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/60">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-3 font-medium text-ink-500 dark:text-ink-400">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {!isLoading &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/50" : ""}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-ink-800 dark:text-ink-200 ${col.className ?? ""}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {isLoading && <LoadingState />}
      {!isLoading && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
      {pagination && rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3 text-sm text-ink-500 dark:border-ink-800">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-1">
            <button
              className="btn-ghost px-2 py-1"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost px-2 py-1"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
