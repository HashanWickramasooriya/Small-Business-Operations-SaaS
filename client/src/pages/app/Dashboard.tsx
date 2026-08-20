import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DollarSign, ShoppingBag, TrendingDown, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { formatCurrency, formatNumber } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/ui/States";

const COLORS = ["#3b63f5", "#608bfa", "#93b4fd", "#bfd3fe", "#2544ea", "#1e34d6", "#202cad", "#1f2989"];

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

export default function Dashboard() {
  const { activeBusinessId, activeMembership, user } = useAuth();
  const currency = activeMembership?.business.currency ?? "USD";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/dashboard`)).data,
    enabled: !!activeBusinessId,
  });

  if (isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (isError || !data) return <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />;

  const { cards, charts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Here's how {activeMembership?.business.name} is performing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's sales" value={formatCurrency(cards.todaySales, currency)} icon={DollarSign} />
        <StatCard label="Today's orders" value={formatNumber(cards.todayOrders)} icon={ShoppingBag} />
        <StatCard label="Month revenue" value={formatCurrency(cards.monthRevenue, currency)} icon={TrendingUp} tone="success" />
        <StatCard label="Month expenses" value={formatCurrency(cards.monthExpenses, currency)} icon={TrendingDown} />
        <StatCard label="Net profit (month)" value={formatCurrency(cards.netProfit, currency)} icon={Wallet} tone={cards.netProfit >= 0 ? "success" : "danger"} />
        <StatCard label="Low-stock products" value={formatNumber(cards.lowStockProducts)} icon={AlertTriangle} tone={cards.lowStockProducts > 0 ? "danger" : "default"} />
        <StatCard label="Outstanding payments" value={formatCurrency(cards.outstandingPayments, currency)} icon={Wallet} tone={cards.outstandingPayments > 0 ? "danger" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Sales — last 7 days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.salesByDay.map((d: { day: string; total: number }) => ({ day: new Date(d.day).toLocaleDateString(undefined, { weekday: "short" }), total: d.total }))}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b63f5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b63f5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-ink-100 dark:stroke-ink-800" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Area type="monotone" dataKey="total" stroke="#3b63f5" strokeWidth={2} fill="url(#salesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Payment methods (month)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.paymentMethods} dataKey="total" nameKey="method" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {charts.paymentMethods.map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500 dark:text-ink-400">
            {charts.paymentMethods.map((p: { method: string }, i: number) => (
              <span key={p.method} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {p.method}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Top products (month)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#3b63f5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink-800 dark:text-ink-100">Sales by category (month)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.salesByCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-ink-100 dark:stroke-ink-800" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="total" fill="#608bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
