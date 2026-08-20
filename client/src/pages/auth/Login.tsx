import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api";

interface FormValues {
  email: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/app/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Unable to log in. Please check your credentials."));
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your business operations."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Start free
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{serverError}</div>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register("email", { required: "Email is required" })} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" className="input" {...register("password", { required: "Password is required" })} />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <div className="mt-6 rounded-lg border border-dashed border-ink-300 p-3 text-xs text-ink-500 dark:border-ink-700 dark:text-ink-400">
        Demo login: <span className="font-mono">owner@freshmart.demo</span> / <span className="font-mono">Password123</span>
      </div>
    </AuthShell>
  );
}
