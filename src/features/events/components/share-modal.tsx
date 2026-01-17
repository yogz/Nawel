"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { trackShareAction } from "@/lib/analytics";

export function ShareModal({
  slug,
  adminKey,
  onClose,
  isNew,
  eventName,
}: {
  slug: string;
  adminKey?: string;
  onClose: () => void;
  isNew?: boolean;
  eventName?: string;
}) {
  const t = useTranslations("EventDashboard.Sheets.Share");
  const tShared = useTranslations("EventDashboard.Shared");
  const [copiedLink, setCopiedLink] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/event/${slug}${adminKey ? `?key=${adminKey}` : ""}`;

  // Track when share modal is opened
  useEffect(() => {
    trackShareAction("share_opened");
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    trackShareAction("share_link_copied", "clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = t("shareMessage", { name: eventName || tShared("thisEvent"), url: shareUrl });
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    trackShareAction("share_link_copied", "whatsapp");
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName || `${tShared("defaultEventName")} CoList`,
          text: t("shareMessage", { name: eventName || tShared("thisEvent"), url: "" }),
          url: shareUrl,
        });
        trackShareAction("share_link_copied", "native");
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="space-y-4 pb-2 pt-1 transition-all">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-accent to-accent/80 text-3xl text-white shadow-xl shadow-accent/20"
        >
          {isNew ? "✨" : <Share2 size={24} />}
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-black leading-none tracking-tight text-white">
            {isNew ? t("eventCreated") : t("title")}
          </h3>
          <p className="mx-auto mt-3 max-w-[280px] text-sm font-medium leading-relaxed text-gray-200">
            {t("description")}
          </p>
        </motion.div>
      </div>

      <div className="space-y-3">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            className="h-14 w-full rounded-2xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/20 transition-all hover:bg-[#22c35e] active:scale-95"
            onClick={handleWhatsAppShare}
          >
            <MessageCircle className="mr-3" size={24} fill="white" />
            <span className="text-lg font-black">{t("shareWhatsApp")}</span>
          </Button>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            className="h-14 w-full rounded-2xl border-gray-100 bg-white text-gray-900 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
            onClick={handleNativeShare}
          >
            <Share2 className="mr-3" size={24} />
            <span className="text-lg font-black">{t("shareButton")}</span>
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pt-2"
      >
        <Button
          variant="outline"
          className="h-14 w-full rounded-[20px] border-none bg-gray-100 font-bold text-gray-500 transition-all hover:bg-gray-200"
          onClick={onClose}
        >
          {t("closeButton")}
        </Button>
      </motion.div>
    </div>
  );
}
