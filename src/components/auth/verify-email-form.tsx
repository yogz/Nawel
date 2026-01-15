"use client";

import { useEffect, useState, useRef } from "react";
import { verifyEmail } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function VerifyEmailForm() {
  const t = useTranslations("VerifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    if (verificationStarted.current) {
      return;
    }
    verificationStarted.current = true;

    const performVerification = async () => {
      try {
        const { error } = await verifyEmail({
          query: { token },
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("error");
          toast.error(t("error"));
        } else {
          setStatus("success");
          toast.success(t("success"));
          // Auto-login happens on the server (auth-config.ts)
          // We just need to redirect after a short delay
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 3000);
        }
      } catch (err) {
        console.error("Verification failed:", err);
        setStatus("error");
        toast.error(t("error"));
      }
    };

    performVerification();
  }, [token, router, t]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <h1 className="text-xl font-bold">{t("loading")}</h1>
      </div>
    );
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 p-8 text-center"
      >
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">{t("title")}</h1>
        <p className="text-sm font-medium text-green-600">{t("success")}</p>
        <p className="text-xs text-gray-400">Redirection en cours...</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </div>
      <h1 className="text-xl font-bold">{t("error")}</h1>
      <button
        onClick={() => router.push("/login")}
        className="text-sm font-bold text-accent hover:underline"
      >
        Retour à la connexion
      </button>
    </div>
  );
}
