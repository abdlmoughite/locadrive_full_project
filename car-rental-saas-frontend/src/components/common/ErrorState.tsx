import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border border-red-200 bg-red-50/60 px-6 text-center">
      <AlertTriangle className="h-9 w-9 text-red-600" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-950">{title ?? "Something went wrong."}</p>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="danger" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
