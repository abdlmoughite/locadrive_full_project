import type { User } from "@/types/common";

export function isPendingOwner(user: User | null) {
  return user?.role === "AGENCY_OWNER" && !user.is_verified;
}

export function isVerifiedOwner(user: User | null) {
  return user?.role === "AGENCY_OWNER" && user.is_verified;
}

export function canManageUsers(user: User | null) {
  return user?.role === "SUPERADMIN" || isVerifiedOwner(user);
}

export function canManageSubscriptions(user: User | null) {
  return user?.role === "SUPERADMIN";
}

export function canManageFinance(user: User | null) {
  return isVerifiedOwner(user);
}

export function canOverrideBlacklist(user: User | null) {
  return isVerifiedOwner(user);
}

export function canDeleteFinanceRecord(user: User | null) {
  return isVerifiedOwner(user);
}

export function isAgencyUser(user: User | null) {
  return user?.role === "AGENCY_AGENT" || isVerifiedOwner(user);
}

export function isSuperadmin(user: User | null) {
  return user?.role === "SUPERADMIN";
}

export function isAgencyOwner(user: User | null) {
  return isVerifiedOwner(user);
}

export function canAccessRoute(user: User | null, route: string) {
  if (!user) {
    return route === "/login" || route === "/register";
  }

  if (route === "/pending-verification") {
    return isPendingOwner(user);
  }

  if (route === "/dashboard" || route === "/profile") {
    return !isPendingOwner(user);
  }

  if (route.startsWith("/admin")) {
    return user.role === "SUPERADMIN";
  }

  if (route === "/users" || route === "/settings") {
    return user.role === "AGENCY_OWNER";
  }

  if (route.startsWith("/reports") || route.startsWith("/expenses") || route.startsWith("/invoices")) {
    return user.role === "AGENCY_OWNER";
  }

  if (route.startsWith("/cars/create") || /^\/cars\/[^/]+\/edit$/.test(route)) {
    return user.role === "AGENCY_OWNER";
  }

  if (route === "/cars" || /^\/cars\/[^/]+$/.test(route)) {
    return isAgencyUser(user);
  }

  if (route.startsWith("/clients") || route.startsWith("/reservations") || route.startsWith("/contracts")) {
    return isAgencyUser(user);
  }

  if (route.startsWith("/payments") || route.startsWith("/deposits") || route.startsWith("/maintenance") || route.startsWith("/incidents")) {
    return isAgencyUser(user);
  }

  return false;
}
