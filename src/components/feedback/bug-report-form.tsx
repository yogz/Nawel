"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Bug, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { submitFeedbackAction } from "@/app/actions/feedback-actions";
import { useToast } from "@/hooks/use-toast";

interface BugReportFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportForm({ isOpen, onOpenChange }: BugReportFormProps) {
  const t = useTranslations("Feedback");
  const commonT = useTranslations("common");
  const { showToast } = useToast();
  const pathname = usePathname();

  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await submitFeedbackAction({
        content: content.trim(),
        url: typeof window !== "undefined" ? window.location.href : pathname,
      });

      if (result.success) {
        showToast({
          text: t("successDescription"),
          type: "success",
        });
        setContent("");
        onOpenChange(false);
      }
    } catch (error) {
      showToast({
        text: error instanceof Error ? error.message : t("errorDescription"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-accent" />
            {t("title")}
          </DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("placeholder")}
            className="min-h-[150px] rounded-2xl border-white/40 bg-white/50 ring-accent/20 focus-visible:ring-accent/50"
            required
          />

          <DrawerFooter className="px-0 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              variant="premium"
              icon={isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              className="h-12 w-full"
            >
              {isSubmitting ? commonT("loading") : t("submit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-2xl"
            >
              {commonT("cancel")}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
