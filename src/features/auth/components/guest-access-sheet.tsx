"use client";

import { UserPlus, UserCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

export function GuestAccessSheetContent({
  onAuth,
  onCreateGuest,
}: {
  onAuth: () => void;
  onCreateGuest?: () => void;
}) {
  const t = useTranslations("EventDashboard.Sheets.GuestAccess");
  return (
    <div className="space-y-3 pb-8 pt-2 font-sans">
      <div className="space-y-2 px-4 text-center">
        <p className="text-sm text-gray-500 dark:text-zinc-400">{t("description")}</p>
      </div>

      <div className="grid gap-3 px-4">
        <Button
          variant="premium"
          className="h-auto w-full whitespace-normal border-accent/20 bg-accent py-3.5 text-white shadow-xl shadow-accent/20 transition-all duration-300 active:scale-95"
          onClick={() => {
            sendGAEvent("event", "guest_continued_without_auth");
            if (onCreateGuest) {
              onCreateGuest();
            }
          }}
          icon={<UserPlus className="h-5 w-5" />}
          iconClassName="bg-white/20 text-white"
          shine
        >
          <div className="flex-1 text-left">
            <div className="text-sm font-black uppercase tracking-widest">
              {t("continueButton")}
            </div>
            <div className="text-[11px] font-medium leading-tight text-white/80">
              {t("continueDescription")}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 opacity-50" />
        </Button>

        <Button
          variant="premium"
          className="h-auto w-full whitespace-normal border-gray-200 bg-white py-3.5 text-gray-900 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:bg-gray-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
          onClick={onAuth}
          icon={<UserCircle className="h-5 w-5" />}
          iconClassName="bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-zinc-400"
        >
          <div className="flex-1 text-left">
            <div className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-zinc-300">
              {t("identifyButton")}
            </div>
            <div className="text-[11px] font-medium leading-tight text-gray-500 dark:text-zinc-400">
              {t("identifyDescription")}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-zinc-500" />
        </Button>
      </div>
    </div>
  );
}
