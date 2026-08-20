import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let activeBusinessId: string | null = localStorage.getItem("businessos-active-business");

export function setActiveBusinessId(id: string | null) {
  activeBusinessId = id;
  if (id) localStorage.setItem("businessos-active-business", id);
  else localStorage.removeItem("businessos-active-business");
}

export function getActiveBusinessId() {
  return activeBusinessId;
}

api.interceptors.request.use((config) => {
  if (activeBusinessId) {
    config.headers["X-Business-Id"] = activeBusinessId;
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;
      try {
        refreshPromise ??= api.post("/auth/refresh").then(() => undefined);
        await refreshPromise;
        refreshPromise = null;
        return api(original);
      } catch {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.message === "Network Error") return "Cannot reach the server. Check your connection and try again.";
  }
  return fallback;
}
