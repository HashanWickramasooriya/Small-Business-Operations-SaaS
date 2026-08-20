import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, PackagePlus, AlertTriangle } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { canAccessModule } from "../../../lib/permissions";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState, LoadingState, EmptyState } from "../../../components/ui/States";
import { formatDateTime } from "../../../lib/format";
import { InventoryMovement, Product } from "../../../types";

const PAGE_SIZE = 15;

const MOVEMENT_TONE: Record<InventoryMovement["type"], "success" | "neutral" | "info"> = {
  PURCHASE: "success",
  INITIAL: "success",
  RETURN: "success",
  SALE: "neutral",
  ADJUSTMENT: "info",
};

type Tab = "low-stock" | "history";

export default function InventoryPage() {
  const { activeBusinessId, role } = useAuth();
  const canWrite = canAccessModule(role, "inventory") && (role === "OWNER" || role === "MANAGER");
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("low-stock");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyProductId, setHistoryProductId] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["products-lite", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/products`, { params: { page: 1, pageSize: 2000, status: "ACTIVE" } })).data.items as Product[],
    enabled: !!activeBusinessId,
  });

  const lowStockQuery = useQuery({
    queryKey: ["inventory-low-stock", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/inventory/low-stock`)).data.items as Product[],
    enabled: !!activeBusinessId && tab === "low-stock",
  });

  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", activeBusinessId, historyPage, historyProductId],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: historyPage, pageSize: PAGE_SIZE };
      if (historyProductId) params.productId = historyProductId;
      const { data } = await api.get(`/businesses/${activeBusinessId}/inventory/movements`, { params });
      return data as { items: InventoryMovement[]; total: number; page: number; pageSize: number };
    },
    enabled: !!activeBusinessId && tab === "history",
  });

  function openAdjust(productId?: string) {
    setAdjustProductId(productId ?? "");
    setAdjustQuantity("");
    setAdjustNote("");
    setAdjustOpen(true);
  }

  async function handleAdjustSave() {
    if (!adjustProductId) {
      push("error", "Select a product");
      return;
    }
    const qty = Number(adjustQuantity);
    if (!qty || Number.isNaN(qty)) {
      push("error", "Enter a non-zero quantity (use a negative number to reduce stock)");
      return;
    }
    setAdjustSaving(true);
    try {
      await api.post(`/businesses/${activeBusinessId}/inventory/adjust`, {
        productId: adjustProductId,
        quantity: qty,
        note: adjustNote.trim() || undefined,
      });
      push("success", "Stock adjusted");
      setAdjustOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventory-low-stock", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["products", activeBusinessId] });
      queryClient.invalidateQueries({ queryKey: ["products-lite", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setAdjustSaving(false);
    }
  }

  const products = productsQuery.data ?? [];

  const movementColumns: Column<InventoryMovement>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (m) => <span className="whitespace-nowrap text-ink-600 dark:text-ink-300">{formatDateTime(m.createdAt)}</span>,
      },
      {
        key: "product",
        header: "Product",
        render: (m) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900 dark:text-white">{m.product?.name ?? "—"}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{m.product?.sku}</p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (m) => <Badge tone={MOVEMENT_TONE[m.type]}>{m.type}</Badge>,
      },
      {
        key: "quantity",
        header: "Quantity",
        render: (m) => (
          <span className={`font-semibold ${m.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.product?.unit}
          </span>
        ),
      },
      {
        key: "note",
        header: "Note",
        render: (m) => <span className="text-ink-500 dark:text-ink-400">{m.note ?? "—"}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Inventory</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track stock levels and view movement history.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={() => openAdjust()}>
            <PlusCircle className="h-4 w-4" />
            Adjust Stock
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
        <button
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "low-stock"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200"
          }`}
          onClick={() => setTab("low-stock")}
        >
          Low Stock
        </button>
        <button
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "history"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200"
          }`}
          onClick={() => setTab("history")}
        >
          Movement History
        </button>
      </div>

      {tab === "low-stock" && (
        <>
          {lowStockQuery.isLoading && <LoadingState />}
          {lowStockQuery.isError && <ErrorState message={getApiErrorMessage(lowStockQuery.error)} onRetry={() => lowStockQuery.refetch()} />}
          {!lowStockQuery.isLoading && !lowStockQuery.isError && (lowStockQuery.data ?? []).length === 0 && (
            <div className="card">
              <EmptyState
                title="No low-stock products"
                description="All products are above their minimum stock threshold."
                icon={<AlertTriangle className="h-8 w-8 text-ink-300 dark:text-ink-600" />}
              />
            </div>
          )}
          {!lowStockQuery.isLoading && !lowStockQuery.isError && (lowStockQuery.data ?? []).length > 0 && (
            <div className="card divide-y divide-ink-100 overflow-hidden dark:divide-ink-800">
              {(lowStockQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{p.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={p.stock <= 0 ? "danger" : "warning"}>
                      {p.stock} / {p.minStock} {p.unit}
                    </Badge>
                    {canWrite && (
                      <button className="btn-secondary" onClick={() => openAdjust(p.id)}>
                        <PackagePlus className="h-4 w-4" />
                        Restock
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <select className="input w-auto" value={historyProductId} onChange={(e) => { setHistoryProductId(e.target.value); setHistoryPage(1); }}>
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {movementsQuery.isError ? (
            <ErrorState message={getApiErrorMessage(movementsQuery.error)} onRetry={() => movementsQuery.refetch()} />
          ) : (
            <DataTable
              columns={movementColumns}
              rows={movementsQuery.data?.items ?? []}
              rowKey={(m) => m.id}
              isLoading={movementsQuery.isLoading}
              emptyTitle="No movements found"
              emptyDescription="Stock movements will appear here as sales, purchases and adjustments happen."
              pagination={{
                page: historyPage,
                pageSize: PAGE_SIZE,
                total: movementsQuery.data?.total ?? 0,
                onPageChange: setHistoryPage,
              }}
            />
          )}
        </div>
      )}

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Adjust stock"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAdjustOpen(false)} disabled={adjustSaving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAdjustSave} disabled={adjustSaving}>
              {adjustSaving ? "Saving…" : "Apply adjustment"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Product</label>
            <select className="input" value={adjustProductId} onChange={(e) => setAdjustProductId(e.target.value)}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — current stock {p.stock} {p.unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity change</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 50 to add, -3 to remove"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Use a positive number to add stock, negative to remove.</p>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason for adjustment" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
