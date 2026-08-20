import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  Receipt,
  UserCog,
  BarChart3,
  History,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { canAccessModule, Module } from "../../lib/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: Module;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { to: "/app/pos", label: "POS / Sales", icon: ShoppingCart, module: "pos" },
  { to: "/app/products", label: "Products", icon: Package, module: "products" },
  { to: "/app/inventory", label: "Inventory", icon: Boxes, module: "inventory" },
  { to: "/app/purchases", label: "Purchases", icon: Truck, module: "purchases" },
  { to: "/app/customers", label: "Customers", icon: Users, module: "customers" },
  { to: "/app/suppliers", label: "Suppliers", icon: Building2, module: "suppliers" },
  { to: "/app/expenses", label: "Expenses", icon: Receipt, module: "expenses" },
  { to: "/app/employees", label: "Employees", icon: UserCog, module: "employees" },
  { to: "/app/reports", label: "Reports", icon: BarChart3, module: "reports" },
  { to: "/app/activity", label: "Activity", icon: History, module: "activity" },
  { to: "/app/settings", label: "Settings", icon: Settings, module: "settings" },
];

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { role } = useAuth();
  const items = NAV_ITEMS.filter((item) => canAccessModule(role, item.module));

  const content = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      <div className="mb-4 flex items-center justify-between px-2">
        <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-white">
          Business<span className="text-brand-600">OS</span>
        </span>
        <button className="rounded-md p-1 text-ink-500 hover:bg-ink-100 lg:hidden dark:hover:bg-ink-800" onClick={onCloseMobile} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:block dark:border-ink-800 dark:bg-ink-900">
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-ink-900">{content}</aside>
        </div>
      )}
    </>
  );
}
