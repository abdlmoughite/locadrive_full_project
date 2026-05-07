import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <SearchX className="h-9 w-9 text-slate-400" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-950">{title ?? t("common.noData")}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
