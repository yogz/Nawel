"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { UserPlus, UserCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";

export function GuestAccessSheet({
  open,
  onClose,
  onAuth,
}: {
  open: boolean;
  onClose: () => void;
  onAuth: () => void;
}) {
  const t = useTranslations("EventDashboard.Sheets.GuestAccess");
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-1 text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none overflow-y-auto pb-8">
          <div className="space-y-6 py-6 font-sans">
            <div className="space-y-2 px-4 text-center">
              <p className="text-gray-600">{t("description")}</p>
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
                    <div className="font-bold">{t("identifyButton")}</div>
                    <div className="text-xs text-white/80">{t("identifyDescription")}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-50" />
              </button>

              <button
                onClick={() => {
                  // Track guest continuing without authentication
                  posthog.capture("guest_continued_without_auth");
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition-all hover:bg-gray-50 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{t("continueButton")}</div>
                    <div className="text-xs text-gray-500">{t("continueDescription")}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
