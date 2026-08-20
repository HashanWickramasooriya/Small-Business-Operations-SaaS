import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatDateTime } from "../../../lib/format";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { ActivityLogItem, Paginated } from "../../../types";

const PAGE_SIZE = 20;

const ENTITY_TYPES = ["Product", "Sale", "Purchase", "Expense", "Customer", "Supplier", "Membership", "Business"];

export function humanizeAction(action: string): string {
  return action
    .split(".")
    .join(" ")
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function metadataSummary(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;
  const summary = entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
  return summary.length > 120 ? summary.slice(0, 117) + "…" : summary;
}

export default function ActivityPage() {
  const { activeBusinessId } = useAuth();
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  const activityQuery = useQuery({
    queryKey: ["activity", activeBusinessId, entityType, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (entityType) params.entityType = entityType;
      const { data } = await api.get<Paginated<ActivityLogItem>>(`/businesses/${activeBusinessId}/activity`, { params });
      return data;
    },
    enabled: !!activeBusinessId,
  });

  const columns: Column<ActivityLogItem>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (a) => (
          <div className="flex items-center gap-3">
            {a.user?.avatarUrl ? (
              <img src={a.user.avatarUrl} alt={a.user.fullName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                {a.user?.fullName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <span className="truncate text-ink-800 dark:text-ink-100">{a.user?.fullName ?? "System"}</span>
          </div>
        ),
      },
      {
        key: "action",
        header: "Action",
        render: (a) => (
          <div>
            <p className="font-medium text-ink-900 dark:text-white">{humanizeAction(a.action)}</p>
            {metadataSummary(a.metadata) && (
              <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{metadataSummary(a.metadata)}</p>
            )}
          </div>
        ),
      },
      {
        key: "entityType",
        header: "Entity",
        render: (a) => <Badge tone="neutral">{a.entityType}</Badge>,
      },
      {
        key: "createdAt",
        header: "When",
        render: (a) => <span className="text-ink-600 dark:text-ink-300">{formatDateTime(a.createdAt)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Activity Log</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">A record of what's happened across your business.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <select
          className="input w-auto"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {activityQuery.isError ? (
        <ErrorState message={getApiErrorMessage(activityQuery.error)} onRetry={() => activityQuery.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={activityQuery.data?.items ?? []}
          rowKey={(a) => a.id}
          isLoading={activityQuery.isLoading}
          emptyTitle="No activity yet"
          emptyDescription="Actions taken across your business will show up here."
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: activityQuery.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
