"use client";

import { useState, useEffect } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { BugReportForm } from "./bug-report-form";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

export function BugReportButton() {
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Feedback");

  // Don't show anything if pending or not logged in
  if (isPending || !session) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          className="fixed bottom-6 right-6 z-[60] hidden sm:block"
        >
          <Button
            onClick={() => setIsOpen(true)}
            variant="premium"
            size="premium"
            icon={<Bug className="h-5 w-5" />}
            aria-label={t("triggerLabel")}
            className="h-14 w-14 rounded-full p-0 shadow-accent-lg hover:scale-110 active:scale-95"
          />
        </motion.div>

        {/* Mobile version - positioned higher if there's a TabBar, but for now fixed bottom-24 or similar */}
        <motion.div
          id="feedback-button"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          className="fixed bottom-24 right-4 z-[60] sm:hidden"
        >
          <Button
            onClick={() => setIsOpen(true)}
            variant="premium"
            size="premium"
            icon={<Bug className="h-5 w-5" />}
            aria-label={t("triggerLabel")}
            className="h-12 w-12 rounded-full p-0 shadow-accent-lg"
          />
        </motion.div>
      </AnimatePresence>

      <BugReportForm isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
