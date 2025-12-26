"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { UserPlus, UserCircle, ArrowRight } from "lucide-react";

export function GuestAccessSheet({
  open,
  onClose,
  onAuth,
}: {
  open: boolean;
  onClose: () => void;
  onAuth: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Bienvenue !">
      <div className="space-y-6 py-6 font-sans">
        <div className="space-y-2 px-4 text-center">
          <p className="text-gray-600">
            Vous avez un lien d&apos;édition pour cet événement. Pour apparaître dans la liste des
            participants et mieux collaborer, nous vous conseillons de vous connecter.
          </p>
        </div>

        <div className="grid gap-3 px-4">
          <button
            onClick={onAuth}
            className="flex w-full items-center justify-between rounded-2xl bg-accent p-4 text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <div className="font-bold">S&apos;identifier / S&apos;inscrire</div>
                <div className="text-xs text-white/80">Devenir participant officiel</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-50" />
          </button>

          <button
            onClick={onClose}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition-all hover:bg-gray-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <UserPlus className="h-6 w-6" />
              </div>
              <div className="text-left">
                <div className="font-bold">Continuer sans compte</div>
                <div className="text-xs text-gray-500">Edition possible, mais non identifiée</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-300" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
