import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Download, Upload, Pencil, Archive, ArchiveRestore, ImageOff } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency } from "../../../lib/format";
import { canAccessModule } from "../../../lib/permissions";
import { useToast } from "../../../components/Toast";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ErrorState } from "../../../components/ui/States";
import { Category, Product, Paginated } from "../../../types";

const PAGE_SIZE = 15;

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  description: string;
  purchasePrice: string;
  sellingPrice: string;
  taxRate: string;
  minStock: string;
  unit: string;
  supplierId: string;
  stock: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  categoryId: "",
  description: "",
  purchasePrice: "",
  sellingPrice: "",
  taxRate: "0",
  minStock: "0",
  unit: "pcs",
  supplierId: "",
  stock: "0",
  imageUrl: "",
};

export default function ProductsPage() {
  const { activeBusinessId, role, activeMembership } = useAuth();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = canAccessModule(role, "products") && (role === "OWNER" || role === "MANAGER");
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // clear highlight after a while
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("highlight");
      setSearchParams(next, { replace: true });
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  const categoriesQuery = useQuery({
    queryKey: ["categories", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/categories`)).data.categories as Category[],
    enabled: !!activeBusinessId,
  });

  const suppliersQuery = useQuery({
    queryKey: ["suppliers-lite", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/suppliers`)).data.items as { id: string; name: string }[],
    enabled: !!activeBusinessId && modalOpen,
  });

  const productsQuery = useQuery({
    queryKey: ["products", activeBusinessId, search, categoryId, status, lowStockOnly, page],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { page, pageSize: PAGE_SIZE };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (status !== "ALL") params.status = status;
      if (lowStockOnly) params.lowStock = true;
      const { data } = await api.get<Paginated<Product>>(`/businesses/${activeBusinessId}/products`, { params });
      return data;
    },
    enabled: !!activeBusinessId,
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      categoryId: p.categoryId ?? "",
      description: p.description ?? "",
      purchasePrice: String(p.purchasePrice),
      sellingPrice: String(p.sellingPrice),
      taxRate: String(p.taxRate),
      minStock: String(p.minStock),
      unit: p.unit,
      supplierId: p.supplierId ?? "",
      stock: String(p.stock),
      imageUrl: p.imageUrl ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim()) {
      push("error", "Name and SKU are required");
      return;
    }
    if (!form.sellingPrice || !form.purchasePrice) {
      push("error", "Purchase price and selling price are required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        categoryId: form.categoryId || null,
        description: form.description.trim() || null,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        taxRate: Number(form.taxRate || 0),
        minStock: Number(form.minStock || 0),
        unit: form.unit.trim() || "pcs",
        supplierId: form.supplierId || null,
        imageUrl: form.imageUrl.trim() || null,
      };
      if (editing) {
        await api.patch(`/businesses/${activeBusinessId}/products/${editing.id}`, payload);
        push("success", "Product updated");
      } else {
        payload.stock = Number(form.stock || 0);
        await api.post(`/businesses/${activeBusinessId}/products`, payload);
        push("success", "Product created");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.post(`/businesses/${activeBusinessId}/products/${archiveTarget.id}/archive`);
      push("success", archiveTarget.status === "ACTIVE" ? "Product archived" : "Product restored");
      setArchiveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["products", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setArchiving(false);
    }
  }

  async function handleExport() {
    try {
      const { data } = await api.get<Paginated<Product>>(`/businesses/${activeBusinessId}/products`, {
        params: { page: 1, pageSize: 5000, ...(search ? { search } : {}), ...(categoryId ? { categoryId } : {}), ...(status !== "ALL" ? { status } : {}), ...(lowStockOnly ? { lowStock: true } : {}) },
      });
      const rows = data.items;
      const headers = ["name", "sku", "barcode", "category", "purchasePrice", "sellingPrice", "taxRate", "stock", "minStock", "unit", "status"];
      const csvEscape = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        headers.join(","),
        ...rows.map((p) =>
          [p.name, p.sku, p.barcode ?? "", p.category?.name ?? "", p.purchasePrice, p.sellingPrice, p.taxRate, p.stock, p.minStock, p.unit, p.status]
            .map(csvEscape)
            .join(",")
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      push("success", "Export downloaded");
    } catch (err) {
      push("error", getApiErrorMessage(err));
    }
  }

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
          if (c === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (c === '"') {
            inQuotes = false;
          } else {
            cur += c;
          }
        } else if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          out.push(cur);
          cur = "";
        } else {
          cur += c;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = parseLine(lines[0]).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = (cols[i] ?? "").trim()));
      return row;
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const products = rows
        .filter((r) => r.name && r.sku)
        .map((r) => ({
          name: r.name,
          sku: r.sku,
          barcode: r.barcode || undefined,
          purchasePrice: Number(r.purchasePrice || 0),
          sellingPrice: Number(r.sellingPrice || 0),
          taxRate: Number(r.taxRate || 0),
          stock: Number(r.stock || 0),
          minStock: Number(r.minStock || 0),
          unit: r.unit || "pcs",
        }));
      if (products.length === 0) {
        push("error", "No valid rows found in CSV (name and sku are required)");
        return;
      }
      const { data } = await api.post(`/businesses/${activeBusinessId}/products/import`, { products });
      push("success", `Imported ${data.created} product(s)${data.skipped ? `, skipped ${data.skipped} duplicate(s)` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["products", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const categories = categoriesQuery.data ?? [];

  // Since DataTable doesn't expose a per-row className hook, we tint each cell's
  // content area (covering the td's own padding via negative margins) to make the
  // whole row read as highlighted when linked here from GlobalSearch.
  function cellWrap(productId: string, content: React.ReactNode) {
    const isHighlighted = productId === highlightId;
    return (
      <div className={isHighlighted ? "-mx-4 -my-3 rounded bg-brand-50 px-4 py-3 transition-colors duration-1000 dark:bg-brand-950/40" : ""}>
        {content}
      </div>
    );
  }

  const columns: Column<Product>[] = useMemo(
    () => [
      {
        key: "product",
        header: "Product",
        render: (p) =>
          cellWrap(
            p.id,
            <div className="flex items-center gap-3">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  {p.name.charAt(0).toUpperCase() || <ImageOff className="h-4 w-4" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{p.sku}</p>
              </div>
            </div>
          ),
      },
      {
        key: "category",
        header: "Category",
        render: (p) => cellWrap(p.id, <span className="text-ink-600 dark:text-ink-300">{p.category?.name ?? "—"}</span>),
      },
      {
        key: "stock",
        header: "Stock",
        render: (p) =>
          cellWrap(
            p.id,
            p.stock <= p.minStock ? (
              <Badge tone={p.stock <= 0 ? "danger" : "warning"}>
                {p.stock} {p.unit}
              </Badge>
            ) : (
              <span>
                {p.stock} {p.unit}
              </span>
            )
          ),
      },
      {
        key: "price",
        header: "Selling price",
        render: (p) => cellWrap(p.id, <>{formatCurrency(p.sellingPrice, currency)}</>),
      },
      {
        key: "status",
        header: "Status",
        render: (p) =>
          cellWrap(p.id, <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status === "ACTIVE" ? "Active" : "Archived"}</Badge>),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (p) =>
          cellWrap(
            p.id,
            canWrite ? (
              <div className="flex justify-end gap-1">
                <button
                  className="btn-ghost p-2"
                  aria-label="Edit product"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost p-2"
                  aria-label={p.status === "ACTIVE" ? "Archive product" : "Restore product"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setArchiveTarget(p);
                  }}
                >
                  {p.status === "ACTIVE" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                </button>
              </div>
            ) : null
          ),
      },
    ],
    [canWrite, currency, highlightId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage your product catalog, pricing and stock.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {canWrite && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
              <button className="btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {importing ? "Importing…" : "Import CSV"}
              </button>
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Product
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, SKU or barcode…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
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
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
        >
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="ALL">All</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-700"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      {productsQuery.isError ? (
        <ErrorState message={getApiErrorMessage(productsQuery.error)} onRetry={() => productsQuery.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={productsQuery.data?.items ?? []}
          rowKey={(p) => p.id}
          isLoading={productsQuery.isLoading}
          emptyTitle="No products found"
          emptyDescription="Try adjusting your filters, or add your first product."
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: productsQuery.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit product" : "New product"}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Product name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Rice (5kg)" />
          </div>
          <div>
            <label className="label">SKU</label>
            <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
          </div>
          <div>
            <label className="label">Barcode</label>
            <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">None</option>
              {(suppliersQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
          <div>
            <label className="label">Purchase price</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Selling price</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tax rate (%)</label>
            <input type="number" step="0.01" className="input" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
          </div>
          <div>
            <label className="label">Unit</label>
            <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs" />
          </div>
          <div>
            <label className="label">Minimum stock</label>
            <input type="number" className="input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          </div>
          {!editing && (
            <div>
              <label className="label">Initial stock</label>
              <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Image URL</label>
            <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          </div>
          {editing && (
            <p className="sm:col-span-2 text-xs text-ink-500 dark:text-ink-400">
              Stock can't be edited here — use the Inventory page to adjust stock levels.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.status === "ACTIVE" ? "Archive product" : "Restore product"}
        description={
          archiveTarget?.status === "ACTIVE"
            ? `Archive "${archiveTarget?.name}"? It will be hidden from active product lists and can't be sold until restored.`
            : `Restore "${archiveTarget?.name}" to active status?`
        }
        confirmLabel={archiveTarget?.status === "ACTIVE" ? "Archive" : "Restore"}
        danger={archiveTarget?.status === "ACTIVE"}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
        loading={archiving}
      />
    </div>
  );
}
