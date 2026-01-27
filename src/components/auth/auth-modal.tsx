"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { AuthForm } from "./auth-form";
import { useTranslations } from "next-intl";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Login");

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} repositionInputs={true}>
      <DrawerContent className="h-[95vh] max-h-[95vh] bg-[#fdfcff] px-6 dark:bg-zinc-900">
        <DrawerHeader className="px-0 text-left mb-6">
          <DrawerTitle className="sr-only">{t("signinTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <AuthForm onSuccess={onClose} isUserMode={true} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
