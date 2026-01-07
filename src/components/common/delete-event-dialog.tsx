"use client";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { useTranslations } from "next-intl";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  eventName: _eventName,
  onConfirm,
  isPending = false,
}: DeleteEventDialogProps) {
  const t = useTranslations("Dashboard.EventList");
  const tShared = useTranslations("EventDashboard.Shared");

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteConfirmTitle")}
      description={t("deleteConfirmDescription")}
      onConfirm={onConfirm}
      isPending={isPending}
      confirmLabel={isPending ? tShared("deleting") : t("deleteConfirmButton")}
      cancelLabel={t("deleteCancelButton")}
    />
  );
}
