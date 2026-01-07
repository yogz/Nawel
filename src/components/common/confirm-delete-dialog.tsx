"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { WarningBanner } from "./warning-banner";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmationInput?: string; // The text the user must type to confirm. If undefined, no typing required.
  validationInstruction?: string; // Instruction text for typing (e.g. "Type 'DELETE' to confirm")
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmationInput,
  validationInstruction,
  onConfirm,
  isPending = false,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue("");
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (confirmationInput && inputValue !== confirmationInput) {
      return;
    }
    await onConfirm();
  };

  const isConfirmDisabled = confirmationInput ? inputValue !== confirmationInput : false;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <AlertDialogTitle className="text-xl font-black text-gray-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-gray-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <WarningBanner message="Attention : Cette action est irréversible." />

          {confirmationInput && (
            <div className="space-y-3">
              {validationInstruction && (
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {validationInstruction}
                </p>
              )}
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmationInput}
                className="rounded-xl border-red-100 bg-red-50/20 focus:border-red-300 focus:ring-red-200"
                autoFocus
              />
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel disabled={isPending} className="mt-0 w-full sm:w-auto">
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {confirmLabel}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
