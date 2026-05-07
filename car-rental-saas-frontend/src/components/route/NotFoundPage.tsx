import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{t("ui.notFoundTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{t("ui.notFoundDescription")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/dashboard">
            <Button>{t("ui.goToDashboard")}</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline">{t("common.login")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
