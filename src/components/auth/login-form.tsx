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

        <div className="relative z-20 w-full overflow-hidden rounded-[32px] bg-white/90 p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-3xl transition-all">
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
            className="inline-flex h-12 items-center justify-center rounded-full bg-white/60 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-600 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-gray-900 hover:shadow-md"
          >
            {t("guestLink")}
          </Link>
        </div>
      )}
    </div>
  );
}
