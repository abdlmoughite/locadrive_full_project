import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { navigationGroups } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import type { User } from "@/types/common";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export function MobileSidebar({ open, onClose, user }: MobileSidebarProps) {
  const { i18n, t } = useTranslation();

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: i18n.dir() === "rtl" ? 360 : -360 }}
            animate={{ x: 0 }}
            exit={{ x: i18n.dir() === "rtl" ? 360 : -360 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="absolute inset-y-0 start-0 w-[88vw] max-w-sm overflow-y-auto border-r border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-300">{t("common.appName")}</p>
                <h2 className="mt-2 text-xl font-semibold">{t("layout.sidebarTitle")}</h2>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-900 hover:text-white" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {navigationGroups.map((group) => {
                const items = group.items.filter((item) => item.visible(user));
                if (!items.length) {
                  return null;
                }

                return (
                  <div key={group.titleKey} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t(group.titleKey)}</p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                        >
                          <item.icon className="h-4 w-4" />
                          {t(item.labelKey)}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <LanguageSwitcher className="mt-8 border-slate-800 bg-slate-900 text-white" />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
