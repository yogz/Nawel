"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { EventForm } from "@/features/events/components/event-form";
import { createEventAction } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { AppBranding } from "@/components/common/app-branding";
import { useSession } from "@/lib/auth-client";

export default function CreateEventClient() {
  const t = useTranslations("CreateEvent");
  const tDashboard = useTranslations("Dashboard");
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateEvent = async (
    name: string,
    description?: string,
    creationMode?: "total" | "classique" | "apero" | "service-unique",
    date?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
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
        });

        sendGAEvent("event", "event_created", {
          creation_mode: creationMode || "service-unique",
        });

        router.push(`/event/${result.slug}?key=${result.adminKey}&new=true`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Une erreur est survenue";
        setError(message);
      }
    });
  };

  return (
    <main
      className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-12"
      style={{
        paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div className="mb-6 sm:mb-8">
        <AppBranding logoSize={40} textSize="md" />
      </div>

      <Link
        href={session ? "/" : "/login?mode=user"}
        className="mb-6 flex min-h-[44px] touch-manipulation items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-accent active:scale-95 sm:mb-8 sm:min-h-0"
      >
        <ArrowLeft size={20} className="sm:h-4 sm:w-4" />
        {session ? tDashboard("title") : t("backToLogin")}
      </Link>

      <div className="mb-8 space-y-3 sm:mb-10 sm:space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/50 sm:mb-0 sm:rounded-3xl sm:p-8">
        <EventForm
          onSubmit={handleCreateEvent}
          onClose={() => router.push(session ? "/" : "/login?mode=user")}
          isPending={isPending}
          error={error}
          inline
          showWarnings
          isAuthenticated={!!session}
        />
      </div>
    </main>
  );
}
