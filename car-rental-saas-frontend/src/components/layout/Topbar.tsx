import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { getRoleLabel } from "@/lib/formatters";
import type { User } from "@/types/common";

interface TopbarProps {
  user: User | null;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
}

export function Topbar({ user, onOpenMobileSidebar, onLogout, sidebarCollapsed, onToggleDesktopSidebar }: TopbarProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={onOpenMobileSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="hidden lg:inline-flex" onClick={onToggleDesktopSidebar}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <div className="space-y-1">
            <Breadcrumbs />
            <p className="text-sm text-slate-500">{t("layout.welcome")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/profile" className="hidden rounded-2xl border border-slate-200 px-4 py-3 text-right md:block">
            <p className="text-sm font-semibold text-slate-950">{user?.full_name ?? t("navigation.items.profile")}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {user ? getRoleLabel(user.role) : "-"}
            </p>
          </Link>
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
