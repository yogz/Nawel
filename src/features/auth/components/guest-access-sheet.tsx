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
    <div className="space-y-4 py-6 font-sans">
      <div className="space-y-2 px-4 text-center">
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <div className="grid gap-4 px-4">
        <Button
          variant="premium"
          className="h-auto w-full whitespace-normal border-accent/20 bg-accent py-5 text-white shadow-xl shadow-accent/20 active:scale-95 transition-all duration-300"
          onClick={() => {
            sendGAEvent("event", "guest_continued_without_auth");
            if (onCreateGuest) {
              onCreateGuest();
            }
          }}
          icon={<UserPlus className="h-6 w-6" />}
          iconClassName="bg-white/20 text-white"
          shine
        >
          <div className="flex-1 text-left">
            <div className="text-base font-black uppercase tracking-widest">
              {t("continueButton")}
            </div>
            <div className="text-xs font-medium text-white/80 leading-relaxed">
              {t("continueDescription")}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 opacity-50" />
        </Button>

        <Button
          variant="premium"
          className="h-auto w-full whitespace-normal border-gray-200 bg-white py-5 text-gray-900 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:bg-gray-50 active:scale-95"
          onClick={onAuth}
          icon={<UserCircle className="h-6 w-6" />}
          iconClassName="bg-gray-100 text-gray-400"
        >
          <div className="flex-1 text-left">
            <div className="text-sm font-black uppercase tracking-widest text-gray-600">
              {t("identifyButton")}
            </div>
            <div className="text-xs font-medium text-gray-500 leading-relaxed">
              {t("identifyDescription")}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300" />
        </Button>
      </div>
    </div>
  );
}
