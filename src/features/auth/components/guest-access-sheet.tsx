"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { UserPlus, UserCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

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
      <DrawerContent className="px-4 text-left">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none min-h-[60vh] flex-1 overflow-y-auto pb-40">
          <div className="space-y-4 py-6 font-sans">
            <div className="space-y-2 px-4 text-center">
              <p className="text-gray-600">{t("description")}</p>
            </div>

            <div className="grid gap-4 px-4">
              <Button
                variant="premium"
                className="h-auto w-full whitespace-normal border-accent/20 bg-accent py-4 text-white shadow-lg shadow-accent/20 active:scale-95"
                onClick={onAuth}
                icon={<UserCircle className="h-6 w-6" />}
                iconClassName="bg-white/20 text-white"
              >
                <div className="flex-1 text-left">
                  <div className="text-base font-bold">{t("identifyButton")}</div>
                  <div className="text-xs text-white/70">{t("identifyDescription")}</div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-50" />
              </Button>

              <Button
                variant="premium"
                className="h-auto w-full whitespace-normal border-gray-100 bg-white py-4 text-gray-900 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
                onClick={() => {
                  sendGAEvent("event", "guest_continued_without_auth");
                  onClose();
                }}
                icon={<UserPlus className="h-6 w-6" />}
                iconClassName="bg-gray-100 text-gray-500"
              >
                <div className="flex-1 text-left">
                  <div className="text-base font-bold">{t("continueButton")}</div>
                  <div className="text-xs font-medium text-gray-500">
                    {t("continueDescription")}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300" />
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
