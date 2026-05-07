import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LoadingState({ title }: { title?: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white text-center shadow-sm">
      <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium text-slate-700">{title ?? t("common.loading")}</p>
    </div>
  );
}
