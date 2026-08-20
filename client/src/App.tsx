import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./components/layout/PublicLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoadingState } from "./components/ui/States";

const Home = lazy(() => import("./pages/marketing/Home"));
const Features = lazy(() => import("./pages/marketing/Features"));
const Pricing = lazy(() => import("./pages/marketing/Pricing"));
const About = lazy(() => import("./pages/marketing/About"));
const Contact = lazy(() => import("./pages/marketing/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));

const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const ProductsPage = lazy(() => import("./pages/app/products/ProductsPage"));
const InventoryPage = lazy(() => import("./pages/app/inventory/InventoryPage"));
const PosPage = lazy(() => import("./pages/app/pos/PosPage"));
const SalesHistoryPage = lazy(() => import("./pages/app/pos/SalesHistoryPage"));
const CustomersPage = lazy(() => import("./pages/app/customers/CustomersPage"));
const SuppliersPage = lazy(() => import("./pages/app/suppliers/SuppliersPage"));
const PurchasesPage = lazy(() => import("./pages/app/purchases/PurchasesPage"));
const ExpensesPage = lazy(() => import("./pages/app/expenses/ExpensesPage"));
const EmployeesPage = lazy(() => import("./pages/app/employees/EmployeesPage"));
const ReportsPage = lazy(() => import("./pages/app/reports/ReportsPage"));
const ActivityPage = lazy(() => import("./pages/app/activity/ActivityPage"));
const SettingsPage = lazy(() => import("./pages/app/settings/SettingsPage"));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingState />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/app" element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="pos/sales" element={<SalesHistoryPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
