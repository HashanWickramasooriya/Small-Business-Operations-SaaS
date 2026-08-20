import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Modal } from "./ui/Modal";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const { activeBusinessId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", activeBusinessId, debounced],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/search`, { params: { q: debounced } })).data,
    enabled: open && !!activeBusinessId && debounced.length >= 2,
  });

  function go(path: string) {
    onClose();
    navigate(path);
  }

  const groups = data
    ? [
        { label: "Products", items: data.products.map((p: { id: string; name: string; sku: string }) => ({ id: p.id, label: p.name, sub: p.sku, path: `/app/products?highlight=${p.id}` })) },
        { label: "Customers", items: data.customers.map((c: { id: string; name: string; phone?: string }) => ({ id: c.id, label: c.name, sub: c.phone, path: `/app/customers?highlight=${c.id}` })) },
        { label: "Suppliers", items: data.suppliers.map((s: { id: string; name: string }) => ({ id: s.id, label: s.name, path: `/app/suppliers?highlight=${s.id}` })) },
        { label: "Sales", items: data.sales.map((s: { id: string; reference: string }) => ({ id: s.id, label: s.reference, path: `/app/pos/sales/${s.id}` })) },
        { label: "Employees", items: data.employees.map((e: { id: string; user: { fullName: string; email: string } }) => ({ id: e.id, label: e.user.fullName, sub: e.user.email, path: `/app/employees` })) },
      ]
    : [];

  return (
    <Modal open={open} onClose={onClose} title="Search" size="lg">
      <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 dark:border-ink-700">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, customers, suppliers, sales, employees…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      <div className="mt-3 max-h-96 overflow-y-auto">
        {debounced.length < 2 && <p className="py-8 text-center text-sm text-ink-400">Type at least 2 characters to search.</p>}
        {debounced.length >= 2 && isFetching && <p className="py-8 text-center text-sm text-ink-400">Searching…</p>}
        {debounced.length >= 2 &&
          !isFetching &&
          groups.every((g) => g.items.length === 0) && <p className="py-8 text-center text-sm text-ink-400">No results found.</p>}
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.label} className="mb-2">
                <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{group.label}</p>
                {group.items.map((item: { id: string; label: string; sub?: string; path: string }) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.path)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <span className="text-ink-800 dark:text-ink-100">{item.label}</span>
                    {item.sub && <span className="text-xs text-ink-400">{item.sub}</span>}
                  </button>
                ))}
              </div>
            )
        )}
      </div>
    </Modal>
  );
}
