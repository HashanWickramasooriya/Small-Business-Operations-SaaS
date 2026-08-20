import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, Trash2, User, X, Printer, ShoppingCart, History, Barcode } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { api, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { useToast } from "../../../components/Toast";
import { Modal } from "../../../components/ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "../../../components/ui/States";
import { Product, PaymentMethod, Customer, Sale } from "../../../types";

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  stock: number;
  quantity: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

export default function PosPage() {
  const { activeBusinessId, activeMembership, role } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const currency = activeMembership?.business.currency ?? "USD";
  const canWrite = role === "OWNER" || role === "MANAGER" || role === "CASHIER";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [amountPaidTouched, setAmountPaidTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: productData, isLoading, isError, refetch } = useQuery({
    queryKey: ["pos-products", activeBusinessId, debouncedSearch],
    queryFn: async () =>
      (
        await api.get(`/businesses/${activeBusinessId}/products`, {
          params: { search: debouncedSearch || undefined, status: "ACTIVE", page: 1, pageSize: 60 },
        })
      ).data,
    enabled: !!activeBusinessId,
  });

  const products: Product[] = productData?.items ?? [];

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) set.set(p.category.id, p.category.name);
    });
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!category) return products;
    return products.filter((p) => p.categoryId === category);
  }, [products, category]);

  const { data: customerData } = useQuery({
    queryKey: ["pos-customers", activeBusinessId, customerQuery],
    queryFn: async () =>
      (
        await api.get(`/businesses/${activeBusinessId}/customers`, {
          params: { search: customerQuery || undefined, page: 1, pageSize: 8 },
        })
      ).data,
    enabled: !!activeBusinessId && customerDropdownOpen,
  });
  const customerResults: Customer[] = customerData?.items ?? [];

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          push("error", `Only ${product.stock} in stock for ${product.name}`);
          return prev;
        }
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, sku: product.sku, unitPrice: product.sellingPrice, taxRate: product.taxRate, stock: product.stock, quantity: 1 },
      ];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = l.quantity + delta;
          if (next <= 0) return null;
          if (next > l.stock) {
            push("error", `Only ${l.stock} in stock for ${l.name}`);
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l): l is CartLine => l !== null)
    );
  }

  function setQty(productId: string, value: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        if (value < 1) return { ...l, quantity: 1 };
        if (value > l.stock) {
          push("error", `Only ${l.stock} in stock for ${l.name}`);
          return { ...l, quantity: l.stock };
        }
        return { ...l, quantity: value };
      })
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleBarcodeEnter() {
    const code = barcodeInput.trim();
    if (!code || !activeBusinessId) return;
    try {
      const { data } = await api.get(`/businesses/${activeBusinessId}/products`, {
        params: { search: code, status: "ACTIVE", page: 1, pageSize: 5 },
      });
      const items: Product[] = data.items ?? [];
      const exact = items.find((p) => p.sku.toLowerCase() === code.toLowerCase() || p.barcode?.toLowerCase() === code.toLowerCase());
      const match = exact ?? (items.length === 1 ? items[0] : null);
      if (match) {
        addToCart(match);
        setBarcodeInput("");
      } else {
        push("error", `No product found for "${code}"`);
      }
    } catch (err) {
      push("error", getApiErrorMessage(err));
    }
  }

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const tax = cart.reduce((sum, l) => sum + (l.unitPrice * l.quantity * l.taxRate) / 100, 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal + tax - discountNum);

  useEffect(() => {
    if (!amountPaidTouched) setAmountPaid(total.toFixed(2));
  }, [total, amountPaidTouched]);

  const amountPaidNum = Number(amountPaid) || 0;
  const change = paymentMethod === "CASH" ? Math.max(0, amountPaidNum - total) : 0;

  function resetSaleForm() {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerQuery("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setAmountPaid("");
    setAmountPaidTouched(false);
  }

  async function completeSale() {
    if (!canWrite) return;
    if (cart.length === 0) {
      push("error", "Add at least one item to the cart");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/businesses/${activeBusinessId}/sales`, {
        customerId: selectedCustomer?.id ?? undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: 0 })),
        discount: discountNum,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? amountPaidNum : undefined,
      });
      push("success", `Sale ${data.sale.reference} completed`);
      setReceiptSale(data.sale);
      resetSaleForm();
      refetch();
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Point of Sale</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Ring up sales fast — search or scan to add items.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate("/app/pos/sales")}>
          <History className="h-4 w-4" />
          Sales history
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* LEFT: product picker */}
        <div className="space-y-3 lg:col-span-2">
          <div className="card space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  className="input pl-9"
                  placeholder="Search products by name or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="relative sm:w-56">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  ref={barcodeRef}
                  className="input pl-9"
                  placeholder="Scan barcode / SKU + Enter"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeEnter();
                    }
                  }}
                />
              </div>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategory(null)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    category === null ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      category === c.id ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            {isLoading && <LoadingState label="Loading products…" />}
            {isError && <ErrorState message="Couldn't load products." onRetry={() => refetch()} />}
            {!isLoading && !isError && visibleProducts.length === 0 && (
              <EmptyState title="No products found" description="Try a different search term or category." />
            )}
            {!isLoading && !isError && visibleProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((p) => {
                  const outOfStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      disabled={outOfStock}
                      onClick={() => addToCart(p)}
                      className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                        outOfStock
                          ? "cursor-not-allowed border-ink-100 bg-ink-50 opacity-50 dark:border-ink-800 dark:bg-ink-900/50"
                          : "border-ink-200 bg-white hover:border-brand-400 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-600"
                      }`}
                    >
                      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-ink-400">{p.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <p className="line-clamp-2 w-full text-sm font-medium text-ink-900 dark:text-ink-50">{p.name}</p>
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(p.sellingPrice, currency)}</span>
                        <span className={`text-xs ${outOfStock ? "text-red-500" : "text-ink-400"}`}>{outOfStock ? "Out of stock" : `${p.stock} ${p.unit}`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: cart */}
        <div className="card flex flex-col p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Cart ({cart.length})</h2>
          </div>

          <div className="min-h-[100px] flex-1 space-y-2 overflow-y-auto pr-1">
            {cart.length === 0 && <p className="py-8 text-center text-sm text-ink-400">Cart is empty. Add products from the left.</p>}
            {cart.map((l) => (
              <div key={l.productId} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 dark:border-ink-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">{l.name}</p>
                  <p className="text-xs text-ink-400">
                    {formatCurrency(l.unitPrice, currency)} × {l.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-md border border-ink-200 p-1 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800" onClick={() => changeQty(l.productId, -1)} aria-label="Decrease quantity">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    className="w-12 rounded-md border border-ink-200 bg-transparent px-1 py-1 text-center text-sm dark:border-ink-700"
                    value={l.quantity}
                    onChange={(e) => setQty(l.productId, Number(e.target.value))}
                  />
                  <button className="rounded-md border border-ink-200 p-1 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800" onClick={() => changeQty(l.productId, 1)} aria-label="Increase quantity">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button className="p-1 text-ink-400 hover:text-red-600" onClick={() => removeLine(l.productId)} aria-label="Remove item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-3 border-t border-ink-100 pt-3 dark:border-ink-800">
            <div className="relative">
              <label className="label">Customer</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700">
                  <span className="flex items-center gap-2 text-ink-800 dark:text-ink-100">
                    <User className="h-4 w-4 text-ink-400" />
                    {selectedCustomer.name}
                  </span>
                  <button onClick={() => setSelectedCustomer(null)} aria-label="Clear customer" className="text-ink-400 hover:text-ink-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="input"
                    placeholder="Walk-in customer (search to select)"
                    value={customerQuery}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                  />
                  {customerDropdownOpen && customerQuery.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
                      {customerResults.length === 0 && <p className="px-3 py-2 text-xs text-ink-400">No customers found.</p>}
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerDropdownOpen(false);
                            setCustomerQuery("");
                          }}
                        >
                          <span className="text-ink-800 dark:text-ink-100">{c.name}</span>
                          {c.phone && <span className="ml-2 text-xs text-ink-400">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="label">Payment method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      paymentMethod === m.value
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Discount</label>
                <input type="number" min={0} className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <label className="label">Amount paid</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={amountPaid}
                  onChange={(e) => {
                    setAmountPaidTouched(true);
                    setAmountPaid(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-900/60">
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Tax</span>
                <span>{formatCurrency(tax, currency)}</span>
              </div>
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <span>Discount</span>
                <span>-{formatCurrency(discountNum, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-1 text-base font-semibold text-ink-900 dark:border-ink-700 dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
              {paymentMethod === "CASH" && (
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <span>Change</span>
                  <span>{formatCurrency(change, currency)}</span>
                </div>
              )}
            </div>

            <button className="btn-primary w-full py-3 text-base" disabled={!canWrite || submitting || cart.length === 0} onClick={completeSale}>
              {submitting ? "Processing…" : `Complete Sale — ${formatCurrency(total, currency)}`}
            </button>
            {!canWrite && <p className="text-center text-xs text-red-500">You don't have permission to complete sales.</p>}
          </div>
        </div>
      </div>

      <Modal open={!!receiptSale} onClose={() => setReceiptSale(null)} title="Sale complete" size="sm">
        {receiptSale && (
          <div className="space-y-4">
            <div id="pos-receipt" className="space-y-3 text-sm">
              <div className="text-center">
                <p className="text-base font-bold text-ink-900 dark:text-white">{activeMembership?.business.name}</p>
                <p className="text-xs text-ink-400">{receiptSale.reference}</p>
                <p className="text-xs text-ink-400">{formatDateTime(receiptSale.createdAt)}</p>
              </div>
              <div className="divide-y divide-dashed divide-ink-200 border-y border-dashed border-ink-200 py-2 dark:divide-ink-700 dark:border-ink-700">
                {receiptSale.items.map((it) => (
                  <div key={it.id} className="flex justify-between py-1.5">
                    <div>
                      <p className="text-ink-800 dark:text-ink-100">{it.product?.name ?? "Item"}</p>
                      <p className="text-xs text-ink-400">
                        {it.quantity} × {formatCurrency(it.unitPrice, currency)}
                      </p>
                    </div>
                    <span className="text-ink-800 dark:text-ink-100">{formatCurrency(it.total, currency)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receiptSale.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <span>Tax</span>
                  <span>{formatCurrency(receiptSale.tax, currency)}</span>
                </div>
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(receiptSale.discount, currency)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-ink-900 dark:text-white">
                  <span>Total</span>
                  <span>{formatCurrency(receiptSale.total, currency)}</span>
                </div>
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <span>Paid via</span>
                  <span>{receiptSale.paymentMethod.replace("_", " ")}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button className="btn-primary flex-1" onClick={() => setReceiptSale(null)}>
                New Sale
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
