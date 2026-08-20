import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download, DollarSign, ShoppingBag, Percent, Tag, TrendingUp, TrendingDown, Wallet, Package, AlertTriangle } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../../../lib/format";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "../../../components/ui/States";
import { useToast } from "../../../components/Toast";
import { humanizeAction } from "../activity/ActivityPage";
import { ActivityLogItem, Sale } from "../../../types";

const COLORS = ["#3b63f5", "#608bfa", "#93b4fd", "#bfd3fe", "#2544ea", "#1e34d6", "#202cad", "#1f2989"];

type Preset = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7days", label: "Last 7 Days" },
  { key: "last30days", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

type ReportType = "sales" | "revenue" | "inventory" | "product-performance" | "customers" | "expenses" | "employee-activity";

const REPORT_TYPES: { key: ReportType; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "revenue", label: "Revenue & Profit" },
  { key: "inventory", label: "Inventory" },
  { key: "product-performance", label: "Product Performance" },
  { key: "customers", label: "Customers" },
  { key: "expenses", label: "Expenses" },
  { key: "employee-activity", label: "Employee Activity" },
];

function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: typeof DollarSign; tone?: "default" | "danger" | "success" }) {
  const toneClasses = {
    default: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400",
    danger: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-500 dark:text-ink-400">{label}</p>
        <p className="text-xl font-semibold text-ink-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { activeBusinessId, activeMembership } = useAuth();
  const currency = activeMembership?.business.currency ?? "USD";
  const { push } = useToast();

  const [reportType, setReportType] = useState<ReportType>("sales");
  const [preset, setPreset] = useState<Preset>("last7days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = { preset };
    if (preset === "custom") {
      if (customFrom) p.from = customFrom;
      if (customTo) p.to = customTo;
    }
    return p;
  }, [preset, customFrom, customTo]);

  const enabledFor = (type: ReportType) => !!activeBusinessId && reportType === type;

  const salesQuery = useQuery({
    queryKey: ["reports", "sales", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/sales`, { params })).data,
    enabled: enabledFor("sales"),
  });

  const revenueQuery = useQuery({
    queryKey: ["reports", "revenue", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/revenue`, { params })).data,
    enabled: enabledFor("revenue"),
  });

  const inventoryQuery = useQuery({
    queryKey: ["reports", "inventory", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/inventory`, { params })).data,
    enabled: enabledFor("inventory"),
  });

  const productPerfQuery = useQuery({
    queryKey: ["reports", "product-performance", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/product-performance`, { params })).data,
    enabled: enabledFor("product-performance"),
  });

  const customersQuery = useQuery({
    queryKey: ["reports", "customers", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/customers`, { params })).data,
    enabled: enabledFor("customers"),
  });

  const expensesQuery = useQuery({
    queryKey: ["reports", "expenses", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/expenses`, { params })).data,
    enabled: enabledFor("expenses"),
  });

  const employeeActivityQuery = useQuery({
    queryKey: ["reports", "employee-activity", activeBusinessId, params],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/reports/employee-activity`, { params })).data,
    enabled: enabledFor("employee-activity"),
  });

  function handleExport() {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (reportType === "sales" && salesQuery.data) {
        downloadCsv(
          `sales-report-${stamp}.csv`,
          ["reference", "customer", "status", "paymentMethod", "subtotal", "discount", "tax", "total", "createdAt"],
          (salesQuery.data.sales as Sale[]).map((s) => [s.reference, s.customer?.name ?? "", s.status, s.paymentMethod, s.subtotal, s.discount, s.tax, s.total, s.createdAt])
        );
      } else if (reportType === "revenue" && revenueQuery.data) {
        downloadCsv(`revenue-report-${stamp}.csv`, ["totalRevenue", "totalExpenses", "netProfit"], [[revenueQuery.data.totalRevenue, revenueQuery.data.totalExpenses, revenueQuery.data.netProfit]]);
      } else if (reportType === "inventory" && inventoryQuery.data) {
        downloadCsv(
          `inventory-report-${stamp}.csv`,
          ["name", "sku", "stock", "minStock", "purchasePrice", "sellingPrice"],
          inventoryQuery.data.products.map((p: { name: string; sku: string; stock: number; minStock: number; purchasePrice: number; sellingPrice: number }) => [
            p.name,
            p.sku,
            p.stock,
            p.minStock,
            p.purchasePrice,
            p.sellingPrice,
          ])
        );
      } else if (reportType === "product-performance" && productPerfQuery.data) {
        downloadCsv(
          `product-performance-${stamp}.csv`,
          ["name", "sku", "totalQuantity", "totalRevenue"],
          productPerfQuery.data.items.map((i: { name: string; sku: string; totalQuantity: number; totalRevenue: number }) => [i.name, i.sku, i.totalQuantity, i.totalRevenue])
        );
      } else if (reportType === "customers" && customersQuery.data) {
        downloadCsv(
          `customers-report-${stamp}.csv`,
          ["name", "orders", "totalSpent"],
          customersQuery.data.items.map((c: { name: string; orders: number; totalSpent: number }) => [c.name, c.orders, c.totalSpent])
        );
      } else if (reportType === "expenses" && expensesQuery.data) {
        downloadCsv(
          `expenses-report-${stamp}.csv`,
          ["category", "amount"],
          expensesQuery.data.byCategory.map((c: { categoryName: string; amount: number }) => [c.categoryName, c.amount])
        );
      } else if (reportType === "employee-activity" && employeeActivityQuery.data) {
        downloadCsv(
          `employee-activity-${stamp}.csv`,
          ["user", "action", "entityType", "createdAt"],
          (employeeActivityQuery.data.items as ActivityLogItem[]).map((a) => [a.user?.fullName ?? "", humanizeAction(a.action), a.entityType, a.createdAt])
        );
      } else {
        push("error", "No data loaded yet to export");
        return;
      }
      push("success", "Export downloaded");
    } catch (err) {
      push("error", getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Insights into sales, inventory, customers and more.</p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        {PRESETS.map((p) => (
          <button key={p.key} className={preset === p.key ? "btn-primary px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"} onClick={() => setPreset(p.key)}>
            {p.label}
          </button>
        ))}
        <button className={preset === "custom" ? "btn-primary px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"} onClick={() => setPreset("custom")}>
          Custom
        </button>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" className="input w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-sm text-ink-400">to</span>
            <input type="date" className="input w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <div className="border-b border-ink-200 dark:border-ink-800">
        <div className="flex flex-wrap gap-6">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                reportType === t.key ? "text-brand-600 dark:text-brand-400" : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100"
              }`}
            >
              {t.label}
              {reportType === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
            </button>
          ))}
        </div>
      </div>

      {reportType === "sales" && <SalesReport query={salesQuery} currency={currency} />}
      {reportType === "revenue" && <RevenueReport query={revenueQuery} currency={currency} />}
      {reportType === "inventory" && <InventoryReport query={inventoryQuery} currency={currency} />}
      {reportType === "product-performance" && <ProductPerformanceReport query={productPerfQuery} currency={currency} />}
      {reportType === "customers" && <CustomersReport query={customersQuery} currency={currency} />}
      {reportType === "expenses" && <ExpensesReport query={expensesQuery} currency={currency} />}
      {reportType === "employee-activity" && <EmployeeActivityReport query={employeeActivityQuery} />}
    </div>
  );
}

// ---------- Sales ----------

interface SalesReportData {
  summary: { totalRevenue: number; totalOrders: number; totalTax: number; totalDiscount: number };
  byDay: { day: string; total: number }[];
  sales: Sale[];
}

function SalesReport({ query, currency }: { query: ReturnType<typeof useQuery<SalesReportData>>; currency: string }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const { summary, byDay, sales } = query.data;

  const columns: Column<Sale>[] = [
    { key: "reference", header: "Reference", render: (s) => <span className="font-medium text-ink-900 dark:text-white">{s.reference}</span> },
    { key: "customer", header: "Customer", render: (s) => <span className="text-ink-600 dark:text-ink-300">{s.customer?.name ?? "Walk-in"}</span> },
    { key: "status", header: "Status", render: (s) => <Badge tone={s.status === "COMPLETED" ? "success" : s.status === "VOID" ? "danger" : "warning"}>{s.status}</Badge> },
    { key: "total", header: "Total", render: (s) => formatCurrency(s.total, currency) },
    { key: "createdAt", header: "Date", render: (s) => formatDateTime(s.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue, currency)} icon={DollarSign} />
        <StatCard label="Total Orders" value={formatNumber(summary.totalOrders)} icon={ShoppingBag} />
        <StatCard label="Total Tax" value={formatCurrency(summary.totalTax, currency)} icon={Percent} />
        <StatCard label="Total Discount" value={formatCurrency(summary.totalDiscount, currency)} icon={Tag} />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Sales over time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={byDay.map((d) => ({ day: formatDate(d.day, { month: "short", day: "numeric" }), total: d.total }))}>
            <defs>
              <linearGradient id="salesReportGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b63f5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b63f5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-ink-100 dark:stroke-ink-800" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Area type="monotone" dataKey="total" stroke="#3b63f5" strokeWidth={2} fill="url(#salesReportGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DataTable columns={columns} rows={sales} rowKey={(s) => s.id} emptyTitle="No sales in this range" />
    </div>
  );
}

// ---------- Revenue & Profit ----------

function RevenueReport({ query, currency }: { query: ReturnType<typeof useQuery<{ totalRevenue: number; totalExpenses: number; netProfit: number }>>; currency: string }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const { totalRevenue, totalExpenses, netProfit } = query.data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Total Revenue" value={formatCurrency(totalRevenue, currency)} icon={TrendingUp} tone="success" />
      <StatCard label="Total Expenses" value={formatCurrency(totalExpenses, currency)} icon={TrendingDown} />
      <StatCard label="Net Profit" value={formatCurrency(netProfit, currency)} icon={Wallet} tone={netProfit >= 0 ? "success" : "danger"} />
    </div>
  );
}

// ---------- Inventory ----------

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
}

function InventoryReport({
  query,
  currency,
}: {
  query: ReturnType<typeof useQuery<{ products: InventoryProduct[]; stockValue: number; lowStockCount: number; lowStock: InventoryProduct[] }>>;
  currency: string;
}) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const { products, stockValue, lowStockCount } = query.data;

  const columns: Column<InventoryProduct>[] = [
    { key: "name", header: "Product", render: (p) => <span className="font-medium text-ink-900 dark:text-white">{p.name}</span> },
    { key: "sku", header: "SKU", render: (p) => <span className="text-ink-500 dark:text-ink-400">{p.sku}</span> },
    {
      key: "stock",
      header: "Stock",
      render: (p) => (p.stock <= p.minStock ? <Badge tone={p.stock <= 0 ? "danger" : "warning"}>{p.stock}</Badge> : <span>{p.stock}</span>),
    },
    { key: "minStock", header: "Min stock", render: (p) => p.minStock },
    { key: "value", header: "Stock value", render: (p) => formatCurrency(p.stock * p.purchasePrice, currency) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Stock Value" value={formatCurrency(stockValue, currency)} icon={Package} />
        <StatCard label="Low Stock Products" value={formatNumber(lowStockCount)} icon={AlertTriangle} tone={lowStockCount > 0 ? "danger" : "default"} />
      </div>
      <DataTable columns={columns} rows={products} rowKey={(p) => p.id} emptyTitle="No products found" />
    </div>
  );
}

// ---------- Product Performance ----------

interface ProductPerfItem {
  productId: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
}

function ProductPerformanceReport({ query, currency }: { query: ReturnType<typeof useQuery<{ items: ProductPerfItem[] }>>; currency: string }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const items = query.data.items;
  const topByRevenue = [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

  const columns: Column<ProductPerfItem>[] = [
    { key: "name", header: "Product", render: (p) => <span className="font-medium text-ink-900 dark:text-white">{p.name}</span> },
    { key: "sku", header: "SKU", render: (p) => <span className="text-ink-500 dark:text-ink-400">{p.sku}</span> },
    { key: "qty", header: "Units sold", render: (p) => formatNumber(p.totalQuantity) },
    { key: "revenue", header: "Revenue", render: (p) => formatCurrency(p.totalRevenue, currency) },
  ];

  if (items.length === 0) return <EmptyState title="No product sales in this range" />;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Top products by revenue</h2>
        <ResponsiveContainer width="100%" height={Math.max(220, topByRevenue.length * 36)}>
          <BarChart data={topByRevenue} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Bar dataKey="totalRevenue" fill="#3b63f5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={columns} rows={items} rowKey={(p) => p.productId} emptyTitle="No product sales in this range" />
    </div>
  );
}

// ---------- Customers ----------

interface CustomerItem {
  customerId: string;
  name: string;
  orders: number;
  totalSpent: number;
}

function CustomersReport({ query, currency }: { query: ReturnType<typeof useQuery<{ items: CustomerItem[] }>>; currency: string }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const items = [...query.data.items].sort((a, b) => b.totalSpent - a.totalSpent);

  const columns: Column<CustomerItem>[] = [
    { key: "name", header: "Customer", render: (c) => <span className="font-medium text-ink-900 dark:text-white">{c.name}</span> },
    { key: "orders", header: "Orders", render: (c) => formatNumber(c.orders) },
    { key: "totalSpent", header: "Total spent", render: (c) => formatCurrency(c.totalSpent, currency) },
  ];

  return <DataTable columns={columns} rows={items} rowKey={(c) => c.customerId} emptyTitle="No customer activity in this range" />;
}

// ---------- Expenses ----------

interface ExpenseCategoryRow {
  categoryId: string;
  categoryName: string;
  amount: number;
}

function ExpensesReport({ query, currency }: { query: ReturnType<typeof useQuery<{ total: number; byCategory: ExpenseCategoryRow[] }>>; currency: string }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const { total, byCategory } = query.data;

  if (byCategory.length === 0) {
    return (
      <div className="space-y-6">
        <StatCard label="Total Expenses" value={formatCurrency(total, currency)} icon={DollarSign} />
        <EmptyState title="No expenses in this range" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:w-72">
        <StatCard label="Total Expenses" value={formatCurrency(total, currency)} icon={DollarSign} />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Expenses by category</h2>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={byCategory} dataKey="amount" nameKey="categoryName" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {byCategory.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500 dark:text-ink-400">
          {byCategory.map((c, i) => (
            <span key={c.categoryId} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {c.categoryName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Employee Activity ----------

function EmployeeActivityReport({ query }: { query: ReturnType<typeof useQuery<{ items: ActivityLogItem[] }>> }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  const items = query.data.items;

  if (items.length === 0) return <EmptyState title="No employee activity in this range" />;

  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {items.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {a.user?.avatarUrl ? (
              <img src={a.user.avatarUrl} alt={a.user.fullName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                {a.user?.fullName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{a.user?.fullName ?? "System"}</p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{humanizeAction(a.action)}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-ink-500 dark:text-ink-400">{formatDateTime(a.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
