import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/apiClient";

interface PDFDownloadButtonProps {
  onDownload: () => Promise<void>;
  successMessage?: string;
}

export function PDFDownloadButton({ onDownload, successMessage }: PDFDownloadButtonProps) {
  const { t } = useTranslation();
  const mutation = useMutation({
    mutationFn: onDownload,
    onSuccess: () => {
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (error) => {
      toast.error(t("common.downloadPdf"), { description: getErrorMessage(error) });
    },
  });

  return (
    <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? t("common.loading") : t("common.downloadPdf")}
    </Button>
  );
}
