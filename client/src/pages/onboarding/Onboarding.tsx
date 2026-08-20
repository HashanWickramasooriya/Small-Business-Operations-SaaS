import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Store, Package, Users as UsersIcon, PartyPopper } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api, getApiErrorMessage, setActiveBusinessId } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { Role } from "../../types";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "LKR", "INR", "NGN", "ZAR"];
const BUSINESS_TYPES = ["Retail Store", "Mini Supermarket", "Grocery Store", "Clothing Store", "Electronics Store", "Pharmacy", "Café", "Wholesaler", "Other"];

const STEPS = [
  { key: "business", label: "Business", icon: Store },
  { key: "product", label: "First product", icon: Package },
  { key: "team", label: "Invite team", icon: UsersIcon },
  { key: "done", label: "Done", icon: PartyPopper },
] as const;

export default function Onboarding() {
  const { refreshSession } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [biz, setBiz] = useState({ name: "", businessType: BUSINESS_TYPES[0], currency: "USD", country: "", phone: "", email: "" });
  const [product, setProduct] = useState({ name: "", sku: "", sellingPrice: "", stock: "" });
  const [invite, setInvite] = useState({ email: "", fullName: "", role: "STAFF" as Role });

  async function handleCreateBusiness() {
    if (!biz.name.trim()) return push("error", "Business name is required");
    setSubmitting(true);
    try {
      const { data } = await api.post("/businesses", biz);
      setBusinessId(data.business.id);
      setActiveBusinessId(data.business.id);
      await api.patch(`/businesses/${data.business.id}/onboarding`, { step: 1 });
      await refreshSession();
      setStepIndex(1);
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddProduct(skip: boolean) {
    if (!businessId) return;
    setSubmitting(true);
    try {
      if (!skip && product.name && product.sku) {
        await api.post(`/businesses/${businessId}/products`, {
          name: product.name,
          sku: product.sku,
          purchasePrice: 0,
          sellingPrice: Number(product.sellingPrice || 0),
          stock: Number(product.stock || 0),
          minStock: 5,
          unit: "pcs",
        });
      }
      await api.patch(`/businesses/${businessId}/onboarding`, { step: 2 });
      setStepIndex(2);
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvite(skip: boolean) {
    if (!businessId) return;
    setSubmitting(true);
    try {
      if (!skip && invite.email && invite.fullName) {
        await api.post(`/businesses/${businessId}/members`, invite);
      }
      await api.patch(`/businesses/${businessId}/onboarding`, { step: 3, complete: true });
      await refreshSession();
      setStepIndex(3);
    } catch (err) {
      push("error", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10 dark:bg-ink-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  i < stepIndex
                    ? "border-brand-600 bg-brand-600 text-white"
                    : i === stepIndex
                    ? "border-brand-600 text-brand-600"
                    : "border-ink-300 text-ink-400 dark:border-ink-700"
                }`}
              >
                {i < stepIndex ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 sm:w-16 ${i < stepIndex ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-800"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {stepIndex === 0 && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-ink-900 dark:text-white">Tell us about your business</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400">This helps us tailor BusinessOS to how you operate.</p>
              <div>
                <label className="label">Business name</label>
                <input className="input" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} placeholder="e.g. FreshMart" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Business type</label>
                  <select className="input" value={biz.businessType} onChange={(e) => setBiz({ ...biz, businessType: e.target.value })}>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Country</label>
                  <input className="input" value={biz.country} onChange={(e) => setBiz({ ...biz, country: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Business email (optional)</label>
                <input className="input" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
              </div>
              <button className="btn-primary w-full" disabled={submitting} onClick={handleCreateBusiness}>
                {submitting ? "Creating…" : "Continue"}
              </button>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-ink-900 dark:text-white">Add your first product</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400">You can add the rest later — this just gets you started.</p>
              <div>
                <label className="label">Product name</label>
                <input className="input" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="e.g. Premium Rice (5kg)" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">SKU</label>
                  <input className="input" value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} placeholder="SKU-001" />
                </div>
                <div>
                  <label className="label">Selling price</label>
                  <input type="number" className="input" value={product.sellingPrice} onChange={(e) => setProduct({ ...product, sellingPrice: e.target.value })} />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" className="input" value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" disabled={submitting} onClick={() => handleAddProduct(true)}>
                  Skip for now
                </button>
                <button className="btn-primary flex-1" disabled={submitting} onClick={() => handleAddProduct(false)}>
                  {submitting ? "Saving…" : "Continue"}
                </button>
              </div>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-ink-900 dark:text-white">Invite your team</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400">Give employees the right access from day one.</p>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" disabled={submitting} onClick={() => handleInvite(true)}>
                  Skip for now
                </button>
                <button className="btn-primary flex-1" disabled={submitting} onClick={() => handleInvite(false)}>
                  {submitting ? "Saving…" : "Finish setup"}
                </button>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-5 text-center">
              <PartyPopper className="mx-auto h-10 w-10 text-brand-600" />
              <h1 className="text-xl font-bold text-ink-900 dark:text-white">You're all set!</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400">Your workspace is ready. Let's go to your dashboard.</p>
              <button className="btn-primary w-full" onClick={() => navigate("/app/dashboard", { replace: true })}>
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
