import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <div className="hidden rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl lg:block">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-6">
              <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-blue-100">
                {t("ui.authTagline")}
              </p>
              <div className="space-y-4">
                <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white">
                  {t("ui.authHeadline")}
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300">
                  {t("ui.authDescription")}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">{t("ui.fleet")}</p>
                <p className="mt-2 text-2xl font-semibold">{t("ui.carsMaintenanceIncidents")}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">{t("ui.bookings")}</p>
                <p className="mt-2 text-2xl font-semibold">{t("ui.reservationsContracts")}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">{t("ui.finance")}</p>
                <p className="mt-2 text-2xl font-semibold">{t("ui.invoicesPaymentsDeposits")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
