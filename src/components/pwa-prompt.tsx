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
  const [triggerCheck, setTriggerCheck] = useState(0);

  useEffect(() => {
    const checkConditions = () => {
      // 0. Only show if cookie consent has been handled
      if (localStorage.getItem("analytics_consent") === null) return false;

      // 1. Detect if already in standalone mode
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");

      if (isStandalone) return false;

      // Option C: Only show if this is at least the second session/visit
      const visits = parseInt(localStorage.getItem("pwa-visit-count") || "0");
      if (visits < 2) return false;

      // 2. Check if dismissed persistently
      if (localStorage.getItem("pwa-prompt-dismissed-permanent") === "true") return false;

      // 3. Check if dismissed temporarily (e.g., hidden for 3 days)
      const tempDismissedAt = localStorage.getItem("pwa-prompt-dismissed-temporary");
      if (tempDismissedAt) {
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(tempDismissedAt) < threeDaysInMs) {
          return false;
        }
      }

      return true;
    };

    // Track visit count (only once per mount/session to be fair)
    const hasIncremented = sessionStorage.getItem("pwa-visit-incremented");
    if (!hasIncremented) {
      const currentVisits = parseInt(localStorage.getItem("pwa-visit-count") || "0");
      localStorage.setItem("pwa-visit-count", (currentVisits + 1).toString());
      sessionStorage.setItem("pwa-visit-incremented", "true");
    }

    if (!checkConditions()) {
      // If conditions aren't met, listen for storage events to re-check
      // This handles the case where the user just accepted cookies
      const handleStorageChange = () => {
        if (checkConditions()) {
          // Re-trigger the whole effect logic by some means or just run it here
          // For simplicity, let's just use a state bit
          setTriggerCheck((prev) => prev + 1);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      // Also listen for a custom event since storage event doesn't fire in the same tab
      window.addEventListener("analytics-consent-updated", handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("analytics-consent-updated", handleStorageChange);
      };
    }

    // 2. Detect iOS
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    let timer: NodeJS.Timeout;

    // 3. Handle Android/Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (!session) return;
      timer = setTimeout(() => setShowPrompt(true), 15000); // Shorter delay since it's the 2nd visit
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. For iOS, show the prompt if not standalone after some time
    if (ios && session) {
      timer = setTimeout(() => setShowPrompt(true), 15000); // 15 seconds
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [session, triggerCheck]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handlePermanentClose = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed-permanent", "true");
  };

  const handleTemporaryClose = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed-temporary", Date.now().toString());
  };

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
              onClick={handlePermanentClose}
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

                <Button
                  onClick={handleTemporaryClose}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  {t("closeButton")}
                </Button>
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
                  onClick={handleTemporaryClose}
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
