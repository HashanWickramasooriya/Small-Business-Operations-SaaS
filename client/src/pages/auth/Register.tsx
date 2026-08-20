import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthShell } from "./AuthShell";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api";

interface FormValues {
  fullName: string;
  email: string;
  password: string;
}

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const password = watch("password", "");

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await registerUser(values.fullName, values.email, values.password);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Unable to create your account."));
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start managing your business operations in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{serverError}</div>}
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" className="input" {...register("fullName", { required: "Full name is required", minLength: { value: 2, message: "Too short" } })} />
          {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register("email", { required: "Email is required" })} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
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
          <p className="mt-1 text-xs text-ink-400">
            {password.length >= 8 ? "✓" : "•"} 8+ characters, {/[A-Z]/.test(password) ? "✓" : "•"} uppercase, {/[0-9]/.test(password) ? "✓" : "•"} number
          </p>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs text-ink-400">By continuing, you agree to our Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}
