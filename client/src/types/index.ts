export type Role = "OWNER" | "MANAGER" | "CASHIER" | "ACCOUNTANT" | "STAFF";
export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type ProductStatus = "ACTIVE" | "ARCHIVED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "VOID";
export type PurchaseStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  onboardingComplete: boolean;
}

export interface Membership {
  businessId: string;
  role: Role;
  status: MembershipStatus;
  business: BusinessSummary;
}

export interface Business extends BusinessSummary {
  businessType: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxRate: number;
  onboardingStep: number;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  category?: Category | null;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl: string | null;
  status: ProductStatus;
  supplierId: string | null;
  supplier?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  outstandingBalance: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  outstandingAmount: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: string;
  reference: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerId: string | null;
  customer?: { id: string; name: string } | null;
  items: SaleItem[];
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  quantityReceived: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  reference: string;
  status: PurchaseStatus;
  totalCost: number;
  notes: string | null;
  supplierId: string;
  supplier?: { id: string; name: string };
  items: PurchaseItem[];
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number;
  vendor: string | null;
  description: string | null;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  date: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku: string; unit: string };
  type: "PURCHASE" | "SALE" | "RETURN" | "ADJUSTMENT" | "INITIAL";
  quantity: number;
  note: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
