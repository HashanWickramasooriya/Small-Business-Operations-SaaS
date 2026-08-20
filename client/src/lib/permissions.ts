import { Role } from "../types";

// Mirrors server/src/lib/permissions.ts. This only controls what the UI shows —
// the API independently re-checks every request, so this list drifting out of
// sync would only affect UX, never security.
export type Module =
  | "dashboard"
  | "pos"
  | "sales"
  | "products"
  | "inventory"
  | "purchases"
  | "customers"
  | "suppliers"
  | "expenses"
  | "employees"
  | "reports"
  | "activity"
  | "settings"
  | "notifications";

const MODULE_ACCESS: Record<Role, Module[]> = {
  OWNER: ["dashboard", "pos", "sales", "products", "inventory", "purchases", "customers", "suppliers", "expenses", "employees", "reports", "activity", "settings", "notifications"],
  MANAGER: ["dashboard", "pos", "sales", "products", "inventory", "purchases", "customers", "suppliers", "reports", "activity", "notifications"],
  CASHIER: ["dashboard", "pos", "sales", "customers", "notifications"],
  ACCOUNTANT: ["dashboard", "expenses", "purchases", "reports", "notifications"],
  STAFF: ["dashboard", "notifications"],
};

export function canAccessModule(role: Role | null, module: Module): boolean {
  if (!role) return false;
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}
