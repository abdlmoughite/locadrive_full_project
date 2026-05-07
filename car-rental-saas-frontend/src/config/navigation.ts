import {
  BarChart3,
  Building2,
  CalendarRange,
  Car,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gauge,
  LifeBuoy,
  ReceiptText,
  Settings,
  Shield,
  ToolCase,
  Users,
  Wrench,
} from "lucide-react";

import type { User } from "@/types/common";
import {
  canManageFinance,
  canManageSubscriptions,
  isAgencyOwner,
  isAgencyUser,
  isSuperadmin,
} from "@/config/permissions";

export interface NavigationItem {
  labelKey: string;
  to: string;
  icon: typeof Gauge;
  visible: (user: User | null) => boolean;
}

export interface NavigationGroup {
  titleKey: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    titleKey: "navigation.groups.overview",
    items: [
      { labelKey: "navigation.items.dashboard", to: "/dashboard", icon: Gauge, visible: (user) => Boolean(user) },
      { labelKey: "navigation.items.profile", to: "/profile", icon: Shield, visible: (user) => Boolean(user) },
    ],
  },
  {
    titleKey: "navigation.groups.superadmin",
    items: [
      { labelKey: "navigation.items.agencies", to: "/admin/agencies", icon: Building2, visible: isSuperadmin },
      { labelKey: "navigation.items.subscriptions", to: "/admin/subscriptions", icon: ReceiptText, visible: canManageSubscriptions },
      { labelKey: "navigation.items.users", to: "/admin/users", icon: Users, visible: isSuperadmin },
    ],
  },
  {
    titleKey: "navigation.groups.fleet",
    items: [
      { labelKey: "navigation.items.cars", to: "/cars", icon: Car, visible: isAgencyUser },
      { labelKey: "navigation.items.maintenance", to: "/maintenance", icon: Wrench, visible: isAgencyUser },
    ],
  },
  {
    titleKey: "navigation.groups.operations",
    items: [
      { labelKey: "navigation.items.clients", to: "/clients", icon: Users, visible: isAgencyUser },
      { labelKey: "navigation.items.reservations", to: "/reservations", icon: CalendarRange, visible: isAgencyUser },
      { labelKey: "navigation.items.contracts", to: "/contracts", icon: FileText, visible: isAgencyUser },
      { labelKey: "navigation.items.invoices", to: "/invoices", icon: ReceiptText, visible: isAgencyOwner },
      { labelKey: "navigation.items.payments", to: "/payments", icon: CreditCard, visible: isAgencyUser },
      { labelKey: "navigation.items.deposits", to: "/deposits", icon: CircleDollarSign, visible: isAgencyUser },
      { labelKey: "navigation.items.expenses", to: "/expenses", icon: ToolCase, visible: canManageFinance },
      { labelKey: "navigation.items.incidents", to: "/incidents", icon: LifeBuoy, visible: isAgencyUser },
    ],
  },
  {
    titleKey: "navigation.groups.reports",
    items: [
      { labelKey: "navigation.items.financeSummary", to: "/reports/finance", icon: BarChart3, visible: canManageFinance },
      { labelKey: "navigation.items.carProfitability", to: "/reports/cars-profitability", icon: BarChart3, visible: canManageFinance },
      { labelKey: "navigation.items.clientBalances", to: "/reports/client-balances", icon: BarChart3, visible: canManageFinance },
    ],
  },
  {
    titleKey: "navigation.groups.admin",
    items: [
      { labelKey: "navigation.items.users", to: "/users", icon: Users, visible: isAgencyOwner },
      { labelKey: "navigation.items.settings", to: "/settings", icon: Settings, visible: isAgencyOwner },
    ],
  },
];
