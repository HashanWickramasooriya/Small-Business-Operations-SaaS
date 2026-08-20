import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState, LoadingState } from "../../../components/ui/States";
import { Supplier, Product, Purchase, PurchaseStatus } from "../../../types";

interface SupplierForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = { name: "", email: "", phone: "", address: "", notes: "" };

const PURCHASE_STATUS_TONE: Record<PurchaseStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "neutral",
  ORDERED: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export default function SuppliersPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = role === "OWNER" || role === "MANAGER";
  const highlightId = searchParams.get("highlight");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
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
    queryKey: ["suppliers", activeBusinessId, debouncedSearch],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/suppliers`, { params: { search: debouncedSearch || undefined } })).data,
    enabled: !!activeBusinessId,
  });

  const suppliers: Supplier[] = data?.items ?? [];

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["supplier-detail", activeBusinessId, detailId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/suppliers/${detailId}`)).data,
    enabled: !!activeBusinessId && !!detailId,
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setFormOpen(true);
  }

  async function submitForm() {
    if (!form.name.trim()) {
      push("error", "Supplier name is required");
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
        await api.patch(`/businesses/${activeBusinessId}/suppliers/${editing.id}`, payload);
        push("success", "Supplier updated");
      } else {
        await api.post(`/businesses/${activeBusinessId}/suppliers`, payload);
        push("success", "Supplier created");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers", activeBusinessId] });
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
      await api.delete(`/businesses/${activeBusinessId}/suppliers/${deleteTarget.id}`);
      push("success", "Supplier deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["suppliers", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      render: (s) => (
        <span className={`font-medium text-ink-900 dark:text-ink-50 ${s.id === highlightId ? "rounded bg-brand-100 px-1 -mx-1 dark:bg-brand-900/40" : ""}`}>
          {s.name}
        </span>
      ),
    },
    { key: "phone", header: "Phone", render: (s) => s.phone ?? "—" },
    { key: "email", header: "Email", render: (s) => s.email ?? "—" },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (s) => (s.outstandingAmount > 0 ? <Badge tone="warning">{formatCurrency(s.outstandingAmount, currency)}</Badge> : formatCurrency(0, currency)),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (s) =>
        canWrite ? (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" onClick={() => openEdit(s)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" onClick={() => setDeleteTarget(s)} aria-label="Delete">
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
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Suppliers</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage vendors, track balances, and review purchase history.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Supplier
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isError ? (
        <ErrorState message="Couldn't load suppliers." onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={suppliers}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          emptyTitle="No suppliers yet"
          emptyDescription="Add your first supplier to start tracking purchases."
          onRowClick={(s) => setDetailId(s.id)}
        />
      )}

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Supplier" : "New Supplier"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create supplier"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Wholesale" />
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
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={detailData?.supplier?.name ?? "Supplier"} size="lg">
        {detailLoading && <LoadingState />}
        {detailData && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="text-ink-500 dark:text-ink-400">Phone</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.supplier.phone ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-ink-500 dark:text-ink-400">Email</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.supplier.email ?? "—"}</p>
              </div>
              <div className="space-y-1 text-sm sm:col-span-2">
                <p className="text-ink-500 dark:text-ink-400">Address</p>
                <p className="text-ink-900 dark:text-ink-50">{detailData.supplier.address ?? "—"}</p>
              </div>
              {detailData.supplier.notes && (
                <div className="space-y-1 text-sm sm:col-span-2">
                  <p className="text-ink-500 dark:text-ink-400">Notes</p>
                  <p className="text-ink-900 dark:text-ink-50">{detailData.supplier.notes}</p>
                </div>
              )}
              <div className="space-y-1 text-sm">
                <p className="text-ink-500 dark:text-ink-400">Outstanding</p>
                <p className="text-ink-900 dark:text-ink-50">{formatCurrency(detailData.supplier.outstandingAmount, currency)}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">Products supplied</h3>
              {(!detailData.products || detailData.products.length === 0) && <p className="text-sm text-ink-400">No products linked to this supplier.</p>}
              {detailData.products?.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-ink-100 dark:border-ink-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-ink-50 text-ink-500 dark:bg-ink-900/60 dark:text-ink-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                      {detailData.products.map((p: Product) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-ink-800 dark:text-ink-100">{p.name}</td>
                          <td className="px-3 py-2 text-ink-500 dark:text-ink-400">{p.sku}</td>
                          <td className="px-3 py-2 text-ink-600 dark:text-ink-300">
                            {p.stock} {p.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">Recent purchase orders</h3>
              {(!detailData.purchases || detailData.purchases.length === 0) && <p className="text-sm text-ink-400">No purchase orders yet.</p>}
              {detailData.purchases?.length > 0 && (
                <div className="space-y-2">
                  {detailData.purchases.map((p: Purchase) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
                      <span className="font-medium text-ink-900 dark:text-ink-50">{p.reference}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-ink-800 dark:text-ink-100">{formatCurrency(p.totalCost, currency)}</span>
                        <Badge tone={PURCHASE_STATUS_TONE[p.status]}>{p.status.replace("_", " ")}</Badge>
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
        title="Delete supplier"
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
