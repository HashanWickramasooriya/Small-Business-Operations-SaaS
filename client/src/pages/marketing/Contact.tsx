import { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Clock, CheckCircle2 } from "lucide-react";

interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [submitted, setSubmitted] = useState<ContactFormValues | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>();

  async function onSubmit(values: ContactFormValues) {
    // Demo form only — there is no email backend wired up yet.
    // We simulate the brief pause of a submission before showing confirmation.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitted(values);
    reset();
  }

  return (
    <div>
      <section className="border-b border-ink-200 py-16 dark:border-ink-800 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">Contact</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            We'd love to hear from you.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Questions about BusinessOS, plans, or how it could fit your business? Send us a message.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:px-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Get in touch</h2>
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-white">Email us</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">hello@businessos.app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-white">Response time</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">We typically respond within 1 business day.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {submitted ? (
              <div className="card p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">Message received</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                  Thanks, {submitted.name.split(" ")[0]}. This is a demo form, so nothing was actually sent — in a
                  live deployment, our team would follow up at {submitted.email} within 1 business day.
                </p>
                <button type="button" className="btn-secondary mt-6" onClick={() => setSubmitted(null)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="name">Name</label>
                    <input
                      id="name"
                      type="text"
                      className="input"
                      autoComplete="name"
                      {...register("name", { required: "Please enter your name" })}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="input"
                      autoComplete="email"
                      {...register("email", {
                        required: "Please enter your email",
                        pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
                      })}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="subject">Subject</label>
                  <input
                    id="subject"
                    type="text"
                    className="input"
                    {...register("subject", { required: "Please add a subject" })}
                  />
                  {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    rows={5}
                    className="input resize-none"
                    {...register("message", {
                      required: "Please add a message",
                      minLength: { value: 10, message: "Message should be at least 10 characters" },
                    })}
                  />
                  {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
                  {isSubmitting ? "Sending…" : "Send message"}
                </button>
                <p className="text-xs text-ink-400">
                  This is a demo form — no message is actually sent, since there's no email backend wired up yet.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
