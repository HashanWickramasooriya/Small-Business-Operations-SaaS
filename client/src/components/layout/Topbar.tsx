import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, Bell, Sun, Moon, Monitor, ChevronDown, LogOut, UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import { GlobalSearch } from "../GlobalSearch";
import { formatDateTime } from "../../lib/format";

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { user, memberships, activeBusinessId, activeMembership, switchBusiness, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bizMenuOpen, setBizMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const bizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) setBizMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const { data } = useQuery({
    queryKey: ["notifications", activeBusinessId],
    queryFn: async () => (await api.get(`/businesses/${activeBusinessId}/notifications`)).data,
    enabled: !!activeBusinessId,
    refetchInterval: 60_000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  async function markRead(id: string) {
    await api.patch(`/businesses/${activeBusinessId}/notifications/${id}/read`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/80 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
      <button className="rounded-md p-2 text-ink-500 hover:bg-ink-100 lg:hidden dark:hover:bg-ink-800" onClick={onOpenMobileMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-400 hover:border-ink-300 sm:max-w-sm dark:border-ink-700 dark:bg-ink-800/60"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search products, customers…</span>
        <kbd className="hidden rounded border border-ink-300 px-1.5 py-0.5 text-[10px] text-ink-400 sm:block dark:border-ink-600">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {memberships.length > 1 && (
          <div className="relative" ref={bizRef}>
            <button className="btn-ghost hidden text-sm sm:inline-flex" onClick={() => setBizMenuOpen((v) => !v)}>
              {activeMembership?.business.name ?? "Select business"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {bizMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-ink-200 bg-white p-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                {memberships.map((m) => (
                  <button
                    key={m.businessId}
                    onClick={() => {
                      switchBusiness(m.businessId);
                      setBizMenuOpen(false);
                      window.location.reload();
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <span>{m.business.name}</span>
                    {m.businessId === activeBusinessId && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={notifRef}>
          <button className="relative rounded-md p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={async () => {
                      await api.post(`/businesses/${activeBusinessId}/notifications/read-all`);
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {(data?.items ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">You're all caught up.</p>}
                {(data?.items ?? []).map((n: { id: string; title: string; message: string; isRead: boolean; createdAt: string }) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`block w-full border-b border-ink-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/50 ${!n.isRead ? "bg-brand-50/50 dark:bg-brand-950/30" : ""}`}
                  >
                    <p className="font-medium text-ink-800 dark:text-ink-100">{n.title}</p>
                    <p className="mt-0.5 text-ink-500 dark:text-ink-400">{n.message}</p>
                    <p className="mt-1 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="rounded-md p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
          onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
          aria-label="Toggle theme"
          title={`Theme: ${theme}`}
        >
          {theme === "light" && <Sun className="h-5 w-5" />}
          {theme === "dark" && <Moon className="h-5 w-5" />}
          {theme === "system" && <Monitor className="h-5 w-5" />}
        </button>

        <div className="relative" ref={userRef}>
          <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800" onClick={() => setUserMenuOpen((v) => !v)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {user?.fullName?.charAt(0).toUpperCase()}
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-ink-200 bg-white p-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
              <div className="px-3 py-2 text-sm">
                <p className="font-medium text-ink-900 dark:text-white">{user?.fullName}</p>
                <p className="truncate text-ink-500 dark:text-ink-400">{user?.email}</p>
              </div>
              <hr className="my-1 border-ink-100 dark:border-ink-800" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/app/settings?tab=profile");
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <UserRound className="h-4 w-4" /> Profile settings
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
