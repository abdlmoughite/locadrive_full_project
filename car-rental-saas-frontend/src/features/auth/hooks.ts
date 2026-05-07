import axios from "axios";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeys, getCurrentUser, login, logout, registerOwner } from "@/features/auth/api";
import { authStore, clearAuthState, getAccessToken, getRefreshToken } from "@/features/auth/authStore";
import type { LoginPayload, OwnerRegistrationPayload } from "@/types/common";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getCurrentUser,
    enabled: Boolean(getAccessToken()),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAuthBootstrap() {
  const currentUserQuery = useCurrentUserQuery();

  useEffect(() => {
    if (currentUserQuery.data) {
      authStore.setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data]);

  useEffect(() => {
    if (currentUserQuery.isError && axios.isAxiosError(currentUserQuery.error) && currentUserQuery.error.response?.status === 401) {
      clearAuthState();
    }
  }, [currentUserQuery.error, currentUserQuery.isError]);

  return currentUserQuery;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async (tokens) => {
      authStore.setTokens({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
      });
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

export function useRegisterOwnerMutation() {
  return useMutation({
    mutationFn: (payload: OwnerRegistrationPayload) => registerOwner(payload),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return async () => {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } finally {
      clearAuthState();
      queryClient.clear();
    }
  };
}
