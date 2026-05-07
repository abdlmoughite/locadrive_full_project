import i18n from "@/i18n";
import { env } from "@/config/env";
import { statusVariantMap } from "@/lib/constants";
import { parseMoney, toTitleCase } from "@/lib/utils";
import type { PaymentMethod, UserRole } from "@/types/common";

function getLocale() {
  return {
    en: "en-GB",
    fr: "fr-MA",
    ar: "ar-MA",
  }[i18n.language] ?? "en-GB";
}

export function formatMoney(amount: string | number | null | undefined) {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: env.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseMoney(amount));
}

export function formatDate(date: string | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getStatusBadgeVariant(status: string) {
  return statusVariantMap[status] ?? "neutral";
}

export function getRoleLabel(role: UserRole) {
  return i18n.t(`enums.${role}`, { defaultValue: role });
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return i18n.t(`enums.${method}`, { defaultValue: method });
}

export function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return i18n.t(`enums.${value}`, { defaultValue: toTitleCase(value) });
}
