import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { api, getApiErrorMessage } from "../../../lib/api";
import { useToast } from "../../../components/Toast";
import { Badge } from "../../../components/ui/Badge";
import { LoadingState, ErrorState } from "../../../components/ui/States";
import { Business } from "../../../types";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "LKR", "INR", "NGN", "ZAR"];
const BUSINESS_TYPES = ["Retail Store", "Mini Supermarket", "Grocery Store", "Clothing Store", "Electronics Store", "Pharmacy", "Café", "Wholesaler", "Other"];

const TABS = [
  { key: "profile", label: "Business Profile" },
  { key: "preferences", label: "Preferences" },
  { key: "me", label: "My Profile" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface BusinessForm {
  name: string;
  businessType: string;
  currency: string;
  country: string;
  phone: string;
  email: string;
  address: string;
  taxRate: string;
}

interface SettingsForm {
  invoicePrefix: string;
  receiptFooter: string;
  numberFormat: string;
  lowStockThreshold: string;
  notifyLowStock: boolean;
  notifyLargeExpense: boolean;
  largeExpenseThreshold: string;
}

const PLAN_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  FREE: "neutral",
  STARTER: "info",
  PROFESSIONAL: "success",
  ENTERPRISE: "warning",
};

export default function SettingsPage() {
  const { activeBusinessId, role, user, refreshSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const canEdit = role === "OWNER";
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "profile";

  function setTab(tab: TabKey) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  const businessQuery = useQuery({
    queryKey: ["business", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}`)).data as { business: Business & { plan: string }; role: string },
    enabled: !!activeBusinessId,
  });

  const settingsQuery = useQuery({
    queryKey: ["business-settings", activeBusinessId],
    queryFn: async () =>
      (await api.get(`/businesses/${activeBusinessId}/settings`)).data.settings as {
        invoicePrefix: string;
        receiptFooter: string;
        numberFormat: string;
        lowStockThreshold: number;
        notifyLowStock: boolean;
        notifyLargeExpense: boolean;
        largeExpenseThreshold: number;
      },
    enabled: !!activeBusinessId,
  });

  const [bizForm, setBizForm] = useState<BusinessForm | null>(null);
  const [savingBiz, setSavingBiz] = useState(false);

  const [prefForm, setPrefForm] = useState<SettingsForm | null>(null);
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    if (businessQuery.data) {
      const b = businessQuery.data.business;
      setBizForm({
        name: b.name ?? "",
        businessType: b.businessType ?? BUSINESS_TYPES[0],
        currency: b.currency ?? "USD",
        country: b.country ?? "",
        phone: b.phone ?? "",
        email: b.email ?? "",
        address: b.address ?? "",
        taxRate: String(b.taxRate ?? 0),
      });
    }
  }, [businessQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data;
      setPrefForm({
        invoicePrefix: s.invoicePrefix ?? "",
        receiptFooter: s.receiptFooter ?? "",
        numberFormat: s.numberFormat ?? "",
        lowStockThreshold: String(s.lowStockThreshold ?? 0),
        notifyLowStock: !!s.notifyLowStock,
        notifyLargeExpense: !!s.notifyLargeExpense,
        largeExpenseThreshold: String(s.largeExpenseThreshold ?? 0),
      });
    }
  }, [settingsQuery.data]);

  async function handleSaveBusiness() {
    if (!bizForm) return;
    if (!bizForm.name.trim()) {
      push("error", "Business name is required");
      return;
    }
    setSavingBiz(true);
    try {
      await api.patch(`/businesses/${activeBusinessId}`, {
        name: bizForm.name.trim(),
        businessType: bizForm.businessType,
        currency: bizForm.currency,
        country: bizForm.country.trim() || null,
        phone: bizForm.phone.trim() || null,
        email: bizForm.email.trim() || null,
        address: bizForm.address.trim() || null,
        taxRate: Number(bizForm.taxRate || 0),
      });
      push("success", "Business profile updated");
      queryClient.invalidateQueries({ queryKey: ["business", activeBusinessId] });
      await refreshSession();
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSavingBiz(false);
    }
  }

  async function handleSavePreferences() {
    if (!prefForm) return;
    setSavingPref(true);
    try {
      await api.patch(`/businesses/${activeBusinessId}/settings`, {
        invoicePrefix: prefForm.invoicePrefix.trim(),
        receiptFooter: prefForm.receiptFooter,
        numberFormat: prefForm.numberFormat.trim(),
        lowStockThreshold: Number(prefForm.lowStockThreshold || 0),
        notifyLowStock: prefForm.notifyLowStock,
        notifyLargeExpense: prefForm.notifyLargeExpense,
        largeExpenseThreshold: Number(prefForm.largeExpenseThreshold || 0),
      });
      push("success", "Preferences updated");
      queryClient.invalidateQueries({ queryKey: ["business-settings", activeBusinessId] });
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSavingPref(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Manage your business profile, preferences and account.</p>
      </div>

      <div className="border-b border-ink-200 dark:border-ink-800">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === t.key ? "text-brand-600 dark:text-brand-400" : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100"
              }`}
            >
              {t.label}
              {activeTab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && (
        <>
          {businessQuery.isLoading || !bizForm ? (
            <LoadingState />
          ) : businessQuery.isError ? (
            <ErrorState message={getApiErrorMessage(businessQuery.error)} onRetry={() => businessQuery.refetch()} />
          ) : (
            <div className="card space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Plan</p>
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                    Billing isn't wired to a payment provider in this demo — this reflects your current plan tier only.
                  </p>
                </div>
                <Badge tone={PLAN_TONE[businessQuery.data?.business.plan ?? "FREE"] ?? "neutral"}>{businessQuery.data?.business.plan}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.name}
                    onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Business type</label>
                  <select
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.businessType}
                    onChange={(e) => setBizForm({ ...bizForm, businessType: e.target.value })}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.currency}
                    onChange={(e) => setBizForm({ ...bizForm, currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Country</label>
                  <input
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.country}
                    onChange={(e) => setBizForm({ ...bizForm, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.phone}
                    onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Business email</label>
                  <input
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.email}
                    onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Tax rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={bizForm.taxRate}
                    onChange={(e) => setBizForm({ ...bizForm, taxRate: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Address</label>
                  <textarea
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    rows={2}
                    disabled={!canEdit}
                    value={bizForm.address}
                    onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                  />
                </div>
              </div>

              {canEdit ? (
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={handleSaveBusiness} disabled={savingBiz}>
                    {savingBiz ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-ink-500 dark:text-ink-400">Only the business owner can edit these fields.</p>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "preferences" && (
        <>
          {settingsQuery.isLoading || !prefForm ? (
            <LoadingState />
          ) : settingsQuery.isError ? (
            <ErrorState message={getApiErrorMessage(settingsQuery.error)} onRetry={() => settingsQuery.refetch()} />
          ) : (
            <div className="card space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Invoice prefix</label>
                  <input
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={prefForm.invoicePrefix}
                    onChange={(e) => setPrefForm({ ...prefForm, invoicePrefix: e.target.value })}
                    placeholder="INV-"
                  />
                </div>
                <div>
                  <label className="label">Low stock threshold</label>
                  <input
                    type="number"
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEdit}
                    value={prefForm.lowStockThreshold}
                    onChange={(e) => setPrefForm({ ...prefForm, lowStockThreshold: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Receipt footer</label>
                  <textarea
                    className="input disabled:cursor-not-allowed disabled:opacity-60"
                    rows={2}
                    disabled={!canEdit}
                    value={prefForm.receiptFooter}
                    onChange={(e) => setPrefForm({ ...prefForm, receiptFooter: e.target.value })}
                    placeholder="Thank you for your business!"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-ink-100 pt-5 dark:border-ink-800">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">Low stock notifications</span>
                    <span className="block text-xs text-ink-500 dark:text-ink-400">Notify when a product falls below its stock threshold.</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-700"
                    disabled={!canEdit}
                    checked={prefForm.notifyLowStock}
                    onChange={(e) => setPrefForm({ ...prefForm, notifyLowStock: e.target.checked })}
                  />
                </label>

                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">Large expense notifications</span>
                    <span className="block text-xs text-ink-500 dark:text-ink-400">Notify when an expense exceeds the threshold below.</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-700"
                    disabled={!canEdit}
                    checked={prefForm.notifyLargeExpense}
                    onChange={(e) => setPrefForm({ ...prefForm, notifyLargeExpense: e.target.checked })}
                  />
                </label>

                {prefForm.notifyLargeExpense && (
                  <div className="sm:w-1/2">
                    <label className="label">Large expense threshold</label>
                    <input
                      type="number"
                      className="input disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canEdit}
                      value={prefForm.largeExpenseThreshold}
                      onChange={(e) => setPrefForm({ ...prefForm, largeExpenseThreshold: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {canEdit ? (
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={handleSavePreferences} disabled={savingPref}>
                    {savingPref ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-ink-500 dark:text-ink-400">Only the business owner can edit preferences.</p>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "me" && (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">My account</h2>
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  {user?.fullName?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <p className="font-medium text-ink-900 dark:text-white">{user?.fullName}</p>
                <p className="text-sm text-ink-500 dark:text-ink-400">{user?.email}</p>
              </div>
            </div>
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-900/60 dark:text-ink-400">
              Profile editing (name, email, password) is coming soon — there's no way to change these yet.
            </p>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Appearance</h2>
            <div className="grid grid-cols-3 gap-3 sm:w-96">
              {[
                { key: "light" as const, label: "Light", icon: Sun },
                { key: "dark" as const, label: "Dark", icon: Moon },
                { key: "system" as const, label: "System", icon: Monitor },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTheme(opt.key)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-4 text-sm transition-colors ${
                    theme === opt.key
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300"
                      : "border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-800 dark:text-ink-300 dark:hover:border-ink-700"
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
