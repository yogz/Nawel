"use client";

import { useState, useEffect } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { BugReportForm } from "./bug-report-form";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPerson } from "@/hooks/use-current-person";

export function BugReportButton() {
  const { data: session } = useSession();
  const currentPerson = useCurrentPerson(
    [], // Does not need list here, just needs to check local storage token
    session?.user?.id
  );

  // Need to be mounted to check local storage
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Feedback");

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          className="fixed bottom-24 right-4 z-[60] sm:bottom-6 sm:right-6"
        >
          <Button
            id="feedback-button"
            onClick={() => setIsOpen(true)}
            variant="premium"
            size="premium"
            icon={<Bug className="h-5 w-5 sm:h-6 sm:w-6" />}
            aria-label={t("triggerLabel")}
            className="h-12 w-12 rounded-full p-0 shadow-accent-lg hover:scale-110 active:scale-95 sm:h-14 sm:w-14"
          />
        </motion.div>
      </AnimatePresence>

      <BugReportForm isOpen={isOpen} onOpenChange={setIsOpen} personId={currentPerson?.id} />
    </>
  );
}
