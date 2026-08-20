import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDate } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState, LoadingState } from "../../../components/ui/States";
import { Customer, Sale } from "../../../types";

const PAGE_SIZE = 20;

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = { name: "", email: "", phone: "", address: "", notes: "" };

export default function CustomersPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = role === "OWNER" || role === "MANAGER" || role === "CASHIER";
  const highlightId = searchParams.get("highlight");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (highlightId) {
      const t = setTimeout(() => {
        searchParams.delete("highlight");
        setSearchParams(searchParams, { replace: true });
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [highlightId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers", activeBusinessId, debouncedSearch, page],
    queryFn: async () =>
      (
        await api.get(`/businesses/${activeBusinessId}/customers`, {
          params: { search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE },
        })
      ).data,
    enabled: !!activeBusinessId,
  });

  const customers: Customer[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["customer-detail", activeBusinessId, detailId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/customers/${detailId}`)).data,
    enabled: !!activeBusinessId && !!detailId,
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setFormOpen(true);
  }

  async function submitForm() {
    if (!form.name.trim()) {
      push("error", "Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await api.patch(`/businesses/${activeBusinessId}/customers/${editing.id}`, payload);
        push("success", "Customer updated");
      } else {
        await api.post(`/businesses/${activeBusinessId}/customers`, payload);
        push("success", "Customer created");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/businesses/${activeBusinessId}/customers/${deleteTarget.id}`);
      push("success", "Customer deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["customers", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium text-ink-900 dark:text-ink-50">{c.name}</span> },
    { key: "phone", header: "Phone", render: (c) => c.phone ?? "—" },
    { key: "email", header: "Email", render: (c) => c.email ?? "—" },
    {
      key: "balance",
      header: "Outstanding",
      render: (c) => (c.outstandingBalance > 0 ? <Badge tone="warning">{formatCurrency(c.outstandingBalance, currency)}</Badge> : formatCurrency(0, currency)),
    },
    { key: "created", header: "Created", render: (c) => formatDate(c.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) =>
        canWrite ? (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" onClick={() => openEdit(c)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" onClick={() => setDeleteTarget(c)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Customers</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage your customer directory and view purchase history.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isError ? (
        <ErrorState message="Couldn't load customers." onRetry={() => refetch()} />
      ) : (
        <div className="overflow-hidden">
          <DataTableHighlighted
            columns={columns}
            rows={customers}
            isLoading={isLoading}
            onRowClick={(c) => setDetailId(c.id)}
            pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
            highlightId={highlightId}
          />
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Customer" : "New Customer"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create customer"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={detailData?.customer?.name ?? "Customer"} size="lg">
        {detailLoading && <LoadingState />}
        {detailData && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="text-ink-500 dark:text-ink-400">Phone</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.customer.phone ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-ink-500 dark:text-ink-400">Email</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.customer.email ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm sm:col-span-2">
                <p className="text-ink-500 dark:text-ink-400">Address</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.customer.address ?? "—"}</p>
              </div>
              {detailData.customer.notes && (
                <div className="space-y-1 text-sm sm:col-span-2">
                  <p className="text-ink-500 dark:text-ink-400">Notes</p>
                  <p className="text-ink-900 dark:text-ink-50">{detailData.customer.notes}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <p className="text-xs text-ink-500 dark:text-ink-400">Total spent</p>
                <p className="text-lg font-semibold text-ink-900 dark:text-white">{formatCurrency(detailData.summary?.totalSpent ?? 0, currency)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-ink-500 dark:text-ink-400">Orders</p>
                <p className="text-lg font-semibold text-ink-900 dark:text-white">{detailData.summary?.orderCount ?? 0}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">Recent sales</h3>
              {(!detailData.recentSales || detailData.recentSales.length === 0) && <p className="text-sm text-ink-400">No sales yet.</p>}
              {detailData.recentSales?.length > 0 && (
                <div className="space-y-2">
                  {detailData.recentSales.map((s: Sale) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
                      <div>
                        <p className="font-medium text-ink-900 dark:text-ink-50">{s.reference}</p>
                        <p className="text-xs text-ink-400">{formatDate(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ink-800 dark:text-ink-100">{formatCurrency(s.total, currency)}</span>
                        <Badge tone={s.status === "COMPLETED" ? "success" : s.status === "PARTIALLY_REFUNDED" ? "warning" : "danger"}>{s.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete customer"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DataTableHighlighted({
  columns,
  rows,
  isLoading,
  onRowClick,
  pagination,
  highlightId,
}: {
  columns: Column<Customer>[];
  rows: Customer[];
  isLoading?: boolean;
  onRowClick: (row: Customer) => void;
  pagination: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };
  highlightId: string | null;
}) {
  const wrappedColumns: Column<Customer>[] = columns.map((col, idx) =>
    idx === 0
      ? {
          ...col,
          render: (row: Customer) => (
            <span className={row.id === highlightId ? "rounded bg-brand-100 px-1 -mx-1 dark:bg-brand-900/40" : undefined}>{col.render(row)}</span>
          ),
        }
      : col
  );
  return (
    <DataTable
      columns={wrappedColumns}
      rows={rows}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyTitle="No customers yet"
      emptyDescription="Add your first customer to start tracking their purchases."
      onRowClick={onRowClick}
      pagination={pagination}
    />
  );
}
