"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { AuthForm } from "./auth-form";
import { useTranslations } from "next-intl";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Login");

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} repositionInputs={true}>
      <DrawerContent className="px-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="sr-only">{t("signinTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="scrollbar-none min-h-[60vh] flex-1 overflow-y-auto pb-40">
          <div className="py-2">
            <AuthForm onSuccess={onClose} isUserMode={true} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
