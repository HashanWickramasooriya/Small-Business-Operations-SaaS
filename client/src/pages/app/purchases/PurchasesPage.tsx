import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDate } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { Purchase, PurchaseStatus, Product } from "../../../types";

const WRITE_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

const STATUS_TABS: { value: PurchaseStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ORDERED", label: "Ordered" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_TONE: Record<PurchaseStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral",
  ORDERED: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
};

function statusLabel(s: PurchaseStatus) {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface LineItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function PurchasesPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = !!role && WRITE_ROLES.includes(role);
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "ALL">("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const purchasesQuery = useQuery({
    queryKey: ["purchases", activeBusinessId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const { data } = await api.get(`/businesses/${activeBusinessId}/purchases`, { params });
      return data.items as Purchase[];
    },
    enabled: !!activeBusinessId,
  });

  const suppliersQuery = useQuery({
    queryKey: ["suppliers-lite", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/suppliers`)).data.items as Supplier[],
    enabled: !!activeBusinessId && createOpen,
  });

  const productsQuery = useQuery({
    queryKey: ["products-lite", activeBusinessId],
    queryFn: async () =>
      (await api.get(`/businesses/${activeBusinessId}/products`, { params: { status: "ACTIVE", pageSize: 100 } })).data
        .items as Product[],
    enabled: !!activeBusinessId && createOpen,
  });

  const detailQuery = useQuery({
    queryKey: ["purchase-detail", activeBusinessId, detailId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/purchases/${detailId}`)).data.purchase as Purchase,
    enabled: !!activeBusinessId && !!detailId,
  });

  function resetCreateForm() {
    setSupplierId("");
    setNotes("");
    setLineItems([{ productId: "", quantity: "1", unitCost: "" }]);
  }

  function openCreate() {
    resetCreateForm();
    setCreateOpen(true);
  }

  function addLine() {
    setLineItems((items) => [...items, { productId: "", quantity: "1", unitCost: "" }]);
  }

  function removeLine(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLineItems((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductChange(index: number, productId: string) {
    const product = (productsQuery.data ?? []).find((p) => p.id === productId);
    updateLine(index, {
      productId,
      unitCost: product ? String(product.purchasePrice) : "",
    });
  }

  const runningTotal = useMemo(
    () =>
      lineItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return sum + qty * cost;
      }, 0),
    [lineItems]
  );

  async function handleCreate() {
    if (!supplierId) {
      push("error", "Select a supplier");
      return;
    }
    const validItems = lineItems.filter((i) => i.productId && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      push("error", "Add at least one line item with a product and quantity");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/businesses/${activeBusinessId}/purchases`, {
        supplierId,
        notes: notes.trim() || undefined,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost) || 0,
        })),
      });
      push("success", "Purchase order created");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchases", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkOrdered() {
    if (!detailId) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/businesses/${activeBusinessId}/purchases/${detailId}/status`, { status: "ORDERED" });
      push("success", "Marked as ordered");
      queryClient.invalidateQueries({ queryKey: ["purchases", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail", activeBusinessId, detailId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  }

  function openReceive() {
    const purchase = detailQuery.data;
    if (!purchase) return;
    const initial: Record<string, string> = {};
    purchase.items.forEach((item) => {
      const remaining = item.quantity - item.quantityReceived;
      if (remaining > 0) initial[item.id] = String(remaining);
    });
    setReceiveQuantities(initial);
    setReceiveOpen(true);
  }

  async function handleReceive() {
    if (!detailId || !detailQuery.data) return;
    const items = Object.entries(receiveQuantities)
      .map(([purchaseItemId, qty]) => ({ purchaseItemId, quantityReceived: Number(qty) }))
      .filter((i) => i.quantityReceived > 0);
    if (items.length === 0) {
      push("error", "Enter a quantity to receive");
      return;
    }
    setReceiving(true);
    try {
      await api.post(`/businesses/${activeBusinessId}/purchases/${detailId}/receive`, { items });
      push("success", "Stock received");
      setReceiveOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchases", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail", activeBusinessId, detailId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setReceiving(false);
    }
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/businesses/${activeBusinessId}/purchases/${cancelTarget.id}/status`, { status: "CANCELLED" });
      push("success", "Purchase order cancelled");
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["purchases", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail", activeBusinessId, detailId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  const columns: Column<Purchase>[] = useMemo(
    () => [
      {
        key: "reference",
        header: "Reference",
        render: (p) => <span className="font-medium text-ink-900 dark:text-white">{p.reference}</span>,
      },
      {
        key: "supplier",
        header: "Supplier",
        render: (p) => <span className="text-ink-600 dark:text-ink-300">{p.supplier?.name ?? "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (p) => <Badge tone={STATUS_TONE[p.status]}>{statusLabel(p.status)}</Badge>,
      },
      {
        key: "items",
        header: "Items",
        render: (p) => <span>{p.items?.length ?? 0}</span>,
      },
      {
        key: "total",
        header: "Total cost",
        render: (p) => formatCurrency(p.totalCost, currency),
      },
      {
        key: "created",
        header: "Created",
        render: (p) => formatDate(p.createdAt),
      },
    ],
    [currency]
  );

  const purchase = detailQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Purchases</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage purchase orders and receive stock from suppliers.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Purchase Order
          </button>
        )}
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-brand-600 text-white"
                : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            }`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {purchasesQuery.isError ? (
        <ErrorState message={getApiErrorMessage(purchasesQuery.error)} onRetry={() => purchasesQuery.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={purchasesQuery.data ?? []}
          rowKey={(p) => p.id}
          isLoading={purchasesQuery.isLoading}
          emptyTitle="No purchase orders found"
          emptyDescription="Create a purchase order to restock from your suppliers."
          onRowClick={(p) => setDetailId(p.id)}
        />
      )}

      {/* Create purchase order modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New purchase order"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create purchase order"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select a supplier…</option>
              {(suppliersQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Line items</label>
              <button type="button" className="btn-ghost px-2 py-1 text-sm" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Add line
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink-200 p-2 dark:border-ink-800">
                  <div className="min-w-[180px] flex-1">
                    <label className="label text-xs">Product</label>
                    <select
                      className="input"
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                    >
                      <option value="">Select product…</option>
                      {(productsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label text-xs">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={item.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="w-28">
                    <label className="label text-xs">Unit cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      value={item.unitCost}
                      onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-ghost p-2 text-red-600 dark:text-red-400"
                    aria-label="Remove line"
                    disabled={lineItems.length === 1}
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end text-sm font-medium text-ink-800 dark:text-ink-100">
              Total: {formatCurrency(runningTotal, currency)}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={purchase ? purchase.reference : "Purchase order"} size="lg">
        {detailQuery.isLoading || !purchase ? (
          <p className="py-8 text-center text-sm text-ink-500 dark:text-ink-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400">Supplier</p>
                <p className="font-medium text-ink-900 dark:text-white">{purchase.supplier?.name ?? "—"}</p>
              </div>
              <Badge tone={STATUS_TONE[purchase.status]}>{statusLabel(purchase.status)}</Badge>
            </div>

            {purchase.notes && (
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400">Notes</p>
                <p className="text-sm text-ink-800 dark:text-ink-100">{purchase.notes}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-ink-800 dark:text-ink-100">Line items</p>
              <div className="overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-800">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead className="bg-ink-50 dark:bg-ink-900/60">
                    <tr>
                      <th className="px-3 py-2 font-medium text-ink-500 dark:text-ink-400">Product</th>
                      <th className="px-3 py-2 font-medium text-ink-500 dark:text-ink-400">Unit cost</th>
                      <th className="px-3 py-2 font-medium text-ink-500 dark:text-ink-400">Received</th>
                      <th className="px-3 py-2 text-right font-medium text-ink-500 dark:text-ink-400">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {purchase.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-ink-800 dark:text-ink-200">
                          {item.product?.name ?? "—"}
                          {item.product?.sku && <span className="ml-1 text-xs text-ink-400">({item.product.sku})</span>}
                        </td>
                        <td className="px-3 py-2 text-ink-800 dark:text-ink-200">{formatCurrency(item.unitCost, currency)}</td>
                        <td className="px-3 py-2 text-ink-800 dark:text-ink-200">
                          {item.quantityReceived} / {item.quantity} received
                        </td>
                        <td className="px-3 py-2 text-right text-ink-800 dark:text-ink-200">
                          {formatCurrency(item.unitCost * item.quantity, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-end text-sm font-semibold text-ink-900 dark:text-white">
                Total: {formatCurrency(purchase.totalCost, currency)}
              </div>
            </div>

            {canWrite && purchase.status !== "RECEIVED" && purchase.status !== "CANCELLED" && (
              <div className="flex flex-wrap gap-2 border-t border-ink-200 pt-4 dark:border-ink-800">
                {purchase.status === "DRAFT" && (
                  <button className="btn-primary" onClick={handleMarkOrdered} disabled={statusUpdating}>
                    {statusUpdating ? "Updating…" : "Mark as Ordered"}
                  </button>
                )}
                {(purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED") && (
                  <button className="btn-primary" onClick={openReceive}>
                    Receive Stock
                  </button>
                )}
                <button className="btn-danger" onClick={() => setCancelTarget(purchase)}>
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Receive stock modal */}
      <Modal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Receive stock"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReceiveOpen(false)} disabled={receiving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleReceive} disabled={receiving}>
              {receiving ? "Receiving…" : "Confirm receipt"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {purchase?.items
            .filter((item) => item.quantity - item.quantityReceived > 0)
            .map((item) => {
              const remaining = item.quantity - item.quantityReceived;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{item.product?.name ?? "—"}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{remaining} remaining of {item.quantity}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={remaining}
                    className="input w-24"
                    value={receiveQuantities[item.id] ?? ""}
                    onChange={(e) =>
                      setReceiveQuantities((q) => ({
                        ...q,
                        [item.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            })}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel purchase order"
        description={`Cancel purchase order "${cancelTarget?.reference}"? This cannot be undone.`}
        confirmLabel="Cancel order"
        danger
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
        loading={cancelling}
      />
    </div>
  );
}
