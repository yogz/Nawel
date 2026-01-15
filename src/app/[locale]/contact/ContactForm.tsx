"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail, Send, Loader2, ArrowLeft } from "lucide-react";
import { submitContactAction } from "@/app/actions/feedback-actions";
import { toast } from "sonner";
import { useRef } from "react";

export default function ContactForm() {
  const t = useTranslations("Contact");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !content.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitContactAction({
        email: email.trim(),
        content: content.trim(),
        url: typeof window !== "undefined" ? window.location.href : "/contact",
      });

      if (result.success) {
        toast.success(t("successDescription"));
        setEmail("");
        setContent("");
        router.push("/");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorDescription"));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    handleSubmit(new Event("submit") as any);
  };

  const handleKeyDownEmail = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      contentRef.current?.focus();
    }
  };

  const handleKeyDownContent = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (email.trim() && content.trim()) {
        handleSubmit(new Event("submit") as any);
      }
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-4">
      <div className="relative z-10 w-full">
        {/* Animated Aura Background */}
        <div className="pointer-events-none absolute -inset-20 -z-10 overflow-visible">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-tr from-purple-600 via-accent to-red-500 opacity-60 blur-[60px]"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-bl from-accent via-purple-500 to-blue-400 opacity-50 blur-[80px]"
          />
        </div>

        <div className="relative z-20 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl transition-all">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Mail size={32} />
            </div>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-sm font-medium text-gray-500">{t("description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("emailLabel")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDownEmail}
                placeholder={t("emailPlaceholder")}
                required
                disabled={isSubmitting}
                enterKeyHint="next"
                className="h-12 border-gray-100 bg-gray-50/50 px-4 transition-all focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="content"
                className="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                {t("messageLabel")}
              </Label>
              <Textarea
                id="content"
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDownContent}
                placeholder={t("messagePlaceholder")}
                required
                disabled={isSubmitting}
                enterKeyHint="send"
                className="min-h-[120px] border-gray-100 bg-gray-50/50 px-4 py-3 transition-all focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-gray-900 font-bold text-white shadow-xl shadow-gray-900/10 transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
              disabled={isSubmitting || !content.trim() || !email.trim()}
              icon={
                isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />
              }
            >
              {isSubmitting ? commonT("loading") : t("submit")}
            </Button>
          </form>
        </div>
      </div>

      <div className="relative z-20 mt-12 text-center">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-white/40 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 backdrop-blur-sm transition-all hover:bg-white/60 hover:text-gray-700"
        >
          <ArrowLeft size={12} />
          {commonT("back")}
        </Link>
      </div>
    </div>
  );
}
