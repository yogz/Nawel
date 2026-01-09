"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Share, PlusSquare, X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAPrompt() {
  const t = useTranslations("PWAPrompt");
  const { data: session } = useSession();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 0. Only show if cookie consent has been handled
    if (localStorage.getItem("analytics_consent") === null) return;

    // 1. Detect if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) return;

    // 2. Detect iOS
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // 3. Handle Android/Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Only show the prompt if the user is logged in
      if (!session) return;

      // Wait a bit before showing the prompt to not annoy the user immediately
      const timer = setTimeout(() => setShowPrompt(true), 10000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. For iOS, show the prompt if not standalone after some time
    if (ios && session) {
      const timer = setTimeout(() => setShowPrompt(true), 15000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    // Don't show again in this session
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Check if dismissed in this session
  useEffect(() => {
    if (sessionStorage.getItem("pwa-prompt-dismissed")) {
      setShowPrompt(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:w-96"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:bg-black/90">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-text"
              aria-label={t("closeButton")}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                {isIOS ? <Smartphone className="h-6 w-6" /> : <Download className="h-6 w-6" />}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-text">{t("title")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isIOS ? t("iosInstructions") : t("description")}
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-accent/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/10">
                    <Share className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium">{t("iosStep1")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-accent/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/10">
                    <PlusSquare className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium">{t("iosStep2")}</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={handleInstallClick}
                  variant="premium"
                  className="w-full justify-center py-6 text-base"
                >
                  {t("installButton")}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  {t("closeButton")}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
