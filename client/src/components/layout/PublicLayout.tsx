import { Outlet, Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function Logo() {
  return (
    <Link to="/" className="text-lg font-bold tracking-tight text-ink-900 dark:text-white">
      Business<span className="text-brand-600">OS</span>
    </Link>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? "text-brand-600" : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <button
            className="rounded-md p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
            onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "light" && <Sun className="h-5 w-5" />}
            {theme === "dark" && <Moon className="h-5 w-5" />}
            {theme === "system" && <Monitor className="h-5 w-5" />}
          </button>
          <Link to="/login" className="btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn-primary">
            Start Free
          </Link>
        </div>
        <button className="p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-white p-6 dark:bg-ink-950 md:hidden">
          <div className="mb-8 flex items-center justify-between">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-4">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className="text-lg font-medium text-ink-800 dark:text-ink-100">
                {item.label}
              </NavLink>
            ))}
            <hr className="my-2 border-ink-200 dark:border-ink-800" />
            <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full">
              Log in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-full">
              Start Free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-500 dark:text-ink-400">
              Run your business. Control your operations. Grow with confidence.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-white">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><Link to="/features" className="hover:text-ink-900 dark:hover:text-white">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-ink-900 dark:hover:text-white">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-white">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><Link to="/about" className="hover:text-ink-900 dark:hover:text-white">About</Link></li>
              <li><Link to="/contact" className="hover:text-ink-900 dark:hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-white">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><Link to="/login" className="hover:text-ink-900 dark:hover:text-white">Log in</Link></li>
              <li><Link to="/register" className="hover:text-ink-900 dark:hover:text-white">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 text-xs text-ink-400 dark:border-ink-800 sm:flex-row">
          <p>© {new Date().getFullYear()} BusinessOS. All rights reserved.</p>
          <p>Built for small businesses everywhere.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
