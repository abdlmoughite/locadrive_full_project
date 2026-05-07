import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { toTitleCase } from "@/lib/utils";

export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Link to="/dashboard" className="font-medium text-slate-600 transition hover:text-slate-950">
        {t("routes.dashboard")}
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = t(`routes.${segment}`, { defaultValue: toTitleCase(segment) });

        return (
          <span key={href} className="inline-flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-slate-300" />
            {isLast ? (
              <span className="font-medium text-slate-950">{label}</span>
            ) : (
              <Link to={href} className="font-medium text-slate-600 transition hover:text-slate-950">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
