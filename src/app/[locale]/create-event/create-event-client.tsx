"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { EventForm } from "@/features/events/components/event-form";
import { createEventAction } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { AppBranding } from "@/components/common/app-branding";
import { useSession } from "@/lib/auth-client";

export default function CreateEventClient() {
  const t = useTranslations("CreateEvent");
  const tDashboard = useTranslations("Dashboard");
  const locale = useLocale();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateEvent = async (
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "vacation",
    date?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string,
    duration?: number
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEventAction({
          name,
          description,
          creationMode,
          date,
          time,
          address,
          adults: adults ?? 0,
          children: children ?? 0,
          duration: duration ?? 7,
          mealTitles:
            creationMode === "vacation"
              ? {
                  common: t("commonItems"),
                  lunch: t("lunch"),
                  dinner: t("dinner"),
                }
              : undefined,
          locale,
        });

        sendGAEvent("event", "event_created", {
          creation_mode: creationMode || "total",
        });

        if (result.guestToken) {
          localStorage.setItem(`event_token_${result.slug}`, result.guestToken); // Use slug or id depending on how auth usually works, assuming slug for public access
          // Also store broadly if generic binding is needed, though specific event binding is safer
          // localStorage.setItem("nawel_guest_token", result.guestToken);
        }

        router.push(`/event/${result.slug}?key=${result.adminKey}&new=true`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("errorDefault");
        setError(message);
      }
    });
  };

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-stretch justify-center overflow-x-hidden px-4 py-4 sm:px-6 sm:py-12"
      style={{
        paddingTop: `calc(0.5rem + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div className="mb-2 sm:mb-8">
        <AppBranding logoSize={32} textSize="md" />
      </div>

      <Link
        href={session ? "/event" : "/login?mode=user"}
        className="mb-2 flex min-h-[44px] touch-manipulation items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-accent active:scale-95 sm:mb-8 sm:min-h-0"
      >
        <ArrowLeft size={18} className="sm:h-4 sm:w-4" />
        {session ? tDashboard("title") : t("backToLogin")}
      </Link>

      <div className="mb-4 w-full sm:mb-0">
        <div className="premium-card max-w-full overflow-hidden p-3 sm:p-8">
          <EventForm
            onSubmit={handleCreateEvent}
            onClose={() => router.push(session ? "/event" : "/login?mode=user")}
            isPending={isPending}
            error={error}
            inline
          />
        </div>
      </div>
    </main>
  );
}
