"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Link, useRouter, getPathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AuthForm } from "./auth-form";

export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const mode = searchParams.get("mode");
  const isUserMode = mode === "user";
  const initialMode = view === "signup" ? "signup" : "signin";

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
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute inset-0 transform-gpu rounded-full bg-purple-500/40 blur-[100px]"
          />
        </div>

        <div className="relative z-20 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl transition-all">
          <AuthForm
            isUserMode={isUserMode}
            initialMode={initialMode}
            onSuccess={() => {
              router.push(isUserMode ? "/" : "/admin");
              router.refresh();
            }}
          />
        </div>
      </div>

      {isUserMode && (
        <div className="relative z-20 mt-12 text-center">
          <Link
            href="/create-event"
            className="rounded-full bg-white/40 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 backdrop-blur-sm transition-all hover:bg-white/60 hover:text-gray-700"
          >
            {t("guestLink")}
          </Link>
        </div>
      )}
    </div>
  );
}
