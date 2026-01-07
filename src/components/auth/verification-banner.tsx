"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function VerificationBanner() {
  const { data: session, isPending } = useSession();
  const t = useTranslations("Login.EmailVerificationBanner");
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  if (isPending || !session?.user || session.user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: window.location.href,
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative z-50 w-full overflow-hidden bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Mail size={18} />
            </div>
            <p className="text-sm font-medium text-gray-700">
              <span className="hidden sm:inline">{t("messageFull")}</span>
              <span className="sm:hidden">{t("messageShort")}</span>
            </p>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || sent}
              className="flex items-center gap-2 rounded-full bg-white/50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent transition-all hover:bg-white hover:shadow-sm active:scale-95 disabled:opacity-50"
            >
              {resending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : sent ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {sent ? t("sent") : t("resend")}
            </button>
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </motion.div>
    </AnimatePresence>
  );
}
