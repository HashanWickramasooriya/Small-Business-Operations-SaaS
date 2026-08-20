import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { api, getApiErrorMessage } from "../../lib/api";

interface FormValues {
  email: string;
}

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/forgot-password", values);
      setSent(true);
      setDevToken(data.devToken ?? null);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send you a link to reset your password."
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            If that email exists, a reset link has been sent.
          </div>
          {devToken && (
            <div className="rounded-lg border border-dashed border-ink-300 p-3 text-xs text-ink-500 dark:border-ink-700 dark:text-ink-400">
              Development mode — no email provider configured. Use this link:
              <br />
              <Link className="break-all font-mono text-brand-600" to={`/reset-password?token=${devToken}`}>
                /reset-password?token={devToken}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{serverError}</div>}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" {...register("email", { required: "Email is required" })} />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
