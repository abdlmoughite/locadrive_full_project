import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary" | "success";
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel,
  confirmVariant = "danger",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? t("common.loadingShort") : confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
