import { Link } from "react-router-dom";
import { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <Link to="/" className="mb-10 text-lg font-bold tracking-tight text-ink-900 dark:text-white">
          Business<span className="text-brand-600">OS</span>
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">{footer}</p>
        </div>
      </div>
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-12 lg:flex">
        <div className="max-w-md text-white">
          <p className="text-2xl font-semibold leading-snug">
            "Everything your small business needs to run smarter — in one place."
          </p>
          <p className="mt-6 text-sm text-brand-200">Inventory, sales, customers, and reports, unified.</p>
        </div>
      </div>
    </div>
  );
}
