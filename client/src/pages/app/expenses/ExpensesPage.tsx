import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDate, titleCase } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { Expense, ExpenseCategory, PaymentMethod } from "../../../types";

const PAGE_SIZE = 15;

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"];
const RECURRENCE_INTERVALS = ["weekly", "monthly", "yearly"] as const;

interface ExpenseFormState {
  categoryId: string;
  amount: string;
  vendor: string;
  description: string;
  paymentMethod: PaymentMethod;
  receiptUrl: string;
  isRecurring: boolean;
  recurrenceInterval: (typeof RECURRENCE_INTERVALS)[number];
  date: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: ExpenseFormState = {
  categoryId: "",
  amount: "",
  vendor: "",
  description: "",
  paymentMethod: "CASH",
  receiptUrl: "",
  isRecurring: false,
  recurrenceInterval: "monthly",
  date: todayIso(),
};

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = role === "OWNER" || role === "ACCOUNTANT";
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/expenses/categories`)).data.categories as ExpenseCategory[],
    enabled: !!activeBusinessId,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", activeBusinessId, categoryId, from, to, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (categoryId) params.categoryId = categoryId;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get(`/businesses/${activeBusinessId}/expenses`, { params });
      return data as { items: Expense[]; total: number; page: number; pageSize: number; totalAmount: number };
    },
    enabled: !!activeBusinessId,
  });

  const categories = categoriesQuery.data ?? [];

  function applyPreset(preset: "today" | "thisMonth" | "lastMonth") {
    const now = new Date();
    if (preset === "today") {
      const iso = toIsoDate(now);
      setFrom(iso);
      setTo(iso);
    } else if (preset === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFrom(toIsoDate(start));
      setTo(toIsoDate(end));
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFrom(toIsoDate(start));
      setTo(toIsoDate(end));
    }
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      categoryId: e.categoryId,
      amount: String(e.amount),
      vendor: e.vendor ?? "",
      description: e.description ?? "",
      paymentMethod: e.paymentMethod,
      receiptUrl: "",
      isRecurring: e.isRecurring,
      recurrenceInterval: "monthly",
      date: e.date.slice(0, 10),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.categoryId) {
      push("error", "Select a category");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      push("error", "Enter a valid amount");
      return;
    }
    if (!form.date) {
      push("error", "Select a date");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        vendor: form.vendor.trim() || undefined,
        description: form.description.trim() || undefined,
        paymentMethod: form.paymentMethod,
        receiptUrl: form.receiptUrl.trim() || undefined,
        isRecurring: form.isRecurring,
        recurrenceInterval: form.isRecurring ? form.recurrenceInterval : undefined,
        date: new Date(form.date).toISOString(),
      };
      if (editing) {
        await api.patch(`/businesses/${activeBusinessId}/expenses/${editing.id}`, payload);
        push("success", "Expense updated");
      } else {
        await api.post(`/businesses/${activeBusinessId}/expenses`, payload);
        push("success", "Expense recorded");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["expenses", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/businesses/${activeBusinessId}/expenses/${deleteTarget.id}`);
      push("success", "Expense deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["expenses", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Expense>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (e) => formatDate(e.date),
      },
      {
        key: "category",
        header: "Category",
        render: (e) => (
          <div className="flex items-center gap-2">
            <span className="text-ink-800 dark:text-ink-200">{e.category?.name ?? "—"}</span>
            {e.category?.type && <Badge tone="neutral">{titleCase(e.category.type)}</Badge>}
          </div>
        ),
      },
      {
        key: "vendor",
        header: "Vendor",
        render: (e) => <span className="text-ink-600 dark:text-ink-300">{e.vendor ?? "—"}</span>,
      },
      {
        key: "amount",
        header: "Amount",
        render: (e) => <span className="font-medium text-ink-900 dark:text-white">{formatCurrency(e.amount, currency)}</span>,
      },
      {
        key: "paymentMethod",
        header: "Payment",
        render: (e) => titleCase(e.paymentMethod),
      },
      {
        key: "recurring",
        header: "",
        render: (e) => (e.isRecurring ? <Badge tone="info">Recurring</Badge> : null),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (e) =>
          canWrite ? (
            <div className="flex justify-end gap-1">
              <button
                className="btn-ghost p-2"
                aria-label="Edit expense"
                onClick={(ev) => {
                  ev.stopPropagation();
                  openEdit(e);
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="btn-ghost p-2 text-red-600 dark:text-red-400"
                aria-label="Delete expense"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setDeleteTarget(e);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null,
      },
    ],
    [canWrite, currency]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Expenses</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track and categorize your business expenses.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Expense
          </button>
        )}
      </div>

      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">Total for current filter</p>
          <p className="text-xl font-semibold text-ink-900 dark:text-white">
            {formatCurrency(expensesQuery.data?.totalAmount ?? 0, currency)}
          </p>
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px]">
          <label className="label">Category</label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
        <div className="flex flex-wrap gap-2 pb-0.5">
          <button className="btn-secondary" onClick={() => applyPreset("today")}>
            Today
          </button>
          <button className="btn-secondary" onClick={() => applyPreset("thisMonth")}>
            This Month
          </button>
          <button className="btn-secondary" onClick={() => applyPreset("lastMonth")}>
            Last Month
          </button>
          {(from || to) && (
            <button
              className="btn-ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {expensesQuery.isError ? (
        <ErrorState message={getApiErrorMessage(expensesQuery.error)} onRetry={() => expensesQuery.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={expensesQuery.data?.items ?? []}
          rowKey={(e) => e.id}
          isLoading={expensesQuery.isLoading}
          emptyTitle="No expenses found"
          emptyDescription="Try adjusting your filters, or record your first expense."
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: expensesQuery.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit expense" : "New expense"}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Record expense"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Vendor</label>
            <input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Payment method</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.paymentMethod === m
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                  }`}
                  onClick={() => setForm({ ...form, paymentMethod: m })}
                >
                  {titleCase(m)}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Receipt URL (optional)</label>
            <input
              className="input"
              placeholder="https://…"
              value={form.receiptUrl}
              onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-700"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            />
            <label htmlFor="isRecurring" className="text-sm text-ink-700 dark:text-ink-300">
              This is a recurring expense
            </label>
          </div>
          {form.isRecurring && (
            <div>
              <label className="label">Recurrence interval</label>
              <select
                className="input"
                value={form.recurrenceInterval}
                onChange={(e) => setForm({ ...form, recurrenceInterval: e.target.value as ExpenseFormState["recurrenceInterval"] })}
              >
                {RECURRENCE_INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {titleCase(i)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        description={`Delete this expense${deleteTarget?.vendor ? ` from "${deleteTarget.vendor}"` : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
