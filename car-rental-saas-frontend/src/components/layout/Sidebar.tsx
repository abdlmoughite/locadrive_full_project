import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { navigationGroups } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/types/common";

export function Sidebar({ user, collapsed }: { user: User | null; collapsed: boolean }) {
  const { t } = useTranslation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 106 : 320 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="hidden flex-col border-r border-slate-800 bg-slate-950 px-4 py-6 text-white lg:flex"
    >
      <div className="mb-8 px-3">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-300">{t("common.appName")}</p>
        {!collapsed ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold text-white">{t("layout.sidebarTitle")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("layout.sidebarSubtitle")}</p>
          </>
        ) : null}
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-1">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible(user));

          if (!visibleItems.length) {
            return null;
          }

          return (
            <div key={group.titleKey} className="space-y-3">
              {!collapsed ? (
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {t(group.titleKey)}
                </p>
              ) : null}
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={t(item.labelKey)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white",
                        collapsed && "justify-center px-0",
                        isActive && "bg-blue-600 text-white shadow-lg shadow-blue-950/40",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );
}
