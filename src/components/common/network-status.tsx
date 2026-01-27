"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useTranslations } from "next-intl";

/**
 * Network status indicator component
 * Shows when the user is offline or has just come back online
 */
export function NetworkStatus() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showMessage, setShowMessage] = useState(false);
  const t = useTranslations("NetworkStatus");

  useEffect(() => {
    if (!isOnline || wasOffline) {
      setShowMessage(true);
    } else {
      // Hide message after 3 seconds when back online
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showMessage && isOnline) {
    return null;
  }

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-3 rounded-full px-4 py-2.5 shadow-lg backdrop-blur-sm ${
              isOnline
                ? "bg-green-500/90 text-white"
                : "bg-amber-500/90 text-white"
            }`}
          >
            {isOnline ? (
              <>
                <CheckCircle2 size={18} className="shrink-0" />
                <span className="text-sm font-medium">
                  {t("backOnline") || "Vous êtes de nouveau en ligne"}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={18} className="shrink-0" />
                <span className="text-sm font-medium">
                  {t("offline") || "Vous êtes hors ligne"}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
