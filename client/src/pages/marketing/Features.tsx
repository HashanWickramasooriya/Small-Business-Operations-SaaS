import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  UserCog,
  BarChart3,
  FileText,
  ArrowRight,
  Check,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Package,
    title: "Inventory management",
    description:
      "Keep an accurate, real-time picture of what you have on hand. Track products, variants, and stock levels across every location, and get ahead of shortages before they cost you a sale.",
    points: [
      "Real-time stock levels across locations",
      "Low-stock and reorder point alerts",
      "Product variants, categories, and SKUs",
      "Stock adjustments with a full audit trail",
    ],
    mockup: (
      <div className="space-y-2">
        {[
          { name: "Espresso Beans 1kg", stock: 82, status: "In stock" },
          { name: "Paper Cups (100pk)", stock: 14, status: "Low stock" },
          { name: "Oat Milk Carton", stock: 0, status: "Out of stock" },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
            <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{item.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-400">{item.stock} units</span>
              <span
                className={`badge ${
                  item.status === "In stock"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : item.status === "Low stock"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: ShoppingCart,
    title: "Sales management",
    description:
      "Record sales as they happen, apply discounts, and keep a clean transaction history. Every sale automatically updates your inventory and revenue numbers, so your books never fall behind reality.",
    points: [
      "Fast sales entry with line-item detail",
      "Discounts, taxes, and payment tracking",
      "Automatic inventory sync on every sale",
      "Full sales history, searchable and filterable",
    ],
    mockup: (
      <div className="rounded-lg border border-ink-100 p-4 dark:border-ink-800">
        <p className="text-xs font-medium text-ink-400">Today&apos;s sales</p>
        <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-white">$1,842.50</p>
        <p className="mt-1 text-xs font-medium text-emerald-500">32 transactions · +9.2% vs yesterday</p>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Customer management",
    description:
      "Build a complete picture of every customer — contact details, purchase history, and preferences — so you can serve repeat customers faster and spot your most valuable relationships.",
    points: [
      "Centralized customer directory",
      "Purchase history per customer",
      "Contact and communication details",
      "Segment customers by activity",
    ],
    mockup: (
      <div className="space-y-2">
        {["Amara Chen", "Daniel Okafor", "Priya Nandakumar"].map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              {name.split(" ").map((n) => n[0]).join("")}
            </div>
            <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{name}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Truck,
    title: "Supplier management",
    description:
      "Keep supplier details, purchase orders, and lead times organized in one place, so restocking is a quick, predictable process instead of a scramble.",
    points: [
      "Supplier directory with contact info",
      "Purchase order creation and tracking",
      "Lead time and delivery visibility",
      "Link suppliers directly to products",
    ],
    mockup: (
      <div className="rounded-lg border border-ink-100 p-4 dark:border-ink-800">
        <p className="text-xs font-medium text-ink-400">Open purchase orders</p>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-ink-700 dark:text-ink-200">PO-1042 · Coastal Roasters</span><span className="text-ink-400">Due in 3 days</span></div>
          <div className="flex justify-between text-sm"><span className="text-ink-700 dark:text-ink-200">PO-1039 · Northline Supplies</span><span className="text-ink-400">Due in 6 days</span></div>
        </div>
      </div>
    ),
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description:
      "Record and categorize every expense so you always know where your money is going. Compare spend across categories and time periods without touching a spreadsheet.",
    points: [
      "Categorized expense entries",
      "Recurring expense support",
      "Spend breakdowns by category",
      "Month-over-month comparisons",
    ],
    mockup: (
      <div className="rounded-lg border border-ink-100 p-4 dark:border-ink-800">
        <p className="text-xs font-medium text-ink-400">Expenses this month</p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-700 dark:text-ink-200">Rent</span><span className="font-medium text-ink-900 dark:text-white">$2,400</span></div>
          <div className="flex justify-between"><span className="text-ink-700 dark:text-ink-200">Supplies</span><span className="font-medium text-ink-900 dark:text-white">$860</span></div>
          <div className="flex justify-between"><span className="text-ink-700 dark:text-ink-200">Utilities</span><span className="font-medium text-ink-900 dark:text-white">$310</span></div>
        </div>
      </div>
    ),
  },
  {
    icon: UserCog,
    title: "Employee management",
    description:
      "Manage staff roles and access as your team grows. Grant the right level of access to each person, from cashiers to managers to owners.",
    points: [
      "Role-based access control",
      "Team member directory",
      "Granular permissions per module",
      "Simple onboarding for new staff",
    ],
    mockup: (
      <div className="space-y-2">
        {[
          { name: "Maya Torres", role: "Manager" },
          { name: "Leo Fischer", role: "Cashier" },
        ].map((emp) => (
          <div key={emp.name} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
            <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{emp.name}</span>
            <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{emp.role}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Business analytics",
    description:
      "See how your business is actually performing with dashboards built for owners, not analysts. Track revenue, margins, and trends without exporting a single spreadsheet.",
    points: [
      "Revenue and margin dashboards",
      "Trend charts over custom date ranges",
      "Top products and top customers views",
      "At-a-glance performance summaries",
    ],
    mockup: (
      <div className="rounded-lg border border-ink-100 p-4 dark:border-ink-800">
        <div className="flex h-20 items-end gap-1.5">
          {[30, 55, 40, 70, 50, 85, 65, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-brand-500/80 dark:bg-brand-500" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    title: "Reports",
    description:
      "Generate clean, exportable reports for sales, inventory, and finances whenever you need them, ready to share with a partner, accountant, or investor.",
    points: [
      "Sales, inventory, and expense reports",
      "Custom date range selection",
      "Exportable, shareable formats",
      "Scheduled report snapshots",
    ],
    mockup: (
      <div className="space-y-2">
        {["Monthly Sales Report", "Inventory Valuation", "Expense Summary"].map((r) => (
          <div key={r} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
            <span className="flex items-center gap-2 text-sm font-medium text-ink-800 dark:text-ink-100">
              <FileText className="h-4 w-4 text-ink-400" /> {r}
            </span>
            <span className="text-xs text-ink-400">PDF · CSV</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Features() {
  return (
    <div>
      <section className="border-b border-ink-200 py-16 dark:border-ink-800 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">Features</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            Every operation, one platform.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            BusinessOS brings together the tools small businesses actually use every day — no bloated features,
            no disconnected apps, just what you need to run your operations well.
          </p>
        </div>
      </section>

      <div className="divide-y divide-ink-200 dark:divide-ink-800">
        {SECTIONS.map((section, i) => (
          <section key={section.title} className={i % 2 === 1 ? "bg-white dark:bg-ink-950" : ""}>
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div
                className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
                    {section.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">{section.description}</p>
                  <ul className="mt-6 space-y-2.5">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-5">{section.mockup}</div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-ink-200 py-20 dark:border-ink-800">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-ink-200 bg-gradient-to-br from-brand-50 to-white p-10 dark:border-ink-800 dark:from-brand-950/40 dark:to-ink-900 sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
              See it running your business.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-600 dark:text-ink-300">
              Create a free account and explore every feature with your own data.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-6 py-3 text-base">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className="btn-secondary px-6 py-3 text-base">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
