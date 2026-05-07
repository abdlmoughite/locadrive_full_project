import type { LoginPayload, LoginResponse, OwnerRegistrationPayload, RefreshResponse, User } from "@/types/common";

export type { LoginPayload, LoginResponse, OwnerRegistrationPayload, RefreshResponse, User };

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}
