import { Link } from "react-router-dom";
import { Building2, ShieldCheck, Database, Feather, ArrowRight } from "lucide-react";

const VALUES = [
  {
    icon: Building2,
    title: "Built for small business reality",
    description:
      "We design around how small businesses actually operate day to day — tight teams, hands-on owners, and no time for tools that need a manual.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description:
      "Every workspace is isolated and access-controlled from the start, so your business data stays yours and only reachable by the people you invite.",
  },
  {
    icon: Database,
    title: "Data you control",
    description:
      "Your records aren't locked in. Reports and core data can be exported whenever you need them, on your terms.",
  },
  {
    icon: Feather,
    title: "Simplicity over bloat",
    description:
      "We'd rather ship the features you'll actually use well than pile on complexity you'll never touch.",
  },
];

export default function About() {
  return (
    <div>
      <section className="border-b border-ink-200 py-16 dark:border-ink-800 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">About BusinessOS</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            Operations software that respects your time.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Our mission is simple: help small businesses run their operations from one connected system instead
            of a patchwork of spreadsheets, notebooks, and disconnected apps.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Why we built this</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              Most small businesses don't fail because of bad products or bad service — they fail because the
              operational side quietly gets out of hand. Stock runs out unnoticed. Expenses go untracked. Sales
              data lives in someone's head instead of on a screen.
            </p>
            <p>
              The tools built to fix this were usually built for enterprises: expensive, complex, and full of
              features a five-person team will never open. So businesses default to spreadsheets, which work
              until they don't — until two people edit the same file, or a formula breaks, or nobody remembers
              which version is current.
            </p>
            <p>
              BusinessOS exists to close that gap. One system for inventory, sales, customers, suppliers,
              expenses, and reporting — sized and priced for businesses that are actually running day to day,
              not managing a portfolio of them.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white py-16 dark:border-ink-800 dark:bg-ink-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">What guides how we build</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="card flex gap-4 p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                  <v.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-ink-200 bg-gradient-to-br from-brand-50 to-white p-10 dark:border-ink-800 dark:from-brand-950/40 dark:to-ink-900 sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
              Run your business on one system.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-600 dark:text-ink-300">
              Create your free BusinessOS account and see what it feels like to have everything in one place.
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
