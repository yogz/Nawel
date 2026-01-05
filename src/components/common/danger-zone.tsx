"use client";

import { AlertTriangle, ChevronDown, Loader2, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";
import { WarningBanner } from "./warning-banner";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { useState } from "react";
import clsx from "clsx";

/* -------------------------------------------------------------------------- */
/*                                   TRIGGER                                  */
/* -------------------------------------------------------------------------- */

interface DangerZoneTriggerProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function DangerZoneTrigger({
  onClick,
  className,
  label = "Options avancées",
}: DangerZoneTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex w-full items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 py-4 transition-all hover:border-red-200 hover:bg-red-50 active:scale-[0.98]",
        className
      )}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-red-100 transition-transform group-hover:scale-110 group-hover:ring-red-200">
        <ChevronDown size={14} className="text-red-500" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-red-600 group-hover:text-red-700">
        {label}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   CONTENT                                  */
/* -------------------------------------------------------------------------- */

interface DangerZoneContentProps {
  onDelete: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
  title?: string; // Title below the icon (e.g. "ZONE DE DANGER")
  warningMessage?: string; // Text in the banner
  deleteButtonLabel?: string;
  cancelButtonLabel?: string;
  confirmationConfig: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmationInput?: string; // If typed confirmation is needed
    validationInstruction?: string;
  };
}

export function DangerZoneContent({
  onDelete,
  onCancel,
  isDeleting,
  title = "Zone de danger",
  warningMessage = "Attention : Cette action est irréversible. Toutes vos données seront supprimées.",
  deleteButtonLabel = "Confirmer la suppression",
  cancelButtonLabel = "Annuler",
  confirmationConfig,
}: DangerZoneContentProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 pt-8">
      {/* Danger Zone Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-red-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle size={24} strokeWidth={2.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-black uppercase tracking-widest text-gray-900">{title}</h4>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="w-full px-1">
        <WarningBanner
          message={warningMessage}
          className="border-red-100 bg-red-50/50 text-red-600"
        />
      </div>

      {/* Actions */}
      <div className="w-full space-y-3 pt-4">
        <Button
          variant="destructive"
          onClick={() => setShowDialog(true)}
          disabled={isDeleting}
          className="w-full py-6 text-sm font-bold shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/20"
        >
          {isDeleting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Suppression...
            </>
          ) : (
            <>
              <Trash2 size={18} />
              {deleteButtonLabel}
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isDeleting}
          className="w-full border-2 border-gray-200 bg-white py-6 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
        >
          <X size={18} />
          {cancelButtonLabel}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isPending={isDeleting}
        onConfirm={async () => {
          await onDelete();
          setShowDialog(false);
        }}
        {...confirmationConfig}
      />
    </div>
  );
}
