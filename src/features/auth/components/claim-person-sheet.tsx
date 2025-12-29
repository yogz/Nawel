"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { User, Plus, Loader2, Check } from "lucide-react";
import { type Person } from "@/lib/types";
import { getPersonEmoji, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ClaimPersonSheet({
  open,
  onClose,
  unclaimed,
  onClaim,
  onJoinNew,
}: {
  open: boolean;
  onClose: () => void;
  unclaimed: Person[];
  onClaim: (personId: number) => Promise<void>;
  onJoinNew: () => void;
}) {
  const t = useTranslations("EventDashboard.Sheets.ClaimPerson");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    if (selectedId === null || isPending) return;
    setIsPending(true);
    try {
      await onClaim(selectedId);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("title")}>
      <div className="space-y-6 py-6 transition-all duration-300">
        <div className="space-y-2 px-4 text-center">
          <p className="text-gray-600">{t("description")}</p>
        </div>

        <div className="grid gap-3 px-4">
          <div className="custom-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
            {unclaimed.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  disabled={isPending}
                  className={cn(
                    "relative flex w-full items-center gap-4 rounded-2xl border p-4 transition-all active:scale-95 disabled:opacity-50",
                    isSelected
                      ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
                      : "border-gray-100 bg-white hover:border-accent/30 hover:bg-accent/5"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl shadow-sm">
                    {getPersonEmoji(
                      p.name,
                      unclaimed.map((up) => up.name),
                      p.emoji
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-base font-bold text-gray-900">{p.name}</div>
                    <div className="text-xs font-medium text-gray-500">{t("itsMe")}</div>
                  </div>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                      isSelected ? "bg-accent text-white" : "bg-gray-50 text-gray-300"
                    )}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <User className="h-5 w-5" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              variant="premium"
              className="w-full py-7 pr-8 shadow-md"
              disabled={selectedId === null || isPending}
              onClick={handleConfirm}
              icon={isPending ? <Loader2 className="animate-spin" /> : <Check />}
            >
              <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                {isPending ? t("associating") : t("validateButton")}
              </span>
            </Button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-white px-3 font-bold text-gray-300">{t("orSeparator")}</span>
            </div>
          </div>

          <button
            onClick={onJoinNew}
            disabled={isPending}
            className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-white shadow-lg shadow-zinc-900/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">{t("newProfileButton")}</div>
              <div className="text-xs text-white/60">{t("newProfileDescription")}</div>
            </div>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
