import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { api, getApiErrorMessage } from "../../lib/api";

interface FormValues {
  password: string;
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await api.post("/auth/reset-password", { token, password: values.password });
      navigate("/login", { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "This reset link is invalid or has expired."));
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This password reset link is missing or malformed." footer={<Link to="/forgot-password" className="text-brand-600 hover:underline">Request a new link</Link>}>
        <p className="text-sm text-ink-500">Please request a new password reset link.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your account."
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{serverError}</div>}
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            className="input"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              validate: {
                upper: (v) => /[A-Z]/.test(v) || "Include an uppercase letter",
                number: (v) => /[0-9]/.test(v) || "Include a number",
              },
            })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
