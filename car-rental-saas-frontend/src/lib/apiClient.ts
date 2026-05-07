import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

import { env } from "@/config/env";
import { clearAuthState, getAccessToken, getRefreshToken, authStore } from "@/features/auth/authStore";
import { downloadBlob } from "@/lib/utils";
import type { ApiErrorPayload, RefreshResponse } from "@/types/common";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
});

let refreshPromise: Promise<string> | null = null;

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const response = await axios.post<RefreshResponse>(`${env.apiBaseUrl}/auth/refresh/`, {
    refresh: refreshToken,
  });
  const nextAccessToken = response.data.access;
  const nextRefreshToken = response.data.refresh ?? refreshToken;

  authStore.setTokens({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  });

  return nextAccessToken;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthRoute = originalRequest.url?.includes("/auth/login/") || originalRequest.url?.includes("/auth/refresh/");

    if (status === 401 && !originalRequest._retry && !isAuthRoute && getRefreshToken()) {
      originalRequest._retry = true;

      try {
        refreshPromise ??= refreshAccessToken();
        const nextAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAuthState();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (status === 403) {
      toast.error("Permission denied", {
        description: "Your account cannot perform this action.",
      });
    }

    if (status && status >= 500) {
      toast.error("Server error", {
        description: "Something went wrong on the server. Please try again.",
      });
    }

    if (status === 401 && !getRefreshToken()) {
      clearAuthState();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const detail = error.response?.data?.detail;
    if (detail) {
      return detail;
    }

    const payload = error.response?.data;
    if (!payload) {
      return "An unexpected API error occurred.";
    }

    const firstError = Object.values(payload).flatMap((value) => (Array.isArray(value) ? value : [value])).find(Boolean);
    return String(firstError ?? "An unexpected API error occurred.");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function downloadBinaryFile(url: string, fallbackFilename: string) {
  const response = await apiClient.get<Blob>(url, { responseType: "blob" });
  const contentDisposition = response.headers["content-disposition"];
  const matchedFilename = contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1];
  downloadBlob(response.data, matchedFilename ?? fallbackFilename);
}
