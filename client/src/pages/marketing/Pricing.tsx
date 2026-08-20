import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    tagline: "For small businesses getting started",
    price: "$0",
    period: "forever",
    cta: "Start Free",
    to: "/register",
    highlight: false,
    features: [
      "1 user",
      "1 business location",
      "Up to 100 products",
      "Sales & inventory basics",
      "Community support",
    ],
  },
  {
    name: "Starter",
    tagline: "For growing businesses",
    price: "$19",
    period: "/month",
    cta: "Start Free",
    to: "/register",
    highlight: false,
    features: [
      "Up to 5 users",
      "2 business locations",
      "Up to 1,000 products",
      "Customer & supplier management",
      "Basic analytics & reports",
      "Email support",
    ],
  },
  {
    name: "Professional",
    tagline: "For established businesses",
    price: "$49",
    period: "/month",
    cta: "Start Free",
    to: "/register",
    highlight: true,
    features: [
      "Up to 20 users",
      "Unlimited locations",
      "Unlimited products",
      "Advanced analytics & dashboards",
      "Employee roles & permissions",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For larger teams",
    price: "Custom",
    period: "",
    cta: "Contact Sales",
    to: "/contact",
    highlight: false,
    features: [
      "Unlimited users",
      "Unlimited locations",
      "Dedicated onboarding",
      "Custom reporting & exports",
      "Advanced access controls",
      "Dedicated account support",
    ],
  },
];

const FAQS = [
  {
    q: "Can I change plans later?",
    a: "Yes. You can move between plans as your business grows — there's no lock-in or long-term commitment.",
  },
  {
    q: "Is billing set up for real payments?",
    a: "BusinessOS is subscription-ready, so upgrading is designed to be simple whenever billing goes live. Start free, upgrade anytime.",
  },
  {
    q: "What happens if I outgrow the Free plan?",
    a: "You'll get a friendly heads-up when you're approaching a plan limit, with a clear path to upgrade without disrupting your data.",
  },
];

export default function Pricing() {
  return (
    <div>
      <section className="border-b border-ink-200 py-16 dark:border-ink-800 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">Pricing</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            Simple pricing that grows with you.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Start for free. Upgrade when your business needs more users, locations, or advanced insights.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border p-6 ${
                  plan.highlight
                    ? "border-brand-600 bg-white shadow-card ring-1 ring-brand-600 dark:bg-ink-900"
                    : "border-ink-200/70 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900"
                }`}
              >
                {plan.highlight && (
                  <span className="badge absolute -top-3 left-6 bg-brand-600 text-white">Most popular</span>
                )}
                <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{plan.name}</h2>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-ink-400">{plan.period}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.to}
                  className={`mt-8 ${plan.highlight ? "btn-primary" : "btn-secondary"} w-full`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white py-16 dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            Pricing questions
          </h2>
          <div className="mt-10 space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-ink-200 pb-6 dark:border-ink-800 last:border-b-0 last:pb-0">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
