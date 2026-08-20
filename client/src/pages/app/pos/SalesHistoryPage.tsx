import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { Sale, SaleStatus } from "../../../types";

const STATUS_OPTIONS: { value: SaleStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "VOID", label: "Void" },
];

const STATUS_TONE: Record<SaleStatus, "success" | "danger" | "warning"> = {
  COMPLETED: "success",
  REFUNDED: "danger",
  VOID: "danger",
  PARTIALLY_REFUNDED: "warning",
};

const PAGE_SIZE = 20;

export default function SalesHistoryPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = role === "OWNER" || role === "MANAGER" || role === "CASHIER";

  const [status, setStatus] = useState<SaleStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundState, setRefundState] = useState<Record<string, number>>({});
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sales", activeBusinessId, status, from, to, page],
    queryFn: async () =>
      (
        await api.get(`/businesses/${activeBusinessId}/sales`, {
          params: { status: status || undefined, from: from || undefined, to: to || undefined, page, pageSize: PAGE_SIZE },
        })
      ).data,
    enabled: !!activeBusinessId,
  });

  const sales: Sale[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  async function openDetail(sale: Sale) {
    try {
      const { data: detail } = await api.get(`/businesses/${activeBusinessId}/sales/${sale.id}`);
      setSelectedSale(detail.sale);
      setRefundState({});
      setRefundReason("");
    } catch (err) {
      push("error", getApiErrorMessage(err));
    }
  }

  function toggleRefundItem(saleItemId: string, maxQty: number, checked: boolean) {
    setRefundState((prev) => {
      const next = { ...prev };
      if (checked) next[saleItemId] = maxQty;
      else delete next[saleItemId];
      return next;
    });
  }

  function setRefundQty(saleItemId: string, qty: number, maxQty: number) {
    setRefundState((prev) => ({ ...prev, [saleItemId]: Math.min(Math.max(1, qty), maxQty) }));
  }

  async function submitRefund() {
    if (!selectedSale) return;
    const items = Object.entries(refundState).map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    if (items.length === 0) {
      push("error", "Select at least one item to refund");
      return;
    }
    setRefunding(true);
    try {
      const { data: res } = await api.post(`/businesses/${activeBusinessId}/sales/${selectedSale.id}/refund`, {
        items,
        reason: refundReason || undefined,
      });
      push("success", `Refund processed for ${res.sale.reference}`);
      setSelectedSale(null);
      queryClient.invalidateQueries({ queryKey: ["sales", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setRefunding(false);
    }
  }

  const columns: Column<Sale>[] = [
    { key: "reference", header: "Reference", render: (s) => <span className="font-medium text-ink-900 dark:text-ink-50">{s.reference}</span> },
    { key: "date", header: "Date", render: (s) => formatDateTime(s.createdAt) },
    { key: "customer", header: "Customer", render: (s) => s.customer?.name ?? "Walk-in" },
    { key: "items", header: "Items", render: (s) => s.items?.length ?? 0 },
    { key: "total", header: "Total", render: (s) => formatCurrency(s.total, currency) },
    {
      key: "payment",
      header: "Payment",
      render: (s) => <Badge tone="neutral">{s.paymentMethod.replace("_", " ")}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status.replace("_", " ")}</Badge>,
    },
  ];

  const canRefund = selectedSale && (selectedSale.status === "COMPLETED" || selectedSale.status === "PARTIALLY_REFUNDED");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Sales History</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Browse past sales, view receipts, and process refunds.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/app/pos")}>
          <Plus className="h-4 w-4" />
          New Sale
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Status</label>
          <select
            className="input sm:w-48"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SaleStatus | "");
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {(status || from || to) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setStatus("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {isError ? (
        <ErrorState message="Couldn't load sales." onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={sales}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          emptyTitle="No sales found"
          emptyDescription="Sales will appear here once you complete a transaction at the POS."
          onRowClick={openDetail}
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      )}

      <Modal open={!!selectedSale} onClose={() => setSelectedSale(null)} title={selectedSale ? `Sale ${selectedSale.reference}` : ""} size="lg">
        {selectedSale && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-500 dark:text-ink-400">
              <span>{formatDateTime(selectedSale.createdAt)}</span>
              <span>{selectedSale.customer?.name ?? "Walk-in customer"}</span>
              <Badge tone={STATUS_TONE[selectedSale.status]}>{selectedSale.status.replace("_", " ")}</Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ink-100 dark:border-ink-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-ink-500 dark:bg-ink-900/60 dark:text-ink-400">
                  <tr>
                    {canRefund && <th className="px-3 py-2 font-medium">Refund</th>}
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Unit price</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {selectedSale.items.map((it) => (
                    <tr key={it.id}>
                      {canRefund && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={it.id in refundState}
                              onChange={(e) => toggleRefundItem(it.id, it.quantity, e.target.checked)}
                            />
                            {it.id in refundState && (
                              <input
                                type="number"
                                min={1}
                                max={it.quantity}
                                className="w-16 rounded-md border border-ink-200 bg-transparent px-1 py-0.5 text-sm dark:border-ink-700"
                                value={refundState[it.id]}
                                onChange={(e) => setRefundQty(it.id, Number(e.target.value), it.quantity)}
                              />
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2 text-ink-800 dark:text-ink-100">{it.product?.name ?? "Item"}</td>
                      <td className="px-3 py-2 text-ink-600 dark:text-ink-300">{it.quantity}</td>
                      <td className="px-3 py-2 text-ink-600 dark:text-ink-300">{formatCurrency(it.unitPrice, currency)}</td>
                      <td className="px-3 py-2 text-ink-800 dark:text-ink-100">{formatCurrency(it.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSale.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Tax</span>
                <span>{formatCurrency(selectedSale.tax, currency)}</span>
              </div>
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Discount</span>
                <span>-{formatCurrency(selectedSale.discount, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-1 text-base font-semibold text-ink-900 dark:border-ink-700 dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(selectedSale.total, currency)}</span>
              </div>
            </div>

            {canRefund && canWrite && (
              <div className="space-y-3 rounded-lg border border-ink-100 p-4 dark:border-ink-800">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
                  <RotateCcw className="h-4 w-4" />
                  Refund items
                </h3>
                <div>
                  <label className="label">Reason (optional)</label>
                  <input className="input" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Customer changed mind" />
                </div>
                <button className="btn-danger" disabled={refunding || Object.keys(refundState).length === 0} onClick={submitRefund}>
                  {refunding ? "Processing…" : "Process refund"}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
