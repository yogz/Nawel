"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  eventName,
  onConfirm,
  isPending = false,
}: DeleteEventDialogProps) {
  const t = useTranslations("Dashboard.EventList");
  const tOrganizer = useTranslations("EventDashboard.Organizer");
  const tShared = useTranslations("EventDashboard.Shared");
  const [confirmText, setConfirmText] = useState("");

  // Reset confirmation text when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (confirmText === eventName) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <DialogTitle className="text-xl font-black text-gray-900">
            {t("deleteConfirmTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-gray-500">
            {t("deleteConfirmDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {t("deleteConfirmInstruction", { name: eventName })}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("deleteConfirmPlaceholder")}
            className="rounded-xl border-red-100 bg-red-50/20 focus:border-red-300 focus:ring-red-200"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("deleteCancelButton")}
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={confirmText !== eventName || isPending}
          >
            {isPending ? tShared("deleting") : t("deleteConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
