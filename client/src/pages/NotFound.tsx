import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-4 text-center dark:bg-ink-950">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Page not found</h1>
      <p className="max-w-sm text-ink-500 dark:text-ink-400">The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn-primary mt-2">
        Back to home
      </Link>
    </div>
  );
}
