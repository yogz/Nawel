"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Link, useRouter, getPathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "./google-icon";
import { AuraBackground } from "@/components/ui/aura-background";
import { useTranslations } from "next-intl";
import { AuthForm } from "./auth-form";

export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const mode = searchParams.get("mode");
  const isUserMode = mode !== "admin";
  const initialMode = view === "signup" ? "signup" : "signin";

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-4">
      <div className="relative z-10 w-full">
        <AuraBackground />

        <div className="relative z-20 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 shadow-2xl backdrop-blur-2xl transition-all">
          <AuthForm
            isUserMode={isUserMode}
            initialMode={initialMode}
            onSuccess={() => {
              // Refresh first to ensure server-side session is recognized, then navigate
              router.refresh();
              router.push(isUserMode ? "/event" : "/admin");
            }}
          />
        </div>
      </div>

      {isUserMode && (
        <div className="relative z-20 mt-8 text-center">
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
