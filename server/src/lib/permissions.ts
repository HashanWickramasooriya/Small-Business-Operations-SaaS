import { Role } from "@prisma/client";

// Feature modules governed by RBAC. Every protected route declares the module
// it belongs to; access is resolved against the caller's Role within the
// active business (never trusted from the client).
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
  OWNER: [
    "dashboard",
    "pos",
    "sales",
    "products",
    "inventory",
    "purchases",
    "customers",
    "suppliers",
    "expenses",
    "employees",
    "reports",
    "activity",
    "settings",
    "notifications",
  ],
  MANAGER: [
    "dashboard",
    "pos",
    "sales",
    "products",
    "inventory",
    "purchases",
    "customers",
    "suppliers",
    "reports",
    "activity",
    "notifications",
  ],
  CASHIER: ["dashboard", "pos", "sales", "customers", "notifications"],
  ACCOUNTANT: ["dashboard", "expenses", "purchases", "reports", "notifications"],
  STAFF: ["dashboard", "notifications"],
};

// Roles allowed to mutate (create/update/delete) vs read-only, per module.
// Owner and Manager can write everywhere they can read, except employee
// role-management which is Owner-only. Accountant can write expenses/purchases.
// Cashier can write sales/pos. Everyone else in the module list can read.
const WRITE_ACCESS: Record<Module, Role[]> = {
  dashboard: [],
  pos: ["OWNER", "MANAGER", "CASHIER"],
  sales: ["OWNER", "MANAGER", "CASHIER"],
  products: ["OWNER", "MANAGER"],
  inventory: ["OWNER", "MANAGER"],
  purchases: ["OWNER", "MANAGER", "ACCOUNTANT"],
  customers: ["OWNER", "MANAGER", "CASHIER"],
  suppliers: ["OWNER", "MANAGER"],
  expenses: ["OWNER", "ACCOUNTANT"],
  employees: ["OWNER"],
  reports: [],
  activity: [],
  settings: ["OWNER"],
  notifications: ["OWNER", "MANAGER", "CASHIER", "ACCOUNTANT", "STAFF"],
};

export function canAccessModule(role: Role, module: Module): boolean {
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}

export function canWriteModule(role: Role, module: Module): boolean {
  return WRITE_ACCESS[module]?.includes(role) ?? false;
}
