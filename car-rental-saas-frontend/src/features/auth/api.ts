import axios from "axios";

import { env } from "@/config/env";
import { apiClient } from "@/lib/apiClient";
import type { LoginPayload, LoginResponse, OwnerRegistrationPayload, RefreshResponse, User } from "@/types/common";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<LoginResponse>("/auth/login/", payload);
  return response.data;
}

export async function refreshToken(refresh: string) {
  const response = await axios.post<RefreshResponse>(`${env.apiBaseUrl}/auth/refresh/`, { refresh });
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<User>("/auth/me/");
  return response.data;
}

export async function registerOwner(payload: OwnerRegistrationPayload) {
  const response = await apiClient.post<{ detail: string; user: User }>("/auth/register/owner/", payload);
  return response.data;
}

export async function logout(refresh: string) {
  await apiClient.post("/auth/logout/", { refresh });
}
