"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { User, Plus, Loader2, Check } from "lucide-react";
import { type Person } from "@/lib/types";
import { renderAvatar, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";

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
    if (selectedId === null || isPending) {
      return;
    }
    setIsPending(true);
    try {
      await onClaim(selectedId);
      sendGAEvent("event", "person_claimed_profile");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none overflow-y-auto pb-8">
          <div className="space-y-3 py-3 transition-all duration-300">
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
                        "relative flex w-full items-center gap-3 rounded-2xl border p-3 transition-all active:scale-95 disabled:opacity-50",
                        isSelected
                          ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
                          : "border-gray-100 bg-white hover:border-accent/30 hover:bg-accent/5"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-xl shadow-sm">
                        {(() => {
                          const avatar = renderAvatar(
                            p,
                            unclaimed.map((up) => up.name)
                          );
                          // Claim sheet always shows emojis for unclaimed people as they can't have verified users yet
                          return avatar.type === "emoji" ? avatar.value : "👤";
                        })()}
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
                  shine={!isPending && selectedId !== null}
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

              <Button
                variant="premium"
                className="w-full border-zinc-200 bg-zinc-900 py-4 shadow-xl shadow-zinc-900/10 active:scale-95 disabled:opacity-50"
                onClick={() => {
                  sendGAEvent("event", "person_joined_new");
                  onJoinNew();
                }}
                disabled={isPending}
                icon={<Plus className="h-5 w-5" />}
                iconClassName="bg-white/10 text-white"
              >
                <div className="flex-1 text-left">
                  <div className="text-base font-bold text-white">{t("newProfileButton")}</div>
                  <div className="text-xs text-white/50">{t("newProfileDescription")}</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
