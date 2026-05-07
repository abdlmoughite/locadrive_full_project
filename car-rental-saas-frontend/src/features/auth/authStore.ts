import { useSyncExternalStore } from "react";

import type { AuthState } from "@/features/auth/types";
import type { User } from "@/types/common";

const ACCESS_TOKEN_KEY = "locadrive.access_token";
const REFRESH_TOKEN_KEY = "locadrive.refresh_token";

function readStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

const state: AuthState = {
  accessToken: readStorage(ACCESS_TOKEN_KEY),
  refreshToken: readStorage(REFRESH_TOKEN_KEY),
  user: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(key, value);
  } else {
    window.localStorage.removeItem(key);
  }
}

export const authStore = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setTokens: (payload: { accessToken: string; refreshToken: string }) => {
    state.accessToken = payload.accessToken;
    state.refreshToken = payload.refreshToken;
    writeStorage(ACCESS_TOKEN_KEY, payload.accessToken);
    writeStorage(REFRESH_TOKEN_KEY, payload.refreshToken);
    emit();
  },
  setAccessToken: (accessToken: string) => {
    state.accessToken = accessToken;
    writeStorage(ACCESS_TOKEN_KEY, accessToken);
    emit();
  },
  setUser: (user: User | null) => {
    state.user = user;
    emit();
  },
  clear: () => {
    state.accessToken = null;
    state.refreshToken = null;
    state.user = null;
    writeStorage(ACCESS_TOKEN_KEY, null);
    writeStorage(REFRESH_TOKEN_KEY, null);
    emit();
  },
};

export function getAccessToken() {
  return authStore.getState().accessToken;
}

export function getRefreshToken() {
  return authStore.getState().refreshToken;
}

export function setAuthUser(user: User | null) {
  authStore.setUser(user);
}

export function clearAuthState() {
  authStore.clear();
}

export function useAuthStore<T>(selector: (state: AuthState) => T) {
  return useSyncExternalStore(authStore.subscribe, () => selector(authStore.getState()), () => selector(authStore.getState()));
}

