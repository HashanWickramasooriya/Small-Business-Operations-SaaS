import { useState } from "react";
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
  Clock,
  ShieldCheck,
  Boxes,
  TrendingUp,
  Wallet,
  Sparkles,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Package,
    title: "Inventory management",
    description: "Track stock levels, variants, and reorder points across every location in real time.",
  },
  {
    icon: ShoppingCart,
    title: "Sales management",
    description: "Log sales, apply discounts, and keep a clear record of every transaction you make.",
  },
  {
    icon: Users,
    title: "Customer management",
    description: "Build a complete customer directory with purchase history and contact details.",
  },
  {
    icon: Truck,
    title: "Supplier management",
    description: "Organize suppliers, purchase orders, and lead times in one place.",
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description: "Record and categorize expenses so you always know where money is going.",
  },
  {
    icon: UserCog,
    title: "Employee management",
    description: "Manage staff roles, permissions, and access across your growing team.",
  },
  {
    icon: BarChart3,
    title: "Business analytics",
    description: "Visualize revenue, margins, and trends with dashboards built for owners.",
  },
  {
    icon: FileText,
    title: "Reports",
    description: "Generate clean, exportable reports for sales, inventory, and finances.",
  },
];

const STEPS = [
  { title: "Create your business", description: "Set up your workspace with a few details about your business." },
  { title: "Add your products", description: "Import or add your inventory so everything is ready to sell." },
  { title: "Manage daily operations", description: "Handle sales, customers, and suppliers from a single dashboard." },
  { title: "Track performance", description: "Watch analytics update as your business runs day to day." },
  { title: "Grow your business", description: "Use insights and reports to make confident, data-backed decisions." },
];

const BENEFITS = [
  { icon: Clock, title: "Save time", description: "Automate the busywork so you can focus on running your business." },
  { icon: ShieldCheck, title: "Reduce mistakes", description: "Structured workflows mean fewer errors in orders, stock, and books." },
  { icon: Boxes, title: "Know your stock", description: "Always know what's on hand and what needs reordering." },
  { icon: TrendingUp, title: "Understand your sales", description: "See what's selling, when, and to whom, at a glance." },
  { icon: Wallet, title: "Control expenses", description: "Keep spending visible and organized across every category." },
  { icon: Sparkles, title: "Make better decisions", description: "Real data replaces guesswork when it's time to plan ahead." },
];

const TESTIMONIALS = [
  {
    quote: "BusinessOS replaced three different spreadsheets we used to juggle every week. Everything just lives in one place now.",
    name: "Amara Chen",
    role: "Owner, Riverside Coffee Roasters",
  },
  {
    quote: "The inventory and sales views finally talk to each other. I know exactly what to reorder before I run out.",
    name: "Daniel Okafor",
    role: "Founder, Okafor Hardware",
  },
  {
    quote: "Reports that used to take me an afternoon now take a few clicks. It's changed how I plan each month.",
    name: "Priya Nandakumar",
    role: "Manager, Nandakumar Textiles",
  },
];

const FAQS = [
  {
    q: "Is my business data secure?",
    a: "Yes. Every account is isolated in its own secure tenant, access is protected by authentication, and sensitive data is handled with industry-standard practices throughout the platform.",
  },
  {
    q: "Who can see my data?",
    a: "Only members of your business that you invite can access your workspace. You control roles and permissions for every user on your team.",
  },
  {
    q: "How many users can I add?",
    a: "The number of users you can add depends on your plan. Free and Starter plans support small teams, while Professional and Enterprise scale to larger organizations.",
  },
  {
    q: "Can I track inventory across multiple locations?",
    a: "Yes. BusinessOS supports tracking stock, transfers, and reorder points across as many locations as your business operates.",
  },
  {
    q: "What does pricing look like?",
    a: "We offer a free plan to get started, plus paid tiers that unlock more users, locations, and advanced analytics. See the Pricing page for full details.",
  },
  {
    q: "How long does it take to set up my business?",
    a: "Most businesses are up and running in minutes. Create your workspace, add your first products, and you're ready to start recording sales.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Reports and core records can be exported so your data is never locked in, and you always keep a copy for your own records.",
  },
];

function DashboardMockup() {
  return (
    <div className="card mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-xs font-medium text-ink-400">Dashboard preview</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Revenue", value: "$48,210", change: "+12.4%" },
          { label: "Orders", value: "1,284", change: "+6.1%" },
          { label: "Stock items", value: "3,902", change: "-2.0%" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-ink-100 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-800/40">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">{stat.value}</p>
            <p className={`mt-0.5 text-xs font-medium ${stat.change.startsWith("-") ? "text-red-500" : "text-emerald-500"}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-ink-100 p-4 dark:border-ink-800">
        <p className="text-xs font-medium text-ink-400">Sales this week</p>
        <div className="mt-3 flex h-28 items-end gap-2">
          {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-brand-500/80 dark:bg-brand-500" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-ink-400">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-200 py-4 dark:border-ink-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-ink-900 dark:text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{a}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              Built for small business operations
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-5xl lg:text-6xl">
              Everything your small business needs to run smarter.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              BusinessOS brings inventory, sales, customers, suppliers, expenses, and reporting into a single,
              simple system — so you spend less time juggling tools and more time growing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-6 py-3 text-base">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/features" className="btn-secondary px-6 py-3 text-base">
                Explore Features
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-400">No credit card required to get started.</p>
          </div>
          <DashboardMockup />
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white py-20 dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
              One system for every part of your operations
            </h2>
            <p className="mt-4 text-ink-500 dark:text-ink-400">
              Stop switching between spreadsheets and disconnected apps. BusinessOS covers the essentials.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">How it works</h2>
            <p className="mt-4 text-ink-500 dark:text-ink-400">From setup to insight in five straightforward steps.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white py-20 dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">Why teams choose BusinessOS</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4 rounded-xl border border-ink-200/70 p-5 dark:border-ink-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">What business owners could say</h2>
            <p className="mt-4 text-ink-500 dark:text-ink-400">
              Illustrative examples of the kind of impact BusinessOS is designed to have.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card relative p-6">
                <span className="badge absolute right-4 top-4 bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                  Demo testimonial
                </span>
                <p className="pr-20 text-sm leading-relaxed text-ink-600 dark:text-ink-300">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-ink-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white py-20 dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">Frequently asked questions</h2>
          </div>
          <div className="mt-10">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-ink-200 bg-gradient-to-br from-brand-50 to-white p-10 dark:border-ink-800 dark:from-brand-950/40 dark:to-ink-900 sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
              Ready to bring your operations into one place?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-600 dark:text-ink-300">
              Create your free BusinessOS account and start managing inventory, sales, and more today.
            </p>
            <div className="mt-8">
              <Link to="/register" className="btn-primary px-6 py-3 text-base">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
