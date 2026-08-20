import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "./ui/States";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, activeMembership, memberships } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Loading BusinessOS…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (memberships.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  if (activeMembership && !activeMembership.business.onboardingComplete && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ allow }: { allow: string[] }) {
  const { role } = useAuth();
  if (!role || !allow.includes(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
